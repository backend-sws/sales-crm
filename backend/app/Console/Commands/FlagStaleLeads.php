<?php

namespace App\Console\Commands;

use App\Contracts\Services\LeadServiceInterface;
use App\Models\Lead;
use App\Models\LeadActivity;
use Illuminate\Console\Command;

class FlagStaleLeads extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leads:flag-stale {--days=7 : Inactivity threshold in days}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Flag leads inactive for 7+ days, record stale warning timeline activity, and recalculate intelligence scores';

    /**
     * Execute the console command.
     */
    public function handle(LeadServiceInterface $leadService): int
    {
        $days = (int) $this->option('days');
        $this->info("🔍 Scanning for leads with no customer activity in the last {$days} days...");

        $threshold = now()->subDays($days);

        $staleLeads = Lead::whereNotIn('status', ['won', 'lost'])
            ->whereNull('master_lead_id')
            ->where(function ($q) use ($threshold) {
                $q->where('last_activity_at', '<', $threshold)
                  ->orWhere(function ($sub) use ($threshold) {
                      $sub->whereNull('last_activity_at')
                          ->where('created_at', '<', $threshold);
                  });
            })
            ->with('assignedUser')
            ->get();

        $totalStale = $staleLeads->count();

        if ($totalStale === 0) {
            $this->info("✅ Awesome! No leads inactive for {$days}+ days found.");
            return self::SUCCESS;
        }

        $tableRows = [];

        foreach ($staleLeads as $lead) {
            $lastContact = $lead->last_activity_at ?? $lead->created_at;
            $daysInactive = round($lastContact->diffInDays(now()), 1);

            // Log activity warning in timeline
            LeadActivity::create([
                'lead_id'    => $lead->id,
                'user_id'    => null,
                'type'       => 'note',
                'payload'    => [
                    'stale_alert'   => true,
                    'days_inactive' => $daysInactive,
                    'message'       => "⚠️ Automated Warning: No touchpoint for {$daysInactive} days. Score penalised.",
                ],
                'created_at' => now(),
            ]);

            // Recalculate intelligence score (applies staleness penalty)
            $newScore = $leadService->recalculateScore($lead);

            if (count($tableRows) < 10) {
                $tableRows[] = [
                    $lead->id,
                    $lead->name,
                    $lead->company ?? '—',
                    $lead->assignedUser?->name ?? 'Unassigned',
                    "{$daysInactive} days",
                    "{$newScore} / 100",
                ];
            }
        }

        $this->table(
            ['ID', 'Lead Name', 'Company', 'Assigned Agent', 'Inactivity', 'Updated Score'],
            $tableRows
        );

        $this->info("Flagged {$totalStale} stale leads and updated their intelligence scores.");

        return self::SUCCESS;
    }
}
