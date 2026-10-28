<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\ClientConversionServiceInterface;
use App\Contracts\Services\ClientHealthScoreServiceInterface;
use App\Contracts\Services\ClientServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Models\Client;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Clients", description: "Won Lead to Client auto-conversion, client lifecycle and onboarding")]
class ClientController extends BaseApiController
{
    public function __construct(
        protected ClientConversionServiceInterface $conversionService,
        protected ClientServiceInterface $clientService,
        protected ClientHealthScoreServiceInterface $healthScoreService
    ) {}

    #[OA\Get(
        path: "/api/v1/clients",
        summary: "List all active clients with health scores and service summary",
        security: [["bearerAuth" => []]],
        tags: ["Clients"]
    )]
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search', 'status', 'health_status']);
        $perPage = (int) $request->get('per_page', 15);

        $clients = $this->clientService->getPaginatedClients($filters, $perPage);

        return $this->paginatedResponse($clients, 'Clients retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/clients",
        summary: "Directly onboard and create a new client account",
        security: [["bearerAuth" => []]],
        tags: ["Clients"]
    )]
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'               => 'required|string|max:255',
            'company'            => 'nullable|string|max:255',
            'email'              => 'required|email|max:255|unique:clients,email',
            'phone'              => 'nullable|string|max:50',
            'gst_number'         => 'nullable|string|max:50',
            'billing_address'    => 'nullable|string',
            'billing_state'      => 'nullable|string|max:100',
            'account_manager_id' => 'nullable|exists:users,id',
            'service_name'       => 'nullable|string|max:255',
            'service_type'       => 'nullable|string|in:recurring,fixed_scope,maintenance',
            'billing_cycle'      => 'nullable|string|in:monthly,quarterly,yearly,milestone',
            'service_value'      => 'nullable|numeric|min:0',
            'service_notes'      => 'nullable|string',
            'create_user'        => 'nullable|boolean',
            'password'           => 'nullable|string|min:6',
            'primary_color'      => 'nullable|string|max:7',
        ]);

        $client = $this->clientService->createClient($validated);

        return $this->createdResponse($client, "Client account '{$client->company}' created successfully.");
    }

    #[OA\Get(
        path: "/api/v1/clients/{id}",
        summary: "Get client profile, subscribed services, invoices, and sales history",
        security: [["bearerAuth" => []]],
        tags: ["Clients"]
    )]
    public function show(int $id): JsonResponse
    {
        $client = $this->clientService->getClientProfile($id);

        return $this->successResponse($client, 'Client profile retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/client/portal-profile",
        summary: "Get current authenticated client's self-service portal workspace",
        security: [["bearerAuth" => []]],
        tags: ["Clients"]
    )]
    public function portalProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $clientId = $user->client_id;

        if (! $clientId) {
            // Auto-heal: Match by email or fallback to first client organization
            $client = Client::where('email', $user->email)->first()
                ?? Client::whereHas('users', fn($q) => $q->where('users.id', $user->id))->first()
                ?? Client::first();

            if ($client) {
                $user->update(['client_id' => $client->id]);
                $clientId = $client->id;
            }
        }

        if (! $clientId) {
            return $this->notFoundResponse('No linked client organization found for this user account.');
        }

        $client = $this->clientService->getClientProfile($clientId);

        return $this->successResponse($client, 'Client self-service workspace loaded.');
    }

    #[OA\Post(
        path: "/api/v1/leads/{id}/convert",
        summary: "Convert Won Lead into a client account with service tracks and portal access",
        security: [["bearerAuth" => []]],
        tags: ["Clients"]
    )]
    public function convert(Request $request, int $id): JsonResponse
    {
        $lead = Lead::findOrFail($id);

        $validated = $request->validate([
            'name'               => 'nullable|string|max:255',
            'company'            => 'nullable|string|max:255',
            'email'              => 'nullable|email|max:255',
            'phone'              => 'nullable|string|max:50',
            'gst_number'         => 'nullable|string|max:50',
            'billing_address'    => 'nullable|string',
            'billing_state'      => 'nullable|string|max:100',
            'account_manager_id' => 'nullable|exists:users,id',
            'services'           => 'nullable|array',
            'create_user'        => 'nullable|boolean',
            'password'           => 'nullable|string|min:6',
            'primary_color'      => 'nullable|string|max:7',
        ]);

        $client = $this->conversionService->convertLead($lead, $validated);

        return $this->createdResponse($client, "Lead successfully converted into Client '{$client->company}'.");
    }

    #[OA\Patch(
        path: "/api/v1/clients/{id}",
        summary: "Update client details",
        security: [["bearerAuth" => []]],
        tags: ["Clients"]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name'               => 'nullable|string|max:255',
            'company'            => 'nullable|string|max:255',
            'phone'              => 'nullable|string|max:50',
            'gst_number'         => 'nullable|string|max:50',
            'billing_address'    => 'nullable|string',
            'billing_state'      => 'nullable|string|max:100',
            'status'             => 'nullable|in:active,inactive,suspended',
            'account_manager_id' => 'nullable|exists:users,id',
        ]);

        $client = $this->clientService->updateClient($id, $validated);

        return $this->successResponse($client, 'Client updated successfully.');
    }

    #[OA\Post(
        path: "/api/v1/clients/{id}/branding",
        summary: "Update client white-label branding and custom domain",
        security: [["bearerAuth" => []]],
        tags: ["Clients"]
    )]
    public function updateBranding(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'logo_url'             => 'nullable|url|max:500',
            'primary_color'        => 'nullable|string|max:7',
            'subdomain'            => 'nullable|string|max:100',
            'custom_domain'        => 'nullable|string|max:255',
            'hide_vendor_branding' => 'nullable|boolean',
            'enabled_features'     => 'nullable|array',
        ]);

        $branding = $this->clientService->updateBranding($id, $validated);

        return $this->successResponse($branding, 'Client branding updated successfully.');
    }

    #[OA\Get(
        path: "/api/v1/clients/{id}/onboarding",
        summary: "Get client onboarding checklist status",
        security: [["bearerAuth" => []]],
        tags: ["Clients"]
    )]
    public function onboarding(int $id): JsonResponse
    {
        $progress = $this->clientService->getOnboardingProgress($id);

        return $this->successResponse($progress, 'Onboarding progress retrieved.');
    }

    #[OA\Patch(
        path: "/api/v1/clients/{id}/onboarding/{step}",
        summary: "Mark client onboarding step as completed or incomplete",
        security: [["bearerAuth" => []]],
        tags: ["Clients"]
    )]
    public function updateOnboardingStep(Request $request, int $id, string $step): JsonResponse
    {
        $validated = $request->validate([
            'completed' => 'required|boolean',
        ]);

        $progress = $this->clientService->updateOnboardingStep($id, $step, $validated['completed']);

        return $this->successResponse($progress, 'Onboarding checklist step updated.');
    }

    #[OA\Get(
        path: "/api/v1/clients/{id}/health",
        summary: "Get breakdown of client composite health score",
        security: [["bearerAuth" => []]],
        tags: ["Clients"]
    )]
    public function health(int $id): JsonResponse
    {
        $client = $this->clientService->getClientProfile($id);
        $score = $this->healthScoreService->calculateClientHealth($client);

        return $this->successResponse($score, 'Client health score calculated.');
    }
}
