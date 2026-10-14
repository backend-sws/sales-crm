<?php

namespace App\Services;

use App\Contracts\Services\DashboardServiceInterface;
use App\Models\Lead;

class DashboardService implements DashboardServiceInterface
{
    /**
     * Get aggregate CRM metrics, funnel stats, and recent activities.
     */
    public function getDashboardMetrics(): array
    {
        $totalLeads = Lead::count();
        $totalPipelineValue = (float) Lead::sum('value');
        $wonValue = (float) Lead::where('status', 'won')->sum('value');
        $wonCount = Lead::where('status', 'won')->count();
        $conversionRate = $totalLeads > 0 ? round(($wonCount / $totalLeads) * 100, 1) : 0;

        $statusCounts = Lead::query()
            ->selectRaw('status, count(*) as count, sum(value) as total_value')
            ->groupBy('status')
            ->get()
            ->keyBy('status')
            ->map(fn ($item) => [
                'count' => (int) $item->count,
                'total_value' => (float) $item->total_value,
            ]);

        $recentLeads = Lead::with('assignedUser')
            ->latest()
            ->limit(5)
            ->get();

        return [
            'summary' => [
                'total_leads' => $totalLeads,
                'total_pipeline_value' => $totalPipelineValue,
                'won_deals_value' => $wonValue,
                'conversion_rate_percentage' => $conversionRate,
            ],
            'funnel_breakdown' => $statusCounts,
            'recent_leads' => $recentLeads,
        ];
    }
}
