<?php

namespace App\Services;

use App\Contracts\Services\ClientHealthScoreServiceInterface;
use App\Models\Client;
use App\Models\ClientHealthScore;
use App\Models\Invoice;
use App\Models\ServiceRequest;
use Illuminate\Database\Eloquent\Collection;

class ClientHealthScoreService implements ClientHealthScoreServiceInterface
{
    /**
     * Compute composite 0-100 client health score.
     */
    public function calculateClientHealth(Client $client): ClientHealthScore
    {
        // 1. Ticket Score (30% weight): open / breached tickets reduce score
        $openTicketsCount = ServiceRequest::where('client_id', $client->id)
            ->whereIn('status', ['open', 'in_progress'])
            ->count();

        $breachedTicketsCount = ServiceRequest::where('client_id', $client->id)
            ->whereIn('status', ['open', 'in_progress'])
            ->where('sla_deadline', '<', now())
            ->count();

        $ticketScore = 100.00;
        if ($breachedTicketsCount > 0) {
            $ticketScore = max(20.00, 100.00 - ($breachedTicketsCount * 25));
        } elseif ($openTicketsCount > 3) {
            $ticketScore = max(50.00, 100.00 - (($openTicketsCount - 3) * 10));
        }

        // 2. Payment Score (25% weight): overdue invoices
        $overdueInvoices = Invoice::where('client_id', $client->id)
            ->whereIn('status', ['sent', 'partially_paid', 'overdue'])
            ->where('due_date', '<', now())
            ->count();

        $paymentScore = 100.00;
        if ($overdueInvoices > 0) {
            $paymentScore = max(10.00, 100.00 - ($overdueInvoices * 30));
        }

        // 3. Engagement Score (20% weight): onboarding and portal usage
        $engagementScore = 70.00;
        if ($client->onboarding_completed) {
            $engagementScore += 20.00;
        }
        $confirmedTickets = ServiceRequest::where('client_id', $client->id)
            ->where('status', 'confirmed')
            ->count();
        if ($confirmedTickets > 0) {
            $engagementScore = min(100.00, $engagementScore + 10.00);
        }

        // 4. Feedback & Response Score (25% weight)
        $feedbackScore = 90.00;
        $responseScore = 85.00;

        // Composite Weighted Score
        // Weight: Tickets 30%, Payments 25%, Engagement 20%, Feedback 15%, Response 10%
        $composite = round(
            ($ticketScore * 0.30) +
            ($paymentScore * 0.25) +
            ($engagementScore * 0.20) +
            ($feedbackScore * 0.15) +
            ($responseScore * 0.10),
            1
        );

        $status = $composite >= 70 ? 'healthy' : ($composite >= 40 ? 'at_risk' : 'churning');

        return ClientHealthScore::updateOrCreate(
            ['client_id' => $client->id],
            [
                'score'            => $composite,
                'ticket_score'     => $ticketScore,
                'payment_score'    => $paymentScore,
                'engagement_score' => $engagementScore,
                'feedback_score'   => $feedbackScore,
                'response_score'   => $responseScore,
                'status'           => $status,
                'calculated_at'    => now(),
            ]
        );
    }

    /**
     * Recalculate health score for all clients.
     */
    public function recalculateAll(): int
    {
        $clients = Client::all();
        $count = 0;

        foreach ($clients as $client) {
            $this->calculateClientHealth($client);
            $count++;
        }

        return $count;
    }

    /**
     * Get clients currently at risk or churning.
     */
    public function getAtRiskClients(int $threshold = 40): Collection
    {
        return Client::whereHas('healthScore', function ($q) use ($threshold) {
            $q->where('score', '<=', $threshold);
        })->with(['healthScore', 'accountManager'])->get();
    }
}
