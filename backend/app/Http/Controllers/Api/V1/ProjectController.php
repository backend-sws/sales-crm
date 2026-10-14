<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\ProjectServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Models\Project;
use App\Models\ProjectMilestone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Projects", description: "Project Management, Milestones, Budget Tracking & Capacity")]
class ProjectController extends BaseApiController
{
    public function __construct(
        protected ProjectServiceInterface $projectService
    ) {}

    #[OA\Get(
        path: "/api/v1/projects",
        summary: "List all projects with progress and budget snapshots",
        security: [["bearerAuth" => []]],
        tags: ["Projects"]
    )]
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['client_id', 'pm_id', 'status', 'search']);
        $projects = $this->projectService->listProjects($filters);

        return $this->successResponse($projects, 'Projects retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/projects/{id}",
        summary: "Get comprehensive project details including tasks, sprints, scope and budget",
        security: [["bearerAuth" => []]],
        tags: ["Projects"]
    )]
    public function show(int $id): JsonResponse
    {
        $detail = $this->projectService->getProjectDetail($id);

        return $this->successResponse($detail, 'Project details loaded successfully.');
    }

    #[OA\Post(
        path: "/api/v1/projects",
        summary: "Create a new delivery project for a client",
        security: [["bearerAuth" => []]],
        tags: ["Projects"]
    )]
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_id'            => 'required|exists:clients,id',
            'client_service_id'    => 'nullable|exists:client_services,id',
            'name'                 => 'required|string|max:255',
            'description'          => 'nullable|string',
            'status'               => 'nullable|in:draft,scope_approved,in_dev,client_review,on_hold,completed,closed',
            'pm_id'                => 'nullable|exists:users,id',
            'start_date'           => 'nullable|date',
            'target_end_date'      => 'nullable|date|after_or_equal:start_date',
            'total_value'          => 'nullable|numeric|min:0',
            'total_budget'         => 'nullable|numeric|min:0',
            'sprint_duration_days' => 'nullable|integer|min:7|max:30',
            'initial_scope'        => 'nullable|string',
        ]);

        $project = $this->projectService->createProject($validated, $request->user());

        return $this->createdResponse($project, 'Project created successfully.');
    }

    #[OA\Patch(
        path: "/api/v1/projects/{id}",
        summary: "Update project metadata, dates, or budget parameters",
        security: [["bearerAuth" => []]],
        tags: ["Projects"]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $project = Project::findOrFail($id);

        $validated = $request->validate([
            'name'                 => 'nullable|string|max:255',
            'description'          => 'nullable|string',
            'status'               => 'nullable|in:draft,scope_approved,in_dev,client_review,on_hold,completed,closed',
            'pm_id'                => 'nullable|exists:users,id',
            'start_date'           => 'nullable|date',
            'target_end_date'      => 'nullable|date',
            'total_value'          => 'nullable|numeric|min:0',
            'total_budget'         => 'nullable|numeric|min:0',
            'sprint_duration_days' => 'nullable|integer|min:7|max:30',
        ]);

        $updated = $this->projectService->updateProject($project, $validated);

        return $this->successResponse($updated, 'Project updated successfully.');
    }

    #[OA\Get(
        path: "/api/v1/projects/{id}/budget",
        summary: "Get real-time project budget telemetry, estimated vs actual costs and margins",
        security: [["bearerAuth" => []]],
        tags: ["Projects"]
    )]
    public function budget(int $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $snapshot = $this->projectService->getBudgetSnapshot($project);

        return $this->successResponse($snapshot, 'Budget telemetry calculated.');
    }

    #[OA\Get(
        path: "/api/v1/projects/{id}/capacity",
        summary: "Get team availability and capacity matrix for the upcoming 2 weeks",
        security: [["bearerAuth" => []]],
        tags: ["Projects"]
    )]
    public function capacity(int $id): JsonResponse
    {
        $project = Project::findOrFail($id);
        $matrix = $this->projectService->getCapacityMatrix($project);

        return $this->successResponse($matrix, 'Team capacity matrix loaded.');
    }

    #[OA\Post(
        path: "/api/v1/projects/{id}/milestones",
        summary: "Add a new milestone to the project",
        security: [["bearerAuth" => []]],
        tags: ["Projects"]
    )]
    public function storeMilestone(Request $request, int $id): JsonResponse
    {
        $project = Project::findOrFail($id);

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount'      => 'required|numeric|min:0',
            'due_date'    => 'nullable|date',
            'status'      => 'nullable|in:pending,in_progress,completed',
        ]);

        $milestone = $this->projectService->createMilestone($project, $validated);

        return $this->createdResponse($milestone, 'Project milestone created successfully.');
    }

    #[OA\Post(
        path: "/api/v1/milestones/{milestoneId}/invoice",
        summary: "Generate GST tax invoice for completed milestone",
        security: [["bearerAuth" => []]],
        tags: ["Projects"]
    )]
    public function invoiceMilestone(int $milestoneId): JsonResponse
    {
        $milestone = ProjectMilestone::with(['project.client'])->findOrFail($milestoneId);
        $invoice = $this->projectService->invoiceMilestone($milestone);

        return $this->createdResponse($invoice, 'Milestone invoice generated successfully.');
    }
}
