<?php

namespace App\Contracts\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;

interface TimeTrackingServiceInterface
{
    public function startTimer(Task $task, User $user): TimeEntry;

    public function stopTimer(int $timeEntryId, ?string $description = null): TimeEntry;

    public function getActiveTimer(User $user): ?TimeEntry;

    public function logManualTime(Task $task, User $user, array $data): TimeEntry;

    public function getTaskTimeEntries(Task $task): array;

    public function getProjectWorklogs(Project $project): array;
}
