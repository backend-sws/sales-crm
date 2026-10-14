<?php

namespace App\Contracts\Services;

use App\Models\ServiceReport;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface ServiceTrackServiceInterface
{
    /**
     * Get tickets for a client service.
     */
    public function getTickets(int $serviceId, array $filters = []): Collection;

    /**
     * Create a new ticket (by client or account manager).
     */
    public function createTicket(int $serviceId, array $data, User $actor): ServiceRequest;

    /**
     * Transition ticket status (Open -> In Progress -> Done -> Confirmed).
     */
    public function updateTicketStatus(int $ticketId, string $status, User $actor): ServiceRequest;

    /**
     * Client confirms ticket resolution.
     */
    public function confirmTicket(int $ticketId, User $clientUser): ServiceRequest;

    /**
     * Upload periodic performance report.
     */
    public function uploadReport(int $serviceId, array $data, User $actor): ServiceReport;

    /**
     * Get performance reports for a service.
     */
    public function getReports(int $serviceId): Collection;
}
