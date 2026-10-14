<?php

namespace App\Services;

use App\Contracts\Services\AnalyticsServiceInterface;
use App\Contracts\Services\ScheduledReportServiceInterface;
use App\Models\ActivityLog;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\ScheduledReport;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class ScheduledReportService implements ScheduledReportServiceInterface
{
    public function __construct(
        protected AnalyticsServiceInterface $analyticsService
    ) {}

    /**
     * Generate a weekly digest report snapshot.
     */
    public function generateWeeklyDigest(User $subscriber): ScheduledReport
    {
        $startDate = now()->startOfWeek();
        $endDate = now()->endOfWeek();

        $newLeadsCount = Lead::whereBetween('created_at', [$startDate, $endDate])->count();
        $wonLeads = Lead::where('status', 'won')->whereBetween('updated_at', [$startDate, $endDate])->get();
        $wonRevenue = (float) $wonLeads->sum('value');
        $overdueFollowUps = FollowUp::where('status', 'pending')->where('scheduled_at', '<', now())->count();
        
        $topAgent = User::role('sales_agent')->get()->map(function ($agent) use ($startDate, $endDate) {
            $revenue = (float) Lead::where('assigned_to', $agent->id)
                ->where('status', 'won')
                ->whereBetween('updated_at', [$startDate, $endDate])
                ->sum('value');
            return [
                'name'    => $agent->name,
                'revenue' => $revenue,
            ];
        })->sortByDesc('revenue')->first();

        $digestData = [
            'period'             => "{$startDate->toDateString()} to {$endDate->toDateString()}",
            'generated_at'       => now()->toIso8601String(),
            'new_leads'          => $newLeadsCount,
            'won_deals_count'    => $wonLeads->count(),
            'won_revenue'        => $wonRevenue,
            'overdue_followups'  => $overdueFollowUps,
            'top_sales_champion' => $topAgent ? "{$topAgent['name']} (₹" . number_format($topAgent['revenue']) . ")" : 'None',
        ];

        // Format CSV content
        $csvLines = [
            "Weekly Digest Briefing - SalesCRM Enterprise",
            "Period: {$digestData['period']}",
            "Generated At: {$digestData['generated_at']}",
            "",
            "Metric,Value",
            "New Inbound Leads,{$digestData['new_leads']}",
            "Won Deals Count,{$digestData['won_deals_count']}",
            "Closed Won Revenue (INR),{$digestData['won_revenue']}",
            "Pending Overdue Follow-ups,{$digestData['overdue_followups']}",
            "Top Sales Champion,\"{$digestData['top_sales_champion']}\"",
        ];
        $csvContent = implode("\r\n", $csvLines);

        $fileName = "reports/weekly_digest_" . now()->format('Y_m_d_His') . "_{$subscriber->id}.csv";
        Storage::disk('local')->put($fileName, $csvContent);

        $report = ScheduledReport::create([
            'user_id'           => $subscriber->id,
            'report_type'       => 'weekly_digest',
            'frequency'         => 'weekly',
            'last_generated_at' => now(),
            'file_url'          => "/api/v1/reports/scheduled/download/" . basename($fileName),
            'status'            => 'ready',
            'parameters'        => $digestData,
        ]);

        ActivityLog::create([
            'log_name'     => 'reports',
            'description'  => "Generated weekly digest report for {$subscriber->name}",
            'subject_type' => ScheduledReport::class,
            'subject_id'   => $report->id,
            'causer_type'  => User::class,
            'causer_id'    => $subscriber->id,
            'created_at'   => now(),
        ]);

        return $report;
    }

    /**
     * Generate a monthly executive report snapshot.
     */
    public function generateMonthlyExecutive(User $admin): ScheduledReport
    {
        $overview = $this->analyticsService->getExecutiveOverview();
        $forecast = $this->analyticsService->getRevenueForecast();

        $monthlyData = [
            'period'               => now()->startOfMonth()->toDateString() . " to " . now()->toDateString(),
            'pipeline_value'       => $overview['open_pipeline_value'] ?? 0,
            'weighted_forecast'    => $forecast['weighted_open_forecast'] ?? 0,
            'won_revenue'          => $overview['total_won_revenue'] ?? 0,
            'lost_revenue'         => $overview['total_lost_revenue'] ?? 0,
            'conversion_rate_pct'  => $overview['win_rate_percentage'] ?? 0,
            'forecast_confidence'  => $forecast['forecast_confidence_index'] ?? 0,
        ];

        $csvLines = [
            "Monthly Executive Intelligence Report - SalesCRM Enterprise",
            "Period: {$monthlyData['period']}",
            "Prepared For: {$admin->name} ({$admin->email})",
            "Generated: " . now()->toIso8601String(),
            "",
            "Executive KPI,Metric Value",
            "Active Pipeline Value (INR),{$monthlyData['pipeline_value']}",
            "Weighted Risk-Adjusted Forecast (INR),{$monthlyData['weighted_forecast']}",
            "Closed Won Revenue (INR),{$monthlyData['won_revenue']}",
            "Lost Opportunities Value (INR),{$monthlyData['lost_revenue']}",
            "Overall Win Rate %,{$monthlyData['conversion_rate_pct']}%",
            "Pipeline Confidence Index %,{$monthlyData['forecast_confidence']}%",
        ];
        $csvContent = implode("\r\n", $csvLines);

        $fileName = "reports/monthly_executive_" . now()->format('Y_m_d_His') . "_{$admin->id}.csv";
        Storage::disk('local')->put($fileName, $csvContent);

        $report = ScheduledReport::create([
            'user_id'           => $admin->id,
            'report_type'       => 'monthly_executive',
            'frequency'         => 'monthly',
            'last_generated_at' => now(),
            'file_url'          => "/api/v1/reports/scheduled/download/" . basename($fileName),
            'status'            => 'ready',
            'parameters'        => $monthlyData,
        ]);

        ActivityLog::create([
            'log_name'     => 'reports',
            'description'  => "Generated monthly executive briefing report for {$admin->name}",
            'subject_type' => ScheduledReport::class,
            'subject_id'   => $report->id,
            'causer_type'  => User::class,
            'causer_id'    => $admin->id,
            'created_at'   => now(),
        ]);

        return $report;
    }

    /**
     * Generate agent performance scorecard data and CSV format.
     */
    public function exportAgentReport(int $agentId, string $format = 'csv'): array
    {
        $scorecard = $this->analyticsService->getAgentPerformanceReport($agentId);
        $agent = $scorecard['agent'];
        $metrics = $scorecard['metrics'];

        // Get agent's leads
        $leads = Lead::where('assigned_to', $agentId)
            ->whereNull('master_lead_id')
            ->orderBy('status')
            ->get();

        $csvLines = [
            "Agent Performance Scorecard & Pipeline Report",
            "Agent Name: {$agent['name']}",
            "Agent Email: {$agent['email']}",
            "Exported At: " . now()->toIso8601String(),
            "",
            "SUMMARY METRICS",
            "Total Leads Assigned,{$metrics['total_leads']}",
            "Won Deals Count,{$metrics['won_count']}",
            "Lost Deals Count,{$metrics['lost_count']}",
            "Won Revenue (INR),{$metrics['won_revenue']}",
            "Open Pipeline Value (INR),{$metrics['open_pipeline_value']}",
            "Conversion Rate %,{$metrics['conversion_rate_pct']}%",
            "Follow-ups Completed,{$metrics['follow_ups_done']}",
            "Follow-ups Missed,{$metrics['follow_ups_missed']}",
            "",
            "LEAD PIPELINE BREAKDOWN",
            "Lead ID,Title,Company,Contact,Phone,Status,Priority,Value (INR),Score,Created At",
        ];

        foreach ($leads as $lead) {
            $company = str_replace('"', '""', $lead->company_name ?? 'N/A');
            $title = str_replace('"', '""', $lead->title);
            $contact = str_replace('"', '""', $lead->contact_name);
            $csvLines[] = "{$lead->id},\"{$title}\",\"{$company}\",\"{$contact}\",\"{$lead->phone}\",{$lead->status},{$lead->priority},{$lead->value},{$lead->ai_score},{$lead->created_at->toDateString()}";
        }

        $filename = "agent_report_{$agentId}_" . now()->format('Ymd_His') . ".csv";

        return [
            'filename' => $filename,
            'content'  => implode("\r\n", $csvLines),
            'metrics'  => $metrics,
            'agent'    => $agent,
        ];
    }

    /**
     * Get all scheduled reports for a user or admin.
     */
    public function getSubscribedReports(?User $user = null): Collection
    {
        $query = ScheduledReport::with('user:id,name,email')->latest();

        if ($user && ! $user->hasRole('super_admin')) {
            $query->where('user_id', $user->id);
        }

        return $query->get();
    }

    /**
     * Create or register a scheduled report subscription.
     */
    public function createSubscription(int $userId, string $reportType, string $frequency, ?array $parameters = null): ScheduledReport
    {
        $user = User::findOrFail($userId);

        if ($reportType === 'monthly_executive') {
            return $this->generateMonthlyExecutive($user);
        }

        return $this->generateWeeklyDigest($user);
    }

    /**
     * Execute/trigger generation for a specific report ID.
     */
    public function generateReport(int $reportId): ScheduledReport
    {
        $report = ScheduledReport::findOrFail($reportId);
        $user = $report->user;

        if ($report->report_type === 'monthly_executive') {
            return $this->generateMonthlyExecutive($user);
        }

        return $this->generateWeeklyDigest($user);
    }
}
