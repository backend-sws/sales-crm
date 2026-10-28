<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\SprintServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Models\Project;
use App\Models\Sprint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Sprints", description: "Sprint Planning, Velocity & Burndown Charts")]
class SprintController extends BaseApiController
{
    public function __construct(
        protected SprintServiceInterface $sprintService
    ) {}

    #[OA\Get(
        path: "/api/v1/projects/{projectId}/sprints",
        summary: "List all sprints for a project",
        security: [["bearerAuth" => []]],
        tags: ["Sprints"]
    )]
    public function index(int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $sprints = $this->sprintService->listSprints($project);

        return $this->successResponse($sprints, 'Sprints retrieved.');
    }

    #[OA\Post(
        path: "/api/v1/projects/{projectId}/sprints",
        summary: "Create a new sprint timebox for a project",
        security: [["bearerAuth" => []]],
        tags: ["Sprints"]
    )]
    public function store(Request $request, int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'name'            => 'required|string|max:100',
            'goal'            => 'nullable|string|max:255',
            'start_date'      => 'nullable|date',
            'end_date'        => 'nullable|date|after_or_equal:start_date',
            'velocity_target' => 'nullable|numeric|min:0',
            'status'          => 'nullable|in:planned,active,completed',
        ]);

        $sprint = $this->sprintService->createSprint($project, $validated);

        return $this->createdResponse($sprint, 'Sprint created successfully.');
    }

    #[OA\Post(
        path: "/api/v1/sprints/{id}/tasks",
        summary: "Assign existing tasks to a sprint",
        security: [["bearerAuth" => []]],
        tags: ["Sprints"]
    )]
    public function assignTasks(Request $request, int $id): JsonResponse
    {
        $sprint = Sprint::findOrFail($id);

        $validated = $request->validate([
            'task_ids'   => 'required|array',
            'task_ids.*' => 'exists:tasks,id',
        ]);

        $count = $this->sprintService->assignTasksToSprint($sprint, $validated['task_ids']);

        return $this->successResponse(['assigned_count' => $count], "{$count} tasks assigned to sprint.");
    }

    #[OA\Get(
        path: "/api/v1/sprints/{id}/burndown",
        summary: "Get day-by-day ideal vs actual remaining points for sprint burndown chart",
        security: [["bearerAuth" => []]],
        tags: ["Sprints"]
    )]
    public function burndown(int $id): JsonResponse
    {
        $sprint = Sprint::findOrFail($id);
        $burndown = $this->sprintService->getBurndownData($sprint);

        return $this->successResponse($burndown, 'Burndown chart data loaded.');
    }

    #[OA\Put(
        path: "/api/v1/sprints/{id}",
        summary: "Update sprint details including dates, name, and velocity target",
        security: [["bearerAuth" => []]],
        tags: ["Sprints"]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $sprint = Sprint::findOrFail($id);

        $validated = $request->validate([
            'name'            => 'sometimes|string|max:100',
            'goal'            => 'nullable|string|max:255',
            'start_date'      => 'nullable|date',
            'end_date'        => 'nullable|date|after_or_equal:start_date',
            'velocity_target' => 'nullable|numeric|min:0',
            'status'          => 'nullable|in:planned,active,completed',
        ]);

        $updated = $this->sprintService->updateSprint($sprint, $validated);

        return $this->successResponse($updated, 'Sprint updated successfully.');
    }

    #[OA\Patch(
        path: "/api/v1/sprints/{id}/close",
        summary: "Close sprint with retrospective notes and calculate achieved velocity",
        security: [["bearerAuth" => []]],
        tags: ["Sprints"]
    )]
    public function close(Request $request, int $id): JsonResponse
    {
        $sprint = Sprint::findOrFail($id);

        $validated = $request->validate([
            'retrospective_notes' => 'nullable|string',
        ]);

        $closed = $this->sprintService->closeSprint($sprint, $validated['retrospective_notes'] ?? null);

        return $this->successResponse($closed, "Sprint '{$closed->name}' closed successfully.");
    }
}
