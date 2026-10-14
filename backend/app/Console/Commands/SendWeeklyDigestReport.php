<?php

namespace App\Console\Commands;

use App\Contracts\Services\NotificationChannelServiceInterface;
use App\Contracts\Services\ScheduledReportServiceInterface;
use App\Models\User;
use Illuminate\Console\Command;

class SendWeeklyDigestReport extends Command
{
    protected $signature = 'reports:send-weekly-digest';

    protected $description = 'Generate and distribute weekly performance digest reports to sales managers and super admins';

    public function handle(
        ScheduledReportServiceInterface $reportService,
        NotificationChannelServiceInterface $notificationService
    ): int {
        $this->info('📊 Generating Weekly Digest Intelligence Briefing...');

        $recipients = User::role(['sales_manager', 'super_admin'])->where('is_active', true)->get();

        if ($recipients->isEmpty()) {
            $this->warn('No sales managers or super admins found.');
            return self::SUCCESS;
        }

        $count = 0;
        foreach ($recipients as $recipient) {
            $report = $reportService->generateWeeklyDigest($recipient);
            
            // Dispatch notification alert via NotificationService
            $notificationService->send(
                $recipient,
                'weekly_digest',
                [
                    'title'       => 'Weekly Digest Briefing Ready',
                    'message'     => "Your weekly sales intelligence summary for {$report->created_at->format('M d, Y')} has been prepared.",
                    'report_id'   => $report->id,
                    'file_url'    => $report->file_url,
                    'report_type' => $report->report_type,
                ],
                'email'
            );

            $this->line("  ✓ Generated weekly digest for {$recipient->name} ({$recipient->email}) [Report #{$report->id}]");
            $count++;
        }

        $this->info("✅ Successfully generated {$count} weekly digests.");

        return self::SUCCESS;
    }
}
