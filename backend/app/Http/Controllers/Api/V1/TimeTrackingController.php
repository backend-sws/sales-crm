<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\TimeTrackingServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Time Tracking", description: "Live Stopwatch Timers and Developer Worklogs")]
class TimeTrackingController extends BaseApiController
{
    public function __construct(
        protected TimeTrackingServiceInterface $timeTrackingService
    ) {}

    #[OA\Get(
        path: "/api/v1/time-entries/active",
        summary: "Get current user's active running timer (if any)",
        security: [["bearerAuth" => []]],
        tags: ["Time Tracking"]
    )]
    public function activeTimer(Request $request): JsonResponse
    {
        $active = $this->timeTrackingService->getActiveTimer($request->user());

        return $this->successResponse($active, 'Active timer status checked.');
    }

    #[OA\Post(
        path: "/api/v1/tasks/{taskId}/timer/start",
        summary: "Start live stopwatch timer on a task",
        security: [["bearerAuth" => []]],
        tags: ["Time Tracking"]
    )]
    public function startTimer(Request $request, int $taskId): JsonResponse
    {
        $task = Task::findOrFail($taskId);
        $entry = $this->timeTrackingService->startTimer($task, $request->user());

        return $this->createdResponse($entry, "Timer started on '{$task->title}'.");
    }

    #[OA\Post(
        path: "/api/v1/time-entries/{id}/stop",
        summary: "Stop running timer and compute elapsed duration",
        security: [["bearerAuth" => []]],
        tags: ["Time Tracking"]
    )]
    public function stopTimer(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'description' => 'nullable|string|max:500',
        ]);

        $entry = $this->timeTrackingService->stopTimer($id, $validated['description'] ?? null);

        return $this->successResponse($entry, 'Timer stopped and duration logged.');
    }

    #[OA\Post(
        path: "/api/v1/tasks/{taskId}/time-entries",
        summary: "Manually log a work session against a task",
        security: [["bearerAuth" => []]],
        tags: ["Time Tracking"]
    )]
    public function store(Request $request, int $taskId): JsonResponse
    {
        $task = Task::findOrFail($taskId);

        $validated = $request->validate([
            'duration_minutes' => 'nullable|integer|min:1',
            'duration_hours'   => 'nullable|numeric|min:0.1',
            'date'             => 'nullable|date',
            'is_billable'      => 'nullable|boolean',
            'description'      => 'nullable|string|max:500',
        ]);

        $entry = $this->timeTrackingService->logManualTime($task, $request->user(), $validated);

        return $this->createdResponse($entry, 'Time entry recorded successfully.');
    }

    #[OA\Get(
        path: "/api/v1/projects/{projectId}/worklogs",
        summary: "List all time entries and calculated costs across a project",
        security: [["bearerAuth" => []]],
        tags: ["Time Tracking"]
    )]
    public function projectWorklogs(int $projectId): JsonResponse
    {
        $project = Project::findOrFail($projectId);
        $worklogs = $this->timeTrackingService->getProjectWorklogs($project);

        return $this->successResponse($worklogs, 'Project worklogs loaded.');
    }
}
