<?php

namespace App\Contracts\Services;

use App\Models\ScheduledReport;
use App\Models\User;
use Illuminate\Support\Collection;

interface ScheduledReportServiceInterface
{
    /**
     * Generate a weekly digest report snapshot.
     */
    public function generateWeeklyDigest(User $subscriber): ScheduledReport;

    /**
     * Generate a monthly executive report snapshot.
     */
    public function generateMonthlyExecutive(User $admin): ScheduledReport;

    /**
     * Generate agent performance scorecard data and CSV format.
     */
    public function exportAgentReport(int $agentId, string $format = 'csv'): array;

    /**
     * Get all scheduled reports for a user or admin.
     */
    public function getSubscribedReports(?User $user = null): Collection;

    /**
     * Create or register a scheduled report subscription.
     */
    public function createSubscription(int $userId, string $reportType, string $frequency, ?array $parameters = null): ScheduledReport;

    /**
     * Execute/trigger generation for a specific report ID.
     */
    public function generateReport(int $reportId): ScheduledReport;
}
