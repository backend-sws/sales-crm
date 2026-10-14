<?php

namespace App\Contracts\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\User;

interface ProjectTaskServiceInterface
{
    public function listProjectTasks(Project $project, array $filters = []): array;

    public function createTask(Project $project, array $data, User $creator): Task;

    public function updateTask(Task $task, array $data): Task;

    public function moveTaskStatus(Task $task, string $newStatus, User $actor): Task;

    public function addDependency(Task $task, int $dependsOnTaskId): void;

    public function removeDependency(Task $task, int $dependsOnTaskId): void;

    public function attachProof(Task $task, array $data, User $user): TaskAttachment;

    public function clientReviewTask(Task $task, string $action, ?string $reason, ?int $rating, User $client): Task;

    public function getGanttData(Project $project): array;
}
