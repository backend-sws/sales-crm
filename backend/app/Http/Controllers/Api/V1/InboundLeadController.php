<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\LeadServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Inbound Leads", description: "Public webhook endpoint for capturing inbound leads from website forms, ads, and email")]
class InboundLeadController extends BaseApiController
{
    public function __construct(
        protected LeadServiceInterface $leadService
    ) {}

    #[OA\Post(
        path: "/api/v1/leads/inbound",
        summary: "Inbound lead capture webhook (Website forms, Meta Ads, Email parser)",
        tags: ["Inbound Leads"],
        responses: [
            new OA\Response(response: 201, description: "Lead captured and auto-assigned"),
            new OA\Response(response: 422, description: "Validation error")
        ]
    )]
    public function handleInbound(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:255',
            'phone'               => 'required|string|max:50',
            'email'               => 'nullable|email|max:255',
            'company'             => 'nullable|string|max:255',
            'city'                => 'nullable|string|max:100',
            'source'              => 'nullable|string|max:100',
            'priority'            => 'nullable|string|in:hot,warm,cold',
            'budget'              => 'nullable|numeric|min:0',
            'value'               => 'nullable|numeric|min:0',
            'notes'               => 'nullable|string',
            'product_ids'         => 'nullable|array',
            'product_ids.*'       => 'integer|exists:products,id',
            'assignment_strategy' => 'nullable|string|in:load_balanced,round_robin,product_wise',
            'duplicate_rule'      => 'nullable|string|in:skip,create_anyway,update',
        ]);

        // Default values for inbound webhooks
        $validated['source'] = $validated['source'] ?? 'website_webhook';
        $validated['priority'] = $validated['priority'] ?? 'warm';
        $validated['auto_assign'] = true;

        // Check for duplicates by phone or email
        $duplicate = Lead::where(function ($q) use ($validated) {
            $q->where('phone', $validated['phone']);
            if (! empty($validated['email'])) {
                $q->orWhere('email', $validated['email']);
            }
        })->first();

        $rule = $validated['duplicate_rule'] ?? 'create_anyway';

        if ($duplicate && $rule === 'skip') {
            return $this->successResponse([
                'lead'          => $duplicate,
                'is_duplicate'  => true,
                'action_taken'  => 'skipped',
            ], 'Lead already exists. Skipped duplicate creation.');
        }

        if ($duplicate && $rule === 'update') {
            $updated = $this->leadService->updateLead($duplicate, array_filter([
                'company' => $validated['company'] ?? null,
                'city'    => $validated['city'] ?? null,
                'budget'  => $validated['budget'] ?? null,
                'notes'   => ! empty($validated['notes']) ? ($duplicate->notes . "\n[Inbound Update] " . $validated['notes']) : null,
            ]));

            return $this->successResponse([
                'lead'         => $updated,
                'is_duplicate' => true,
                'action_taken' => 'updated_existing',
            ], 'Existing lead updated with new inbound submission.');
        }

        // Create new lead with auto-assignment
        $lead = $this->leadService->createLead($validated);

        return $this->createdResponse([
            'lead'         => $lead,
            'is_duplicate' => (bool) $duplicate,
            'assigned_to'  => $lead->assignedUser ? [
                'id'    => $lead->assignedUser->id,
                'name'  => $lead->assignedUser->name,
                'email' => $lead->assignedUser->email,
            ] : null,
        ], 'Inbound lead captured and routed successfully.');
    }
}
