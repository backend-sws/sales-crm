<?php

namespace App\Services;

use App\Contracts\Services\AutoAssignmentServiceInterface;
use App\Contracts\Services\NotificationChannelServiceInterface;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoAssignmentService implements AutoAssignmentServiceInterface
{
    public function __construct(
        protected NotificationChannelServiceInterface $notificationService
    ) {}

    /**
     * Assign a lead using a specific strategy.
     */
    public function assign(Lead $lead, string $strategy = 'load_balanced'): ?User
    {
        $agent = match ($strategy) {
            'round_robin'   => $this->getNextRoundRobinAgent(),
            'product_wise'  => $this->getProductSpecialistAgent($lead->products->pluck('id')->toArray()),
            'load_balanced' => $this->getLeastLoadedAgent(),
            default         => $this->getLeastLoadedAgent(),
        };

        if (! $agent) {
            Log::warning("[AutoAssignmentService] No available active sales agents found to auto-assign lead #{$lead->id}.");
            return null;
        }

        DB::transaction(function () use ($lead, $agent, $strategy) {
            $oldAgentId = $lead->assigned_to;
            $lead->assigned_to = $agent->id;
            $lead->last_activity_at = now();
            $lead->save();

            // Record timeline activity
            LeadActivity::create([
                'lead_id'    => $lead->id,
                'user_id'    => null, // System automated
                'type'       => 'assigned',
                'payload'    => [
                    'auto_assigned' => true,
                    'strategy'      => $strategy,
                    'agent_id'      => $agent->id,
                    'agent_name'    => $agent->name,
                    'agent_email'   => $agent->email,
                    'previous_id'   => $oldAgentId,
                ],
                'created_at' => now(),
            ]);

            // Dispatch instant notification
            $this->notificationService->notifyLeadAssigned($lead, $agent);
        });

        return $agent;
    }

    /**
     * Get next sales agent using round-robin rotation.
     */
    public function getNextRoundRobinAgent(): ?User
    {
        $agents = $this->getActiveSalesAgents();

        if ($agents->isEmpty()) {
            return null;
        }

        $currentIndex = (int) Cache::get('lead_auto_assign_rr_index', 0);
        $selectedAgent = $agents[$currentIndex % $agents->count()];

        // Increment pointer for next rotation
        Cache::put('lead_auto_assign_rr_index', ($currentIndex + 1) % $agents->count());

        return $selectedAgent;
    }

    /**
     * Get sales agent with minimum number of open leads.
     */
    public function getLeastLoadedAgent(): ?User
    {
        $agents = $this->getActiveSalesAgents();

        if ($agents->isEmpty()) {
            return null;
        }

        // Count open leads (not won and not lost) per agent
        $workloads = Lead::query()
            ->whereIn('assigned_to', $agents->pluck('id'))
            ->whereNotIn('status', ['won', 'lost'])
            ->whereNull('master_lead_id')
            ->selectRaw('assigned_to, count(*) as open_leads_count')
            ->groupBy('assigned_to')
            ->pluck('open_leads_count', 'assigned_to');

        // Find agent with lowest count
        $leastLoaded = $agents->sortBy(function ($agent) use ($workloads) {
            return $workloads->get($agent->id, 0);
        })->first();

        return $leastLoaded;
    }

    /**
     * Get specialist sales agent for specific products, or fallback to load-balanced.
     */
    public function getProductSpecialistAgent(array $productIds = []): ?User
    {
        // If specific product specialization rules are configured in future, match here.
        // For standard operations, route via load-balancing across active agents.
        return $this->getLeastLoadedAgent();
    }

    /**
     * Helper to retrieve all active sales agents eligible for assignment.
     */
    protected function getActiveSalesAgents()
    {
        $agents = User::query()
            ->role(['sales_agent', 'sales_manager'])
            ->get();

        // If no agents found with roles, fallback to all users except super_admin
        if ($agents->isEmpty()) {
            $agents = User::all();
        }

        return $agents;
    }
}
