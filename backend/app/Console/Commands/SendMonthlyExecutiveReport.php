<?php

namespace App\Console\Commands;

use App\Contracts\Services\NotificationChannelServiceInterface;
use App\Contracts\Services\ScheduledReportServiceInterface;
use App\Models\User;
use Illuminate\Console\Command;

class SendMonthlyExecutiveReport extends Command
{
    protected $signature = 'reports:send-monthly-executive';

    protected $description = 'Generate and distribute monthly executive telemetry briefing to super admins';

    public function handle(
        ScheduledReportServiceInterface $reportService,
        NotificationChannelServiceInterface $notificationService
    ): int {
        $this->info('📈 Generating Monthly Executive Briefing...');

        $admins = User::role('super_admin')->where('is_active', true)->get();

        if ($admins->isEmpty()) {
            $this->warn('No super administrators found.');
            return self::SUCCESS;
        }

        $count = 0;
        foreach ($admins as $admin) {
            $report = $reportService->generateMonthlyExecutive($admin);

            $notificationService->send(
                $admin,
                'monthly_executive',
                [
                    'title'       => 'Monthly Executive Intelligence Ready',
                    'message'     => "Your monthly pipeline revenue forecast and deal analysis for {$report->created_at->format('F Y')} is now ready.",
                    'report_id'   => $report->id,
                    'file_url'    => $report->file_url,
                    'report_type' => $report->report_type,
                ],
                'email'
            );

            $this->line("  ✓ Generated executive report for {$admin->name} ({$admin->email}) [Report #{$report->id}]");
            $count++;
        }

        $this->info("✅ Successfully generated {$count} monthly executive briefings.");

        return self::SUCCESS;
    }
}
