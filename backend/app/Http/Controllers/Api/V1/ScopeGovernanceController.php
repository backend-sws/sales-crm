<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\ScopeGovernanceServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Models\ChangeRequest;
use App\Models\Project;
use App\Models\ProjectMeeting;
use App\Models\ScopeVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Scope Governance", description: "SOW Baseline Lock, Digital Approvals, Change Requests & MoM")]
class ScopeGovernanceController extends BaseApiController
{
    public function __construct(
        protected ScopeGovernanceServiceInterface $governanceService
    ) {}

    #[OA\Get(
        path: "/api/v1/projects/{projectId}/scope-versions",
        summary: "List all versioned SOW scopes for a project",
        security: [["bearerAuth" => []]],
        tags: ["Scope Governance"]
    )]
    public function scopeVersions(int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $versions = $this->governanceService->listScopeVersions($project);

        return $this->successResponse($versions, 'Scope versions retrieved.');
    }

    #[OA\Post(
        path: "/api/v1/projects/{projectId}/scope-versions",
        summary: "Draft a new SOW scope version",
        security: [["bearerAuth" => []]],
        tags: ["Scope Governance"]
    )]
    public function storeScopeVersion(Request $request, int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'document_body'        => 'required|string',
            'pdf_snapshot_url'     => 'nullable|string|max:500',
            'diff_from_version_id' => 'nullable|exists:scope_versions,id',
            'status'               => 'nullable|in:draft,pending_approval',
        ]);

        $scope = $this->governanceService->createScopeVersion($project, $validated, $request->user());

        return $this->createdResponse($scope, "Scope version {$scope->version_number} drafted.");
    }

    #[OA\Post(
        path: "/api/v1/scope-versions/{id}/approve",
        summary: "Client digitally approves SOW version and locks baseline v1",
        security: [["bearerAuth" => []]],
        tags: ["Scope Governance"]
    )]
    public function approveScope(Request $request, int $id): JsonResponse
    {
        $scope = ScopeVersion::with('project')->findOrFail($id);

        $validated = $request->validate([
            'signer_name'    => 'required|string|max:255',
            'signature_data' => 'required|string',
            'signature_type' => 'nullable|in:drawn,typed',
        ]);

        $approval = $this->governanceService->approveScope(
            $scope,
            $validated,
            $request->ip() ?? '127.0.0.1',
            $request->userAgent() ?? 'SalesCRM-Web',
            $request->user()
        );

        return $this->createdResponse($approval, 'Scope successfully approved and locked as baseline!');
    }

    #[OA\Get(
        path: "/api/v1/scope-versions/{v1}/diff/{v2}",
        summary: "Side-by-side git-style diff comparison between two scope versions",
        security: [["bearerAuth" => []]],
        tags: ["Scope Governance"]
    )]
    public function diff(int $v1, int $v2): JsonResponse
    {
        $diff = $this->governanceService->diffVersions($v1, $v2);

        return $this->successResponse($diff, 'Version diff calculated.');
    }

    #[OA\Get(
        path: "/api/v1/projects/{projectId}/change-requests",
        summary: "List all formal Change Requests for a project",
        security: [["bearerAuth" => []]],
        tags: ["Scope Governance"]
    )]
    public function changeRequests(int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $crs = $this->governanceService->listChangeRequests($project);

        return $this->successResponse($crs, 'Change requests retrieved.');
    }

    #[OA\Post(
        path: "/api/v1/projects/{projectId}/change-requests",
        summary: "Raise a new Change Request with cost and timeline impact",
        security: [["bearerAuth" => []]],
        tags: ["Scope Governance"]
    )]
    public function storeChangeRequest(Request $request, int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'title'               => 'required|string|max:255',
            'description'         => 'required|string',
            'estimated_hours'     => 'nullable|numeric|min:0',
            'additional_cost'     => 'nullable|numeric|min:0',
            'timeline_delay_days' => 'nullable|integer|min:0',
        ]);

        $cr = $this->governanceService->createChangeRequest($project, $validated, $request->user());

        return $this->createdResponse($cr, 'Change Request submitted.');
    }

    #[OA\Patch(
        path: "/api/v1/change-requests/{id}/decision",
        summary: "Client approves or rejects Change Request",
        security: [["bearerAuth" => []]],
        tags: ["Scope Governance"]
    )]
    public function decideChangeRequest(Request $request, int $id): JsonResponse
    {
        $cr = ChangeRequest::with('project')->findOrFail($id);

        $validated = $request->validate([
            'decision' => 'required|in:approved,rejected',
            'notes'    => 'nullable|string',
        ]);

        $decided = $this->governanceService->decideChangeRequest($cr, $validated['decision'], $validated['notes'] ?? null, $request->user());

        return $this->successResponse($decided, "Change Request {$validated['decision']}.");
    }

    #[OA\Get(
        path: "/api/v1/projects/{projectId}/meetings",
        summary: "List all meetings and Minutes of Meetings (MoM)",
        security: [["bearerAuth" => []]],
        tags: ["Scope Governance"]
    )]
    public function meetings(int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $meetings = $this->governanceService->listMeetings($project);

        return $this->successResponse($meetings, 'Meetings loaded.');
    }

    #[OA\Post(
        path: "/api/v1/projects/{projectId}/meetings",
        summary: "Log a meeting with MoM and action items",
        security: [["bearerAuth" => []]],
        tags: ["Scope Governance"]
    )]
    public function storeMeeting(Request $request, int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'title'                      => 'required|string|max:255',
            'agenda'                     => 'nullable|string',
            'mom_body'                   => 'nullable|string',
            'recording_url'              => 'nullable|string|max:500',
            'scheduled_at'               => 'nullable|date',
            'status'                     => 'nullable|in:scheduled,completed,cancelled',
            'action_items'               => 'nullable|array',
            'action_items.*.title'       => 'required|string|max:255',
            'action_items.*.assignee_id' => 'nullable|exists:users,id',
            'action_items.*.due_date'    => 'nullable|date',
        ]);

        $meeting = $this->governanceService->createMeeting($project, $validated, $request->user());

        return $this->createdResponse($meeting, 'Meeting & MoM recorded.');
    }

    #[OA\Post(
        path: "/api/v1/meetings/{id}/confirm",
        summary: "Client manually confirms MoM before 48-hour auto-acceptance",
        security: [["bearerAuth" => []]],
        tags: ["Scope Governance"]
    )]
    public function confirmMoM(Request $request, int $id): JsonResponse
    {
        $meeting = ProjectMeeting::findOrFail($id);
        $confirmed = $this->governanceService->confirmMoM($meeting, $request->user());

        return $this->successResponse($confirmed, 'Meeting MoM confirmed by client.');
    }

    #[OA\Post(
        path: "/api/v1/meeting-action-items/{id}/convert",
        summary: "Convert a meeting action item into a project Task",
        security: [["bearerAuth" => []]],
        tags: ["Scope Governance"]
    )]
    public function convertActionItem(Request $request, int $id): JsonResponse
    {
        $task = $this->governanceService->convertActionItemToTask($id, $request->user());

        return $this->createdResponse($task, 'Action item converted to Task.');
    }
}
