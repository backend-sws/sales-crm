<?php

namespace App\Services;

use App\Contracts\Services\ServiceTrackServiceInterface;
use App\Models\ActivityLog;
use App\Models\ClientService;
use App\Models\Project;
use App\Models\ServiceReport;
use App\Models\ServiceRequest;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ServiceTrackService implements ServiceTrackServiceInterface
{
    /**
     * Get tickets for a client service.
     */
    public function getTickets(int $serviceId, array $filters = []): Collection
    {
        $query = ServiceRequest::where('client_service_id', $serviceId)
            ->with([
                'creator:id,name,email',
                'assignee:id,name,email',
                'task:id,project_id,status,title,story_points,assignee_id',
                'task.project:id,name',
            ])
            ->latest();

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        return $query->get();
    }

    /**
     * Create a new ticket (by client or account manager).
     */
    public function createTicket(int $serviceId, array $data, User $actor): ServiceRequest
    {
        $service = ClientService::findOrFail($serviceId);

        $seq = ServiceRequest::count() + 1;
        $ticketNumber = 'TICK-' . date('Y') . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);

        $priority = $data['priority'] ?? 'medium';
        $slaHours = match ($priority) {
            'urgent' => 4,
            'high'   => 12,
            'medium' => 24,
            default  => 48,
        };

        $ticket = ServiceRequest::create([
            'client_service_id' => $service->id,
            'client_id'         => $service->client_id,
            'ticket_number'     => $ticketNumber,
            'title'             => $data['title'],
            'description'       => $data['description'],
            'priority'          => $priority,
            'status'            => 'open',
            'added_by'          => $actor->id,
            'added_by_type'     => $actor->hasRole('client') ? 'client' : 'admin',
            'assigned_to'       => $data['assigned_to'] ?? null,
            'sla_deadline'      => now()->addHours($slaHours),
        ]);

        ActivityLog::create([
            'log_name'     => 'tickets',
            'description'  => "Created ticket {$ticketNumber}: {$ticket->title}",
            'subject_type' => ServiceRequest::class,
            'subject_id'   => $ticket->id,
            'causer_type'  => User::class,
            'causer_id'    => $actor->id,
            'created_at'   => now(),
        ]);

        return $ticket->load(['creator', 'assignee']);
    }

    /**
     * Transition ticket status (Open -> In Progress -> Done -> Confirmed).
     */
    public function updateTicketStatus(int $ticketId, string $status, User $actor): ServiceRequest
    {
        $ticket = ServiceRequest::with('task')->findOrFail($ticketId);

        $update = ['status' => $status];
        if ($status === 'done' && ! $ticket->completed_at) {
            $update['completed_at'] = now();
        }

        $ticket->update($update);

        // Sync linked Kanban task
        if ($ticket->task) {
            if ($status === 'done') {
                $ticket->task->update(['status' => 'client_review', 'completed_at' => now()]);
            } elseif ($status === 'in_progress') {
                $ticket->task->update(['status' => 'in_progress']);
            } elseif ($status === 'closed') {
                $ticket->task->update(['status' => 'done']);
            }
        }

        ActivityLog::create([
            'log_name'     => 'tickets',
            'description'  => "Transitioned ticket {$ticket->ticket_number} status to {$status}",
            'subject_type' => ServiceRequest::class,
            'subject_id'   => $ticket->id,
            'causer_type'  => User::class,
            'causer_id'    => $actor->id,
            'created_at'   => now(),
        ]);

        return $ticket->fresh(['creator', 'assignee', 'task.project']);
    }

    /**
     * Accept a client ticket, verify legitimacy, assign developer and route to project Kanban board.
     */
    public function acceptTicket(int $ticketId, array $data, User $actor): ServiceRequest
    {
        $ticket = ServiceRequest::with(['service', 'client', 'task'])->findOrFail($ticketId);

        return DB::transaction(function () use ($ticket, $data, $actor) {
            $developerId = $data['assigned_to'] ?? null;
            if (!$developerId) {
                $developerId = $actor->id;
            }

            // Find or determine the project for this ticket
            $project = null;
            if (!empty($data['project_id'])) {
                $project = Project::find($data['project_id']);
            }

            if (!$project && $ticket->client_service_id) {
                $project = Project::where('client_service_id', $ticket->client_service_id)->first();
            }

            if (!$project && $ticket->client_id) {
                $project = Project::where('client_id', $ticket->client_id)->latest()->first();
            }

            if (!$project) {
                // Auto-create a project if no active project exists for this client
                $serviceName = $ticket->service?->service_name ?? 'Client Delivery Project';
                $project = Project::create([
                    'client_id'          => $ticket->client_id,
                    'client_service_id'  => $ticket->client_service_id,
                    'name'               => $serviceName,
                    'description'        => "Dedicated delivery project for {$serviceName}",
                    'status'             => 'in_dev',
                    'start_date'         => now(),
                    'total_value'        => $ticket->service?->value ?? 0,
                    'total_budget'       => $ticket->service?->value ?? 0,
                ]);
            }

            // Map priority to task priority
            $taskPriority = match ($data['priority'] ?? $ticket->priority) {
                'urgent' => 'critical',
                'high'   => 'high',
                'low'    => 'low',
                default  => 'medium',
            };

            // Create or update associated Kanban Task
            $task = $ticket->task;
            if (!$task) {
                $task = Task::create([
                    'project_id'         => $project->id,
                    'service_request_id' => $ticket->id,
                    'source_type'        => 'ad_hoc',
                    'source_id'          => $ticket->id,
                    'title'              => "[{$ticket->ticket_number}] {$ticket->title}",
                    'description'        => $ticket->description,
                    'assignee_id'        => $developerId,
                    'status'             => $data['kanban_status'] ?? 'in_progress',
                    'priority'           => $taskPriority,
                    'complexity'         => $data['complexity'] ?? 'medium',
                    'story_points'       => $data['story_points'] ?? 3,
                    'estimated_hours'    => $data['estimated_hours'] ?? null,
                    'due_date'           => $data['due_date'] ?? ($ticket->sla_deadline ? $ticket->sla_deadline->toDateString() : now()->addDays(2)->toDateString()),
                ]);
            } else {
                $task->update([
                    'project_id'  => $project->id,
                    'assignee_id' => $developerId,
                    'priority'    => $taskPriority,
                    'status'      => $data['kanban_status'] ?? 'in_progress',
                ]);
            }

            // Update ticket
            $ticket->update([
                'status'      => 'in_progress',
                'assigned_to' => $developerId,
                'task_id'     => $task->id,
            ]);

            $developer = User::find($developerId);

            ActivityLog::create([
                'log_name'     => 'tickets',
                'description'  => "Admin {$actor->name} accepted ticket {$ticket->ticket_number}, assigned developer {$developer?->name}, and routed to Kanban Board in project '{$project->name}' (Task #{$task->id})",
                'subject_type' => ServiceRequest::class,
                'subject_id'   => $ticket->id,
                'causer_type'  => User::class,
                'causer_id'    => $actor->id,
                'created_at'   => now(),
            ]);

            return $ticket->fresh(['creator', 'assignee', 'task.project']);
        });
    }

    /**
     * Reject an invalid or out-of-scope ticket.
     */
    public function rejectTicket(int $ticketId, ?string $reason, User $actor): ServiceRequest
    {
        $ticket = ServiceRequest::with('task')->findOrFail($ticketId);

        $ticket->update([
            'status' => 'closed',
        ]);

        if ($ticket->task) {
            $ticket->task->delete();
        }

        ActivityLog::create([
            'log_name'     => 'tickets',
            'description'  => "Admin {$actor->name} closed/rejected ticket {$ticket->ticket_number}. Reason: " . ($reason ?? 'Ticket declined as out-of-scope or duplicate'),
            'subject_type' => ServiceRequest::class,
            'subject_id'   => $ticket->id,
            'causer_type'  => User::class,
            'causer_id'    => $actor->id,
            'created_at'   => now(),
        ]);

        return $ticket->fresh(['creator', 'assignee', 'task.project']);
    }

    /**
     * Client confirms ticket resolution.
     */
    public function confirmTicket(int $ticketId, User $clientUser): ServiceRequest
    {
        $ticket = ServiceRequest::with('task')->findOrFail($ticketId);

        $ticket->update([
            'status'       => 'confirmed',
            'confirmed_at' => now(),
        ]);

        // Sync linked Kanban task to 'done'
        if ($ticket->task) {
            $ticket->task->update([
                'status'       => 'done',
                'completed_at' => now(),
            ]);
        }

        ActivityLog::create([
            'log_name'     => 'tickets',
            'description'  => "Client {$clientUser->name} confirmed ticket {$ticket->ticket_number} completed",
            'subject_type' => ServiceRequest::class,
            'subject_id'   => $ticket->id,
            'causer_type'  => User::class,
            'causer_id'    => $clientUser->id,
            'created_at'   => now(),
        ]);

        return $ticket->fresh(['creator', 'assignee', 'task.project']);
    }

    /**
     * Upload periodic performance report.
     */
    public function uploadReport(int $serviceId, array $data, User $actor): ServiceReport
    {
        $service = ClientService::findOrFail($serviceId);

        $report = ServiceReport::create([
            'client_service_id' => $service->id,
            'client_id'         => $service->client_id,
            'title'             => $data['title'],
            'period'            => $data['period'] ?? now()->format('F Y'),
            'file_url'          => $data['file_url'] ?? null,
            'metrics'           => $data['metrics'] ?? null,
            'uploaded_by'       => $actor->id,
        ]);

        ActivityLog::create([
            'log_name'     => 'reports',
            'description'  => "Uploaded performance report '{$report->title}' for service #{$service->id}",
            'subject_type' => ServiceReport::class,
            'subject_id'   => $report->id,
            'causer_type'  => User::class,
            'causer_id'    => $actor->id,
            'created_at'   => now(),
        ]);

        return $report->load(['uploader', 'service']);
    }

    /**
     * Get performance reports for a service.
     */
    public function getReports(int $serviceId): Collection
    {
        return ServiceReport::where('client_service_id', $serviceId)
            ->with('uploader:id,name,email')
            ->latest()
            ->get();
    }
}
