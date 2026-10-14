<?php

namespace App\Console\Commands;

use App\Contracts\Services\NotificationChannelServiceInterface;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Console\Command;

class SendDailyDigest extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'followups:send-daily-digest';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send morning daily digest summary via WhatsApp/Email to all active sales agents';

    /**
     * Execute the console command.
     */
    public function handle(NotificationChannelServiceInterface $notificationService): int
    {
        $this->info('🌅 Preparing morning sales daily digests...');

        $agents = User::role(['sales_agent', 'sales_manager'])->get();

        if ($agents->isEmpty()) {
            $this->warn('No sales agents found to receive daily digest.');
            return self::SUCCESS;
        }

        $tableRows = [];

        foreach ($agents as $agent) {
            $todayCount = FollowUp::where('agent_id', $agent->id)
                ->where('status', 'pending')
                ->whereDate('scheduled_at', today())
                ->count();

            $overdueCount = FollowUp::where('agent_id', $agent->id)
                ->where('status', 'pending')
                ->where('scheduled_at', '<', now())
                ->count();

            $hotLeadsCount = Lead::where('assigned_to', $agent->id)
                ->where('priority', 'hot')
                ->whereNotIn('status', ['won', 'lost'])
                ->whereNull('master_lead_id')
                ->count();

            $summary = [
                'today_count'     => $todayCount,
                'overdue_count'   => $overdueCount,
                'hot_leads_count' => $hotLeadsCount,
                'date'            => today()->toDateString(),
            ];

            $notificationService->notifyDailyDigest($agent, $summary);

            $tableRows[] = [
                $agent->id,
                $agent->name,
                $agent->email,
                $todayCount,
                $overdueCount,
                $hotLeadsCount,
                'Dispatched ✅',
            ];
        }

        $this->table(
            ['ID', 'Agent', 'Email', "Today's Follow-ups", 'Overdue Items', 'Hot Leads', 'Status'],
            $tableRows
        );

        $this->info("Successfully dispatched daily briefing digests to {$agents->count()} agents.");

        return self::SUCCESS;
    }
}
