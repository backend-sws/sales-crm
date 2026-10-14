<?php

namespace App\Services;

use App\Contracts\Services\ServiceTrackServiceInterface;
use App\Models\ActivityLog;
use App\Models\ClientService;
use App\Models\ServiceReport;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class ServiceTrackService implements ServiceTrackServiceInterface
{
    /**
     * Get tickets for a client service.
     */
    public function getTickets(int $serviceId, array $filters = []): Collection
    {
        $query = ServiceRequest::where('client_service_id', $serviceId)
            ->with(['creator:id,name,email', 'assignee:id,name,email'])
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
        $ticket = ServiceRequest::findOrFail($ticketId);

        $update = ['status' => $status];
        if ($status === 'done' && ! $ticket->completed_at) {
            $update['completed_at'] = now();
        }

        $ticket->update($update);

        ActivityLog::create([
            'log_name'     => 'tickets',
            'description'  => "Transitioned ticket {$ticket->ticket_number} status to {$status}",
            'subject_type' => ServiceRequest::class,
            'subject_id'   => $ticket->id,
            'causer_type'  => User::class,
            'causer_id'    => $actor->id,
            'created_at'   => now(),
        ]);

        return $ticket->fresh(['creator', 'assignee']);
    }

    /**
     * Client confirms ticket resolution.
     */
    public function confirmTicket(int $ticketId, User $clientUser): ServiceRequest
    {
        $ticket = ServiceRequest::findOrFail($ticketId);

        $ticket->update([
            'status'       => 'confirmed',
            'confirmed_at' => now(),
        ]);

        ActivityLog::create([
            'log_name'     => 'tickets',
            'description'  => "Client {$clientUser->name} confirmed ticket {$ticket->ticket_number} completed",
            'subject_type' => ServiceRequest::class,
            'subject_id'   => $ticket->id,
            'causer_type'  => User::class,
            'causer_id'    => $clientUser->id,
            'created_at'   => now(),
        ]);

        return $ticket->fresh(['creator', 'assignee']);
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
