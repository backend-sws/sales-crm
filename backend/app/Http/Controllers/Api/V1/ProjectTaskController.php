<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\ProjectTaskServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Project Tasks", description: "Kanban Task Management, Proof Verification & Gantt")]
class ProjectTaskController extends BaseApiController
{
    public function __construct(
        protected ProjectTaskServiceInterface $taskService
    ) {}

    #[OA\Get(
        path: "/api/v1/projects/{projectId}/tasks",
        summary: "List project tasks with dependency chain and proof attachments",
        security: [["bearerAuth" => []]],
        tags: ["Project Tasks"]
    )]
    public function index(Request $request, int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $filters = $request->only(['status', 'sprint_id', 'assignee_id', 'priority']);
        $tasks = $this->taskService->listProjectTasks($project, $filters);

        return $this->successResponse($tasks, 'Project tasks retrieved.');
    }

    #[OA\Post(
        path: "/api/v1/projects/{projectId}/tasks",
        summary: "Create a new task within a project",
        security: [["bearerAuth" => []]],
        tags: ["Project Tasks"]
    )]
    public function store(Request $request, int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'title'            => 'required|string|max:255',
            'description'      => 'nullable|string',
            'sprint_id'        => 'nullable|exists:sprints,id',
            'milestone_id'     => 'nullable|exists:project_milestones,id',
            'source_type'      => 'nullable|in:scope,change_request,meeting_action,ad_hoc,chat,chat_message',
            'source_id'        => 'nullable|integer',
            'assignee_id'      => 'nullable|exists:users,id',
            'status'           => 'nullable|in:backlog,in_progress,qa,client_review,done',
            'priority'         => 'nullable|in:low,medium,high,critical',
            'complexity'       => 'nullable|in:easy,medium,hard',
            'story_points'     => 'nullable|integer|min:1|max:100',
            'estimated_hours'  => 'nullable|numeric|min:0',
            'due_date'         => 'nullable|date',
            'depends_on_ids'   => 'nullable|array',
            'depends_on_ids.*' => 'exists:tasks,id',
        ]);

        $task = $this->taskService->createTask($project, $validated, $request->user());

        return $this->createdResponse($task, 'Task created successfully.');
    }

    #[OA\Patch(
        path: "/api/v1/tasks/{id}",
        summary: "Update task fields",
        security: [["bearerAuth" => []]],
        tags: ["Project Tasks"]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $task = Task::findOrFail($id);

        $validated = $request->validate([
            'title'            => 'nullable|string|max:255',
            'description'      => 'nullable|string',
            'sprint_id'        => 'nullable|exists:sprints,id',
            'milestone_id'     => 'nullable|exists:project_milestones,id',
            'assignee_id'      => 'nullable|exists:users,id',
            'priority'         => 'nullable|in:low,medium,high,critical',
            'complexity'       => 'nullable|in:easy,medium,hard',
            'story_points'     => 'nullable|integer|min:1|max:100',
            'estimated_hours'  => 'nullable|numeric|min:0',
            'due_date'         => 'nullable|date',
            'depends_on_ids'   => 'nullable|array',
            'depends_on_ids.*' => 'exists:tasks,id',
        ]);

        $updated = $this->taskService->updateTask($task, $validated);

        return $this->successResponse($updated, 'Task updated successfully.');
    }

    #[OA\Patch(
        path: "/api/v1/tasks/{id}/status",
        summary: "Move task across Kanban stages (Enforces Dependency & Proof of Work)",
        security: [["bearerAuth" => []]],
        tags: ["Project Tasks"]
    )]
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $task = Task::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:backlog,in_progress,qa,client_review,done',
        ]);

        $updated = $this->taskService->moveTaskStatus($task, $validated['status'], $request->user());

        return $this->successResponse($updated, "Task moved to {$validated['status']}.");
    }

    #[OA\Post(
        path: "/api/v1/tasks/{id}/dependencies",
        summary: "Add dependency requirement to a task",
        security: [["bearerAuth" => []]],
        tags: ["Project Tasks"]
    )]
    public function addDependency(Request $request, int $id): JsonResponse
    {
        $task = Task::findOrFail($id);

        $validated = $request->validate([
            'depends_on_task_id' => 'required|exists:tasks,id',
        ]);

        $this->taskService->addDependency($task, (int) $validated['depends_on_task_id']);

        return $this->successResponse(null, 'Dependency added successfully.');
    }

    #[OA\Delete(
        path: "/api/v1/tasks/{id}/dependencies/{dependsOnTaskId}",
        summary: "Remove dependency from a task",
        security: [["bearerAuth" => []]],
        tags: ["Project Tasks"]
    )]
    public function removeDependency(int $id, int $dependsOnTaskId): JsonResponse
    {
        $task = Task::findOrFail($id);
        $this->taskService->removeDependency($task, $dependsOnTaskId);

        return $this->successResponse(null, 'Dependency removed.');
    }

    #[OA\Post(
        path: "/api/v1/tasks/{id}/proof",
        summary: "Upload Proof of Work (Screenshot, Loom video, or Staging URL)",
        security: [["bearerAuth" => []]],
        tags: ["Project Tasks"]
    )]
    public function attachProof(Request $request, int $id): JsonResponse
    {
        $task = Task::findOrFail($id);

        $validated = $request->validate([
            'file_name' => 'nullable|string|max:255',
            'file_type' => 'nullable|string|in:screenshot,video,url,document',
            'url'       => 'nullable|string|max:500',
            'notes'     => 'nullable|string',
        ]);

        $attachment = $this->taskService->attachProof($task, $validated, $request->user());

        return $this->createdResponse($attachment, 'Proof of work attached.');
    }

    #[OA\Post(
        path: "/api/v1/tasks/{id}/client-decision",
        summary: "Client accepts or rejects task in review",
        security: [["bearerAuth" => []]],
        tags: ["Project Tasks"]
    )]
    public function clientDecision(Request $request, int $id): JsonResponse
    {
        $task = Task::findOrFail($id);

        $validated = $request->validate([
            'action' => 'required|in:accept,reject',
            'reason' => 'nullable|string',
            'rating' => 'nullable|integer|min:1|max:5',
        ]);

        $updated = $this->taskService->clientReviewTask(
            $task,
            $validated['action'],
            $validated['reason'] ?? null,
            $validated['rating'] ?? null,
            $request->user()
        );

        $msg = $validated['action'] === 'accept'
            ? 'Task approved and completed!'
            : 'Task rejected and returned to in-progress for rework.';

        return $this->successResponse($updated, $msg);
    }

    #[OA\Get(
        path: "/api/v1/projects/{projectId}/gantt",
        summary: "Get formatted Gantt chart dataset with timeline and dependency links",
        security: [["bearerAuth" => []]],
        tags: ["Project Tasks"]
    )]
    public function gantt(int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $ganttData = $this->taskService->getGanttData($project);

        return $this->successResponse($ganttData, 'Gantt chart dataset loaded.');
    }
}
