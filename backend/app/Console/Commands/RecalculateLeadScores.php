<?php

namespace App\Console\Commands;

use App\Contracts\Services\LeadServiceInterface;
use App\Models\Lead;
use Illuminate\Console\Command;

class RecalculateLeadScores extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leads:recalculate-scores';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate dynamic intelligence scores (0–100) for all active CRM leads';

    /**
     * Execute the console command.
     */
    public function handle(LeadServiceInterface $leadService): int
    {
        $this->info('Starting Lead Intelligence Score recalculation...');

        $leads = Lead::whereNull('master_lead_id')->get();
        $total = $leads->count();

        if ($total === 0) {
            $this->warn('No active leads found in the database.');
            return self::SUCCESS;
        }

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $hot = 0;
        $warm = 0;
        $cool = 0;
        $cold = 0;

        foreach ($leads as $lead) {
            $score = $leadService->recalculateScore($lead);
            if ($score >= 80) $hot++;
            elseif ($score >= 50) $warm++;
            elseif ($score >= 25) $cool++;
            else $cold++;

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->table(
            ['Tier', 'Score Range', 'Count', 'Percentage'],
            [
                ['🔥 Hot', '80–100', $hot, round(($hot / $total) * 100, 1).'%'],
                ['⚡ Warm', '50–79', $warm, round(($warm / $total) * 100, 1).'%'],
                ['❄️ Cool', '25–49', $cool, round(($cool / $total) * 100, 1).'%'],
                ['⚠️ Cold / At-Risk', '0–24', $cold, round(($cold / $total) * 100, 1).'%'],
                ['Total Evaluated', '0–100', $total, '100%'],
            ]
        );

        $this->info("Successfully recalculated intelligence scores for {$total} leads.");

        return self::SUCCESS;
    }
}
