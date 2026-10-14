<?php

namespace App\Console\Commands;

use App\Contracts\Services\NotificationChannelServiceInterface;
use App\Models\FollowUp;
use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Console\Command;

class CheckOverdueFollowUps extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'followups:check-overdue {--escalate-hours=24 : Threshold hours for manager escalation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scan overdue follow-ups, alert assigned agents, and escalate items overdue > 24h to Sales Managers';

    /**
     * Execute the console command.
     */
    public function handle(NotificationChannelServiceInterface $notificationService): int
    {
        $this->info('🔍 Scanning for overdue follow-ups...');

        $escalateHours = (int) $this->option('escalate-hours');
        $now = now();
        $escalationThreshold = $now->copy()->subHours($escalateHours);

        // Fetch all pending follow-ups scheduled in the past
        $overdueFollowUps = FollowUp::with(['lead', 'agent'])
            ->where('status', 'pending')
            ->where('scheduled_at', '<', $now)
            ->get();

        $totalOverdue = $overdueFollowUps->count();

        if ($totalOverdue === 0) {
            $this->info('✅ Clean slate! No overdue follow-ups found.');
            return self::SUCCESS;
        }

        $managers = User::role(['sales_manager', 'super_admin'])->get();

        $remindedCount = 0;
        $escalatedCount = 0;

        foreach ($overdueFollowUps as $fu) {
            $isEscalated = $fu->scheduled_at < $escalationThreshold;

            if ($isEscalated) {
                // Escalate to all managers
                foreach ($managers as $manager) {
                    $notificationService->notifyOverdueFollowUp($fu, $manager, true);
                }

                // Log timeline activity if not already logged recently
                LeadActivity::create([
                    'lead_id'    => $fu->lead_id,
                    'user_id'    => null,
                    'type'       => 'follow_up',
                    'payload'    => [
                        'status'         => 'overdue_escalation',
                        'scheduled_at'   => $fu->scheduled_at->toIso8601String(),
                        'hours_overdue'  => round($now->diffInHours($fu->scheduled_at, true), 1),
                        'escalated_to'   => 'sales_manager',
                        'agent_name'     => $fu->agent?->name,
                    ],
                    'created_at' => now(),
                ]);

                $escalatedCount++;
            } else {
                // Regular agent reminder
                if ($fu->agent) {
                    $notificationService->notifyOverdueFollowUp($fu, $fu->agent, false);
                    $remindedCount++;
                }
            }
        }

        $this->table(
            ['Metric', 'Count'],
            [
                ['Total Overdue Follow-ups', $totalOverdue],
                ['Reminders Sent to Agents', $remindedCount],
                ["Escalations to Managers (>{$escalateHours}h)", $escalatedCount],
            ]
        );

        $this->info("Completed overdue checks. {$remindedCount} agent alerts and {$escalatedCount} manager escalations logged.");

        return self::SUCCESS;
    }
}
