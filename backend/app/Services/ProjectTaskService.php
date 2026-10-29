<?php

namespace App\Services;

use App\Contracts\Services\ProjectTaskServiceInterface;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectTaskService implements ProjectTaskServiceInterface
{
    public function listProjectTasks(Project $project, array $filters = []): array
    {
        $query = $project->tasks()
            ->with([
                'assignee:id,name,email,avatar,hourly_rate',
                'sprint:id,name,status',
                'milestone:id,title,status',
                'dependsOn:id,title,status',
                'blocking:id,title,status',
                'attachments.uploader:id,name,avatar',
                'timeEntries.user:id,name',
                'serviceRequest:id,ticket_number,title,priority,status,client_service_id',
            ]);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['sprint_id'])) {
            $query->where('sprint_id', $filters['sprint_id']);
        }

        if (!empty($filters['assignee_id'])) {
            $query->where('assignee_id', $filters['assignee_id']);
        }

        if (!empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        return $query->orderBy('created_at', 'desc')->get()->toArray();
    }

    public function createTask(Project $project, array $data, User $creator): Task
    {
        return DB::transaction(function () use ($project, $data) {
            $taskData = [
                'sprint_id'        => $data['sprint_id'] ?? null,
                'milestone_id'     => $data['milestone_id'] ?? null,
                'source_type'      => $data['source_type'] ?? 'ad_hoc',
                'source_id'        => $data['source_id'] ?? null,
                'title'            => $data['title'],
                'description'      => $data['description'] ?? null,
                'assignee_id'      => $data['assignee_id'] ?? null,
                'status'           => $data['status'] ?? 'backlog',
                'priority'         => $data['priority'] ?? 'medium',
                'complexity'       => $data['complexity'] ?? 'medium',
                'story_points'     => $data['story_points'] ?? null,
                'estimated_hours'  => $data['estimated_hours'] ?? null,
                'due_date'         => $data['due_date'] ?? null,
            ];

            try {
                $task = $project->tasks()->create($taskData);
            } catch (\Throwable $e) {
                // If strict database ENUM rejects 'chat' (MySQL 1265 warning/error), fallback to 'ad_hoc'
                if (str_contains($e->getMessage(), 'source_type') || str_contains($e->getMessage(), '1265')) {
                    $taskData['source_type'] = 'ad_hoc';
                    $task = $project->tasks()->create($taskData);
                } else {
                    throw $e;
                }
            }

            if (!empty($data['depends_on_ids']) && is_array($data['depends_on_ids'])) {
                $task->dependsOn()->sync($data['depends_on_ids']);
            }

            return $task->load('assignee', 'dependsOn', 'sprint');
        });
    }

    public function updateTask(Task $task, array $data): Task
    {
        $task->update(array_filter([
            'sprint_id'       => $data['sprint_id'] ?? null,
            'milestone_id'    => $data['milestone_id'] ?? null,
            'title'           => $data['title'] ?? null,
            'description'     => $data['description'] ?? null,
            'assignee_id'     => $data['assignee_id'] ?? null,
            'priority'        => $data['priority'] ?? null,
            'complexity'      => $data['complexity'] ?? null,
            'story_points'    => $data['story_points'] ?? null,
            'estimated_hours' => $data['estimated_hours'] ?? null,
            'due_date'        => $data['due_date'] ?? null,
        ], fn($v) => !is_null($v)));

        if (isset($data['depends_on_ids']) && is_array($data['depends_on_ids'])) {
            $task->dependsOn()->sync($data['depends_on_ids']);
        }

        return $task->fresh(['assignee', 'dependsOn', 'attachments']);
    }

    public function moveTaskStatus(Task $task, string $newStatus, User $actor): Task
    {
        $validStatuses = ['backlog', 'in_progress', 'qa', 'client_review', 'done'];
        if (!in_array($newStatus, $validStatuses, true)) {
            throw ValidationException::withMessages([
                'status' => ["Invalid status '{$newStatus}'."],
            ]);
        }

        // 1. Dependency Guard: Cannot move to in_progress if blocked by incomplete dependency
        if ($newStatus === 'in_progress') {
            $hasIncompleteDependency = $task->dependsOn()
                ->where('status', '!=', 'done')
                ->exists();

            if ($hasIncompleteDependency) {
                $blockingTasks = $task->dependsOn()->where('status', '!=', 'done')->pluck('title')->implode(', ');
                throw ValidationException::withMessages([
                    'status' => ["Task is blocked! Waiting on dependency: {$blockingTasks}"],
                ]);
            }
        }

        // 2. Proof Enforcement Guard: Cannot move to client_review without attached proof
        if ($newStatus === 'client_review') {
            $hasProof = $task->attachments()->where('is_proof', true)->exists();
            if (!$hasProof) {
                throw ValidationException::withMessages([
                    'proof' => ['Proof of work (screenshot, video demo, or staging URL) is mandatory before moving to Client Review.'],
                ]);
            }
        }

        $updates = ['status' => $newStatus];
        if ($newStatus === 'done' && !$task->completed_at) {
            $updates['completed_at'] = now();
        }

        $task->update($updates);

        // Synchronize with linked ServiceRequest (Ticket)
        if ($task->service_request_id || $task->serviceRequest) {
            $serviceTicket = $task->serviceRequest ?: \App\Models\ServiceRequest::find($task->service_request_id);
            if ($serviceTicket) {
                if (in_array($newStatus, ['client_review', 'done'], true)) {
                    $serviceTicket->update([
                        'status'       => 'done',
                        'completed_at' => now(),
                    ]);
                } elseif ($newStatus === 'in_progress') {
                    $serviceTicket->update([
                        'status' => 'in_progress',
                    ]);
                }
            }
        }

        return $task->fresh(['assignee', 'dependsOn', 'attachments', 'sprint', 'serviceRequest']);
    }

    public function addDependency(Task $task, int $dependsOnTaskId): void
    {
        if ($task->id === $dependsOnTaskId) {
            throw ValidationException::withMessages([
                'dependency' => ['A task cannot depend on itself.'],
            ]);
        }

        $task->dependsOn()->syncWithoutDetaching([$dependsOnTaskId]);
    }

    public function removeDependency(Task $task, int $dependsOnTaskId): void
    {
        $task->dependsOn()->detach($dependsOnTaskId);
    }

    public function attachProof(Task $task, array $data, User $user): TaskAttachment
    {
        $attachment = $task->attachments()->create([
            'user_id'   => $user->id,
            'file_name' => $data['file_name'] ?? 'Proof of Work Attachment',
            'file_path' => $data['file_path'] ?? null,
            'file_type' => $data['file_type'] ?? 'link',
            'url'       => $data['url'] ?? null,
            'is_proof'  => true,
            'notes'     => $data['notes'] ?? null,
        ]);

        $task->update(['is_proof_attached' => true]);

        return $attachment;
    }

    public function clientReviewTask(Task $task, string $action, ?string $reason, ?int $rating, User $client): Task
    {
        if ($action === 'accept') {
            $task->update([
                'status'         => 'done',
                'completed_at'   => now(),
                'client_rating'  => $rating ?? 5,
                'client_feedback'=> $reason ?? 'Accepted and approved by client',
            ]);
        } elseif ($action === 'reject') {
            if (empty($reason)) {
                throw ValidationException::withMessages([
                    'reason' => ['A rejection reason is mandatory to guide the developer on rework.'],
                ]);
            }

            $task->increment('rework_count');
            $task->update([
                'status'          => 'in_progress',
                'client_feedback' => $reason,
            ]);
        } else {
            throw ValidationException::withMessages([
                'action' => ["Action must be 'accept' or 'reject'."],
            ]);
        }

        // Synchronize with linked ServiceRequest (Ticket)
        if ($task->service_request_id || $task->serviceRequest) {
            $serviceTicket = $task->serviceRequest ?: \App\Models\ServiceRequest::find($task->service_request_id);
            if ($serviceTicket) {
                if ($action === 'accept') {
                    $serviceTicket->update([
                        'status'       => 'confirmed',
                        'confirmed_at' => now(),
                    ]);
                } elseif ($action === 'reject') {
                    $serviceTicket->update([
                        'status' => 'in_progress',
                    ]);
                }
            }
        }

        return $task->fresh(['assignee', 'attachments', 'serviceRequest']);
    }

    public function getGanttData(Project $project): array
    {
        $tasks = $project->tasks()->with('assignee', 'dependsOn', 'milestone')->get();
        $milestones = $project->milestones()->get();

        $items = [];

        // Add milestones as diamond milestones
        foreach ($milestones as $milestone) {
            $date = $milestone->due_date ? $milestone->due_date->toDateString() : now()->toDateString();
            $items[] = [
                'id'           => "milestone-{$milestone->id}",
                'type'         => 'milestone',
                'name'         => "◆ {$milestone->title}",
                'start'        => $date,
                'end'          => $date,
                'progress'     => $milestone->status === 'completed' ? 100 : 0,
                'status'       => $milestone->status,
                'dependencies' => [],
            ];
        }

        // Add tasks as duration bars
        foreach ($tasks as $task) {
            $start = $task->created_at->toDateString();
            $end = $task->due_date ? $task->due_date->toDateString() : now()->addDays(3)->toDateString();

            $progress = match ($task->status) {
                'done'          => 100,
                'client_review' => 85,
                'qa'            => 70,
                'in_progress'   => 40,
                default         => 10,
            };

            $dependencies = $task->dependsOn->map(fn($d) => "task-{$d->id}")->toArray();

            $items[] = [
                'id'           => "task-{$task->id}",
                'type'         => 'task',
                'name'         => $task->title,
                'start'        => $start,
                'end'          => $end,
                'progress'     => $progress,
                'status'       => $task->status,
                'priority'     => $task->priority,
                'assignee'     => $task->assignee?->name ?? 'Unassigned',
                'dependencies' => $dependencies,
            ];
        }

        return $items;
    }
}
