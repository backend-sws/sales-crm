<?php

namespace App\Contracts\Services;

use App\Models\Lead;
use App\Models\User;

interface AutoAssignmentServiceInterface
{
    /**
     * Assign a lead using a specific strategy (round_robin, load_balanced, product_wise).
     */
    public function assign(Lead $lead, string $strategy = 'load_balanced'): ?User;

    /**
     * Get next sales agent using round-robin rotation.
     */
    public function getNextRoundRobinAgent(): ?User;

    /**
     * Get sales agent with minimum number of open leads.
     */
    public function getLeastLoadedAgent(): ?User;

    /**
     * Get specialist sales agent for specific products, or fallback to load-balanced.
     */
    public function getProductSpecialistAgent(array $productIds = []): ?User;
}
