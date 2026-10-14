<?php

namespace App\Contracts\Services;

use App\Models\Client;
use App\Models\ClientHealthScore;
use Illuminate\Database\Eloquent\Collection;

interface ClientHealthScoreServiceInterface
{
    /**
     * Compute composite 0-100 client health score.
     */
    public function calculateClientHealth(Client $client): ClientHealthScore;

    /**
     * Recalculate health score for all clients.
     */
    public function recalculateAll(): int;

    /**
     * Get clients currently at risk or churning.
     */
    public function getAtRiskClients(int $threshold = 40): Collection;
}
