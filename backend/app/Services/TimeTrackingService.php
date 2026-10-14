<?php

namespace App\Services;

use App\Contracts\Services\TimeTrackingServiceInterface;
use App\Models\Project;
use App\Models\Task;
use App\Models\TimeEntry;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class TimeTrackingService implements TimeTrackingServiceInterface
{
    public function startTimer(Task $task, User $user): TimeEntry
    {
        // 1. Auto-stop any existing running timer for this user
        $running = TimeEntry::where('user_id', $user->id)
            ->whereNull('ended_at')
            ->first();

        if ($running) {
            $this->stopTimer($running->id, 'Auto-stopped on starting new task timer');
        }

        // 2. Start new timer
        return TimeEntry::create([
            'task_id'          => $task->id,
            'user_id'          => $user->id,
            'started_at'       => now(),
            'ended_at'         => null,
            'duration_minutes' => 0,
            'is_billable'      => true,
            'description'      => "Working on: {$task->title}",
        ])->load('task.project');
    }

    public function stopTimer(int $timeEntryId, ?string $description = null): TimeEntry
    {
        $entry = TimeEntry::findOrFail($timeEntryId);

        if ($entry->ended_at) {
            return $entry; // Already stopped
        }

        $startedAt = $entry->started_at;
        $endedAt = now();
        $durationMinutes = max(1, (int) $startedAt->diffInMinutes($endedAt));

        $entry->update([
            'ended_at'         => $endedAt,
            'duration_minutes' => $durationMinutes,
            'description'      => $description ?? $entry->description,
        ]);

        return $entry->fresh(['task.project', 'user']);
    }

    public function getActiveTimer(User $user): ?TimeEntry
    {
        return TimeEntry::with(['task.project:id,name', 'task:id,title,project_id'])
            ->where('user_id', $user->id)
            ->whereNull('ended_at')
            ->latest('started_at')
            ->first();
    }

    public function logManualTime(Task $task, User $user, array $data): TimeEntry
    {
        $durationMinutes = !empty($data['duration_minutes'])
            ? (int) $data['duration_minutes']
            : (int) round(((float) ($data['duration_hours'] ?? 1.0)) * 60);

        if ($durationMinutes <= 0) {
            throw ValidationException::withMessages([
                'duration' => ['Duration must be greater than zero.'],
            ]);
        }

        $startedAt = !empty($data['date'])
            ? Carbon::parse($data['date'])->setTime(10, 0)
            : now()->subMinutes($durationMinutes);

        $endedAt = (clone $startedAt)->addMinutes($durationMinutes);

        return TimeEntry::create([
            'task_id'          => $task->id,
            'user_id'          => $user->id,
            'started_at'       => $startedAt,
            'ended_at'         => $endedAt,
            'duration_minutes' => $durationMinutes,
            'is_billable'      => $data['is_billable'] ?? true,
            'description'      => $data['description'] ?? "Work on: {$task->title}",
        ])->load('task', 'user');
    }

    public function getTaskTimeEntries(Task $task): array
    {
        return $task->timeEntries()
            ->with('user:id,name,email,avatar')
            ->orderBy('started_at', 'desc')
            ->get()
            ->toArray();
    }

    public function getProjectWorklogs(Project $project): array
    {
        return TimeEntry::whereHas('task', fn($q) => $q->where('project_id', $project->id))
            ->with(['task:id,title,status,priority', 'user:id,name,email,avatar,hourly_rate'])
            ->orderBy('started_at', 'desc')
            ->get()
            ->map(function ($entry) {
                $hours = round($entry->duration_minutes / 60, 2);
                $rate = (float) ($entry->user->hourly_rate ?? 0);
                $cost = round($hours * $rate, 2);

                return [
                    'id'               => $entry->id,
                    'task'             => $entry->task,
                    'user'             => $entry->user,
                    'started_at'       => $entry->started_at?->toISOString(),
                    'ended_at'         => $entry->ended_at?->toISOString(),
                    'duration_minutes' => $entry->duration_minutes,
                    'hours'            => $hours,
                    'is_billable'      => (bool) $entry->is_billable,
                    'cost'             => $cost,
                    'description'      => $entry->description,
                ];
            })
            ->toArray();
    }
}
