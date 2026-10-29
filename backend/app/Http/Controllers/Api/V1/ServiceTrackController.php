<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\ServiceTrackServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Service Track", description: "Lightweight recurring service management, requests and monthly reporting")]
class ServiceTrackController extends BaseApiController
{
    public function __construct(
        protected ServiceTrackServiceInterface $serviceTrackService
    ) {}

    #[OA\Get(
        path: "/api/v1/services/{id}/tickets",
        summary: "Get tickets for a client service",
        security: [["bearerAuth" => []]],
        tags: ["Service Track"]
    )]
    public function tickets(Request $request, int $id): JsonResponse
    {
        $filters = $request->only(['status', 'priority']);
        $tickets = $this->serviceTrackService->getTickets($id, $filters);

        return $this->successResponse($tickets, 'Service tickets retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/services/{id}/tickets",
        summary: "Create a new service request / ticket",
        security: [["bearerAuth" => []]],
        tags: ["Service Track"]
    )]
    public function createTicket(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'required|string',
            'priority'    => 'nullable|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $ticket = $this->serviceTrackService->createTicket($id, $validated, $request->user());

        return $this->createdResponse($ticket, "Ticket '{$ticket->ticket_number}' created successfully.");
    }

    #[OA\Patch(
        path: "/api/v1/tickets/{id}/status",
        summary: "Update ticket status (Open -> In Progress -> Done -> Closed)",
        security: [["bearerAuth" => []]],
        tags: ["Service Track"]
    )]
    public function updateTicketStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:open,in_progress,done,confirmed,closed',
        ]);

        $ticket = $this->serviceTrackService->updateTicketStatus($id, $validated['status'], $request->user());

        return $this->successResponse($ticket, "Ticket status transitioned to '{$ticket->status}'.");
    }

    #[OA\Post(
        path: "/api/v1/tickets/{id}/accept",
        summary: "Super Admin accepts genuine ticket, assigns developer, and creates task on Kanban board",
        security: [["bearerAuth" => []]],
        tags: ["Service Track"]
    )]
    public function acceptTicket(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'assigned_to'     => 'required|exists:users,id',
            'project_id'      => 'nullable|exists:projects,id',
            'priority'        => 'nullable|in:low,medium,high,urgent',
            'kanban_status'   => 'nullable|in:backlog,in_progress',
            'story_points'    => 'nullable|integer|min:1|max:100',
            'estimated_hours' => 'nullable|numeric|min:0.5',
            'due_date'        => 'nullable|date',
        ]);

        $ticket = $this->serviceTrackService->acceptTicket($id, $validated, $request->user());

        return $this->successResponse($ticket, "Ticket '{$ticket->ticket_number}' accepted and routed to Kanban Board!");
    }

    #[OA\Post(
        path: "/api/v1/tickets/{id}/reject",
        summary: "Super Admin rejects out-of-scope or invalid ticket",
        security: [["bearerAuth" => []]],
        tags: ["Service Track"]
    )]
    public function rejectTicket(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $ticket = $this->serviceTrackService->rejectTicket($id, $validated['reason'] ?? null, $request->user());

        return $this->successResponse($ticket, "Ticket '{$ticket->ticket_number}' declined and closed.");
    }

    #[OA\Post(
        path: "/api/v1/tickets/{id}/confirm",
        summary: "Client confirms that ticket is completed satisfactorily",
        security: [["bearerAuth" => []]],
        tags: ["Service Track"]
    )]
    public function confirmTicket(Request $request, int $id): JsonResponse
    {
        $ticket = $this->serviceTrackService->confirmTicket($id, $request->user());

        return $this->successResponse($ticket, "Ticket '{$ticket->ticket_number}' confirmed completed by client.");
    }

    #[OA\Post(
        path: "/api/v1/services/{id}/reports",
        summary: "Upload periodic performance telemetry report for service track",
        security: [["bearerAuth" => []]],
        tags: ["Service Track"]
    )]
    public function uploadReport(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'title'    => 'required|string|max:255',
            'period'   => 'nullable|string|max:100',
            'file_url' => 'nullable|string|max:500',
            'metrics'  => 'nullable|array',
        ]);

        $report = $this->serviceTrackService->uploadReport($id, $validated, $request->user());

        return $this->createdResponse($report, "Performance report '{$report->title}' uploaded successfully.");
    }

    #[OA\Get(
        path: "/api/v1/services/{id}/reports",
        summary: "List all periodic performance reports for service track",
        security: [["bearerAuth" => []]],
        tags: ["Service Track"]
    )]
    public function reports(int $id): JsonResponse
    {
        $reports = $this->serviceTrackService->getReports($id);

        return $this->successResponse($reports, 'Service performance reports retrieved.');
    }
}
