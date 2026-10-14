<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\LeadServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Http\Requests\Api\V1\Lead\AssignLeadRequest;
use App\Http\Requests\Api\V1\Lead\BulkAssignLeadRequest;
use App\Http\Requests\Api\V1\Lead\BulkStatusLeadRequest;
use App\Http\Requests\Api\V1\Lead\MergeLeadRequest;
use App\Http\Requests\Api\V1\Lead\StoreLeadRequest;
use App\Http\Requests\Api\V1\Lead\UpdateLeadRequest;
use App\Http\Requests\Api\V1\Lead\UpdateLeadStatusRequest;
use App\Models\LeadSource;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[
    OA\Tag(name: "Leads", description: "CRM Leads pipeline, deals, activities and stage management")
]
class LeadController extends BaseApiController
{
    public function __construct(
        protected LeadServiceInterface $leadService
    ) {}

    #[OA\Get(
        path: "/api/v1/leads",
        summary: "List all leads with pagination and filters",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Leads paginated list retrieved")
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'search', 'status', 'priority', 'source', 'source_id',
            'assigned_to', 'city', 'date_from', 'date_to', 'sort_by', 'sort_order',
            'segment', 'is_unassigned', 'followup_status', 'score_min', 'score_max', 'value_min', 'value_max'
        ]);
        $perPage = (int) $request->input('per_page', 15);

        $leads = $this->leadService->getPaginatedLeads($filters, $perPage, $request->user());

        return $this->paginatedResponse($leads, 'Leads retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/leads/analytics",
        summary: "Get anti-loss, velocity, and pipeline conversion analytics",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Lead analytics retrieved")
        ]
    )]
    public function analytics(Request $request): JsonResponse
    {
        $analytics = $this->leadService->getAnalytics($request->user());

        return $this->successResponse($analytics, 'Lead analytics retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/leads/kanban",
        summary: "Get leads grouped by all 8 pipeline stages for Kanban board",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Kanban board stages retrieved")
        ]
    )]
    public function kanban(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'assigned_to', 'priority', 'segment']);
        $stages = $this->leadService->getKanbanLeads($filters, $request->user());

        return $this->successResponse($stages, 'Kanban board leads retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/leads/metadata",
        summary: "Get metadata for lead creation (sources, products, agents)",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Metadata retrieved")
        ]
    )]
    public function metadata(): JsonResponse
    {
        $sources = LeadSource::where('is_active', true)->get(['id', 'name']);
        $products = Product::where('is_active', true)->get(['id', 'name', 'type', 'price_range']);
        $agents = User::role(['sales_agent', 'sales_manager', 'super_admin'])->where('is_active', true)->get(['id', 'name', 'email']);

        return $this->successResponse([
            'sources'  => $sources,
            'products' => $products,
            'agents'   => $agents,
        ], 'Lead metadata fetched successfully.');
    }

    #[OA\Post(
        path: "/api/v1/leads",
        summary: "Create a new lead",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 201, description: "Lead created successfully"),
            new OA\Response(response: 422, description: "Validation error")
        ]
    )]
    public function store(StoreLeadRequest $request): JsonResponse
    {
        $lead = $this->leadService->createLead($request->validated(), $request->user());

        return $this->createdResponse($lead, 'Lead created successfully.');
    }

    #[OA\Get(
        path: "/api/v1/leads/{id}",
        summary: "Get lead profile details by ID",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Lead details"),
            new OA\Response(response: 404, description: "Lead not found")
        ]
    )]
    public function show(Request $request, int $id): JsonResponse
    {
        $lead = $this->leadService->findLeadById($id, $request->user());

        if (! $lead) {
            return $this->notFoundResponse("Lead with ID {$id} not found or you do not have permission to view it.");
        }

        return $this->successResponse($lead, 'Lead details retrieved successfully.');
    }

    #[OA\Put(
        path: "/api/v1/leads/{id}",
        summary: "Update lead details",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Lead updated"),
            new OA\Response(response: 404, description: "Lead not found")
        ]
    )]
    public function update(UpdateLeadRequest $request, int $id): JsonResponse
    {
        $lead = $this->leadService->findLeadById($id, $request->user());

        if (! $lead) {
            return $this->notFoundResponse("Lead with ID {$id} not found.");
        }

        $updatedLead = $this->leadService->updateLead($lead, $request->validated(), $request->user());

        return $this->successResponse($updatedLead, 'Lead updated successfully.');
    }

    #[OA\Patch(
        path: "/api/v1/leads/{id}/status",
        summary: "Update lead pipeline status with mandatory lost reason handling",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Lead status updated"),
            new OA\Response(response: 404, description: "Lead not found")
        ]
    )]
    public function updateStatus(UpdateLeadStatusRequest $request, int $id): JsonResponse
    {
        $lead = $this->leadService->findLeadById($id, $request->user());

        if (! $lead) {
            return $this->notFoundResponse("Lead with ID {$id} not found.");
        }

        $data = $request->validated();
        $updatedLead = $this->leadService->updateStatus(
            $lead,
            $data['status'],
            $data['lost_reason'] ?? null,
            $data['lost_notes'] ?? null,
            $request->user()
        );

        return $this->successResponse($updatedLead, 'Lead status updated successfully.');
    }

    #[OA\Post(
        path: "/api/v1/leads/{id}/assign",
        summary: "Assign or reassign lead to a sales agent",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Lead assigned successfully"),
            new OA\Response(response: 404, description: "Lead not found")
        ]
    )]
    public function assign(AssignLeadRequest $request, int $id): JsonResponse
    {
        $lead = $this->leadService->findLeadById($id, $request->user());

        if (! $lead) {
            return $this->notFoundResponse("Lead with ID {$id} not found.");
        }

        $assignedLead = $this->leadService->assignLead($lead, $request->validated('agent_id'), $request->user());

        return $this->successResponse($assignedLead, 'Lead assigned successfully.');
    }

    #[OA\Post(
        path: "/api/v1/leads/bulk-assign",
        summary: "Bulk assign multiple leads to an agent",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Bulk assign complete")
        ]
    )]
    public function bulkAssign(BulkAssignLeadRequest $request): JsonResponse
    {
        $count = $this->leadService->bulkAssign(
            $request->validated('lead_ids'),
            $request->validated('agent_id'),
            $request->user()
        );

        return $this->successResponse(['count' => $count], "Successfully reassigned {$count} leads.");
    }

    #[OA\Post(
        path: "/api/v1/leads/bulk-status",
        summary: "Bulk update status for selected leads",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Bulk status update complete")
        ]
    )]
    public function bulkStatus(BulkStatusLeadRequest $request): JsonResponse
    {
        $count = $this->leadService->bulkUpdateStatus(
            $request->validated('lead_ids'),
            $request->validated('status'),
            $request->user()
        );

        return $this->successResponse(['count' => $count], "Successfully updated status for {$count} leads.");
    }

    #[OA\Post(
        path: "/api/v1/leads/{id}/merge",
        summary: "Merge a duplicate lead into this master lead",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Leads merged successfully")
        ]
    )]
    public function merge(MergeLeadRequest $request, int $id): JsonResponse
    {
        $master = $this->leadService->findLeadById($id, $request->user());
        $duplicate = $this->leadService->findLeadById($request->validated('duplicate_lead_id'), $request->user());

        if (! $master || ! $duplicate) {
            return $this->notFoundResponse("Master or duplicate lead not found.");
        }

        $merged = $this->leadService->mergeLeads($master, $duplicate, $request->user());

        return $this->successResponse($merged, 'Leads merged successfully into master record.');
    }

    #[OA\Get(
        path: "/api/v1/leads/{id}/duplicates",
        summary: "Find suspected duplicate leads by phone, email, or company name",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Candidate duplicates retrieved")
        ]
    )]
    public function duplicates(Request $request, int $id): JsonResponse
    {
        $lead = $this->leadService->findLeadById($id, $request->user());

        if (! $lead) {
            return $this->notFoundResponse("Lead with ID {$id} not found.");
        }

        $duplicates = $this->leadService->findDuplicates($lead);

        return $this->successResponse($duplicates, 'Candidate duplicate leads retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/leads/{id}/recalculate-score",
        summary: "Recalculate lead intelligence score (0–100) with detailed factors breakdown",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Lead score recalculated")
        ]
    )]
    public function recalculateScore(Request $request, int $id): JsonResponse
    {
        $lead = $this->leadService->findLeadById($id, $request->user());

        if (! $lead) {
            return $this->notFoundResponse("Lead with ID {$id} not found.");
        }

        $breakdown = $this->leadService->getScoreBreakdown($lead);
        $this->leadService->recalculateScore($lead);

        return $this->successResponse($breakdown, 'Lead intelligence score recalculated successfully.');
    }

    #[OA\Get(
        path: "/api/v1/leads/{id}/timeline",
        summary: "Get activity timeline for a lead",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Lead timeline feed")
        ]
    )]
    public function timeline(Request $request, int $id): JsonResponse
    {
        $lead = $this->leadService->findLeadById($id, $request->user());

        if (! $lead) {
            return $this->notFoundResponse("Lead with ID {$id} not found.");
        }

        $timeline = $this->leadService->getTimeline($lead);

        return $this->successResponse($timeline, 'Lead timeline retrieved successfully.');
    }

    #[OA\Delete(
        path: "/api/v1/leads/{id}",
        summary: "Soft delete lead by ID",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Lead deleted"),
            new OA\Response(response: 404, description: "Lead not found")
        ]
    )]
    public function destroy(Request $request, int $id): JsonResponse
    {
        $lead = $this->leadService->findLeadById($id, $request->user());

        if (! $lead) {
            return $this->notFoundResponse("Lead with ID {$id} not found.");
        }

        $this->leadService->deleteLead($lead, $request->user());

        return $this->successResponse(null, 'Lead deleted successfully.');
    }

    #[OA\Post(
        path: "/api/v1/leads/{id}/auto-assign",
        summary: "Auto-assign lead to best matched agent using intelligent strategy",
        security: [["bearerAuth" => []]],
        tags: ["Leads"],
        responses: [
            new OA\Response(response: 200, description: "Lead auto-assigned"),
            new OA\Response(response: 422, description: "No agents available")
        ]
    )]
    public function autoAssign(Request $request, int $id): JsonResponse
    {
        $lead = $this->leadService->findLeadById($id, $request->user());

        if (! $lead) {
            return $this->notFoundResponse("Lead with ID {$id} not found.");
        }

        $strategy = $request->input('strategy', 'load_balanced');
        $agent = app(\App\Contracts\Services\AutoAssignmentServiceInterface::class)->assign($lead, $strategy);

        if (! $agent) {
            return $this->errorResponse('No active agents available for assignment.', 422);
        }

        return $this->successResponse([
            'lead'           => $lead->fresh(['assignedUser']),
            'assigned_agent' => $agent,
            'strategy'       => $strategy,
        ], "Lead successfully auto-assigned to {$agent->name} via {$strategy}.");
    }
}

