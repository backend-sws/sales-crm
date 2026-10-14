<?php

namespace App\Console\Commands;

use App\Contracts\Services\ClientHealthScoreServiceInterface;
use Illuminate\Console\Command;

class RecalculateClientHealthScores extends Command
{
    protected $signature = 'clients:recalculate-health';

    protected $description = 'Recalculate composite 0-100 retention health scores for all active clients';

    public function handle(ClientHealthScoreServiceInterface $healthScoreService): int
    {
        $this->info('🩺 Recalculating all client health scores...');

        $count = $healthScoreService->recalculateAll();

        $this->info("✅ Successfully recalculated health scores for {$count} clients.");

        return self::SUCCESS;
    }
}
