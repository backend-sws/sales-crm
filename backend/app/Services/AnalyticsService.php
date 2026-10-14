<?php

namespace App\Services;

use App\Contracts\Services\AnalyticsServiceInterface;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AnalyticsService implements AnalyticsServiceInterface
{
    /**
     * Default conversion probability weights per stage.
     */
    protected array $stageWeights = [
        'new'          => 0.10,
        'contacted'    => 0.20,
        'interested'   => 0.35,
        'demo_meeting' => 0.50,
        'proposal'     => 0.65,
        'negotiation'  => 0.80,
        'won'          => 1.00,
        'lost'         => 0.00,
    ];

    /**
     * Executive overview telemetry with high-level pipeline and forecast KPIs.
     */
    public function getExecutiveOverview(array $filters = []): array
    {
        $forecast = $this->getRevenueForecast($filters);

        $totalLeads = Lead::whereNull('master_lead_id')->count();
        $wonLeads = Lead::whereNull('master_lead_id')->where('status', 'won')->count();
        $lostLeads = Lead::whereNull('master_lead_id')->where('status', 'lost')->count();
        $activeDeals = Lead::whereNull('master_lead_id')->whereNotIn('status', ['won', 'lost'])->count();

        $winRate = $totalLeads > 0 ? round(($wonLeads / $totalLeads) * 100, 1) : 0;
        $lossRate = $totalLeads > 0 ? round(($lostLeads / $totalLeads) * 100, 1) : 0;

        $avgDealSize = $wonLeads > 0 ? round($forecast['summary']['won_revenue'] / $wonLeads, 2) : 0;

        // Discipline: follow-ups completed vs overdue
        $totalFollowUps = FollowUp::count();
        $completedFollowUps = FollowUp::where('status', 'done')->count();
        $missedFollowUps = FollowUp::where('status', 'missed')
            ->orWhere(function ($q) {
                $q->where('status', 'pending')->where('scheduled_at', '<', now());
            })->count();

        $disciplineRate = $totalFollowUps > 0
            ? round(($completedFollowUps / $totalFollowUps) * 100, 1)
            : 100;

        return [
            'metrics' => [
                'total_leads'              => $totalLeads,
                'active_deals'             => $activeDeals,
                'won_deals_count'          => $wonLeads,
                'lost_deals_count'         => $lostLeads,
                'win_rate_percentage'      => $winRate,
                'loss_rate_percentage'     => $lossRate,
                'avg_deal_size'            => $avgDealSize,
                'follow_up_discipline_pct' => $disciplineRate,
            ],
            'forecast_summary' => $forecast['summary'],
            'funnel_breakdown' => $forecast['stages'],
        ];
    }

    /**
     * Stage-by-stage weighted revenue forecast (pipeline value × conversion probability).
     */
    public function getRevenueForecast(array $filters = []): array
    {
        $query = Lead::query()->whereNull('master_lead_id');

        if (! empty($filters['assigned_to'])) {
            $query->where('assigned_to', $filters['assigned_to']);
        }
        if (! empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        $leadsByStage = (clone $query)
            ->selectRaw('status, count(*) as count, sum(value) as total_value')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $stages = [];
        $rawPipelineValue = 0;
        $weightedForecastTotal = 0;
        $wonRevenue = 0;
        $lostRevenue = 0;

        foreach ($this->stageWeights as $stageKey => $weight) {
            $record = $leadsByStage->get($stageKey);
            $count = $record ? (int) $record->count : 0;
            $rawValue = $record ? (float) $record->total_value : 0.0;
            $weightedValue = round($rawValue * $weight, 2);

            if ($stageKey === 'won') {
                $wonRevenue += $rawValue;
            } elseif ($stageKey === 'lost') {
                $lostRevenue += $rawValue;
            } else {
                $rawPipelineValue += $rawValue;
                $weightedForecastTotal += $weightedValue;
            }

            $stages[$stageKey] = [
                'stage'             => $stageKey,
                'probability_pct'   => round($weight * 100),
                'lead_count'        => $count,
                'raw_value'         => $rawValue,
                'weighted_forecast' => $weightedValue,
            ];
        }

        $totalActiveWeighted = $weightedForecastTotal + $wonRevenue;

        return [
            'stages' => $stages,
            'summary' => [
                'raw_open_pipeline'        => $rawPipelineValue,
                'weighted_forecast_open'   => $weightedForecastTotal,
                'won_revenue'              => $wonRevenue,
                'lost_revenue'             => $lostRevenue,
                'total_expected_revenue'   => $totalActiveWeighted,
                'pipeline_confidence_pct'  => $rawPipelineValue > 0
                    ? round(($weightedForecastTotal / $rawPipelineValue) * 100, 1)
                    : 0,
            ],
        ];
    }

    /**
     * Detailed lost deal analysis grouped by reason, agent, and source.
     */
    public function getLostDealAnalysis(array $filters = []): array
    {
        $query = Lead::where('status', 'lost')->whereNull('master_lead_id');

        if (! empty($filters['date_from'])) {
            $query->where('created_at', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->where('created_at', '<=', $filters['date_to']);
        }

        $totalLostCount = (clone $query)->count();
        $totalLostValue = (float) (clone $query)->sum('value');

        // 1. Grouped by Lost Reason
        $byReason = (clone $query)
            ->selectRaw("COALESCE(lost_reason, 'Unspecified') as reason, count(*) as count, sum(value) as total_value")
            ->groupBy('reason')
            ->orderBy('count', 'desc')
            ->get()
            ->map(function ($item) use ($totalLostCount) {
                return [
                    'reason'            => $item->reason,
                    'count'             => (int) $item->count,
                    'total_value'       => (float) $item->total_value,
                    'share_percentage'  => $totalLostCount > 0 ? round(($item->count / $totalLostCount) * 100, 1) : 0,
                ];
            });

        // 2. Grouped by Agent
        $byAgent = (clone $query)
            ->with('assignedUser:id,name')
            ->selectRaw('assigned_to, count(*) as count, sum(value) as total_value')
            ->groupBy('assigned_to')
            ->orderBy('count', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'agent_id'    => $item->assigned_to,
                    'agent_name'  => $item->assignedUser?->name ?? 'Unassigned',
                    'count'       => (int) $item->count,
                    'total_value' => (float) $item->total_value,
                ];
            });

        // 3. Grouped by Lead Source
        $bySource = (clone $query)
            ->selectRaw("COALESCE(source, 'Unknown') as source_name, count(*) as count, sum(value) as total_value")
            ->groupBy('source_name')
            ->orderBy('count', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'source'      => $item->source_name,
                    'count'       => (int) $item->count,
                    'total_value' => (float) $item->total_value,
                ];
            });

        return [
            'total_lost_count' => $totalLostCount,
            'total_lost_value' => $totalLostValue,
            'by_reason'        => $byReason,
            'by_agent'         => $byAgent,
            'by_source'        => $bySource,
        ];
    }

    /**
     * Gamified sales team leaderboard with ranks, conversion rates, and badges.
     */
    public function getLeaderboard(array $filters = [], int $limit = 10): array
    {
        $agents = User::role(['sales_agent', 'sales_manager'])->get();

        if ($agents->isEmpty()) {
            $agents = User::all();
        }

        $leaderboard = $agents->map(function ($agent) {
            $totalLeads = Lead::where('assigned_to', $agent->id)->whereNull('master_lead_id')->count();
            $wonLeads = Lead::where('assigned_to', $agent->id)->whereNull('master_lead_id')->where('status', 'won')->count();
            $wonRevenue = (float) Lead::where('assigned_to', $agent->id)->whereNull('master_lead_id')->where('status', 'won')->sum('value');
            $activeLeads = Lead::where('assigned_to', $agent->id)->whereNull('master_lead_id')->whereNotIn('status', ['won', 'lost'])->count();

            $completedFollowUps = FollowUp::where('agent_id', $agent->id)->where('status', 'done')->count();
            $conversionRate = $totalLeads > 0 ? round(($wonLeads / $totalLeads) * 100, 1) : 0;
            $avgDealSize = $wonLeads > 0 ? round($wonRevenue / $wonLeads, 2) : 0;

            return [
                'agent_id'            => $agent->id,
                'name'                => $agent->name,
                'email'               => $agent->email,
                'phone'               => $agent->phone,
                'avatar'              => $agent->avatar,
                'total_leads'         => $totalLeads,
                'active_leads'        => $activeLeads,
                'won_count'           => $wonLeads,
                'won_revenue'         => $wonRevenue,
                'conversion_rate_pct' => $conversionRate,
                'completed_followups' => $completedFollowUps,
                'avg_deal_size'       => $avgDealSize,
            ];
        });

        // Sort by Won Revenue descending, then Won Count
        $sorted = $leaderboard->sort(function ($a, $b) {
            if ($b['won_revenue'] === $a['won_revenue']) {
                return $b['won_count'] <=> $a['won_count'];
            }
            return $b['won_revenue'] <=> $a['won_revenue'];
        })->values();

        // Assign ranks and gamification badges
        $ranked = $sorted->take($limit)->map(function ($item, $index) {
            $rank = $index + 1;
            $badges = [];

            if ($rank === 1) {
                $badges[] = ['label' => 'Gold Closer', 'icon' => '🥇', 'color' => 'amber'];
            } elseif ($rank === 2) {
                $badges[] = ['label' => 'Silver Closer', 'icon' => '🥈', 'color' => 'slate'];
            } elseif ($rank === 3) {
                $badges[] = ['label' => 'Bronze Closer', 'icon' => '🥉', 'color' => 'orange'];
            }

            if ($item['conversion_rate_pct'] >= 25 && $item['total_leads'] >= 2) {
                $badges[] = ['label' => 'Conversion Star', 'icon' => '⚡', 'color' => 'indigo'];
            }

            if ($item['completed_followups'] >= 5) {
                $badges[] = ['label' => 'Follow-up Master', 'icon' => '🛡️', 'color' => 'emerald'];
            }

            return array_merge($item, [
                'rank'   => $rank,
                'badges' => $badges,
            ]);
        });

        return $ranked->toArray();
    }

    /**
     * Deep-dive scorecard metrics for a single agent.
     */
    public function getAgentPerformanceReport(int $agentId): array
    {
        $agent = User::findOrFail($agentId);
        $totalLeads = Lead::where('assigned_to', $agentId)->whereNull('master_lead_id')->count();
        $wonLeads = Lead::where('assigned_to', $agentId)->where('status', 'won')->whereNull('master_lead_id')->count();
        $lostLeads = Lead::where('assigned_to', $agentId)->where('status', 'lost')->whereNull('master_lead_id')->count();
        $wonRevenue = (float) Lead::where('assigned_to', $agentId)->where('status', 'won')->sum('value');
        $pipelineValue = (float) Lead::where('assigned_to', $agentId)->whereNotIn('status', ['won', 'lost'])->sum('value');

        $followUpsDone = FollowUp::where('agent_id', $agentId)->where('status', 'done')->count();
        $followUpsMissed = FollowUp::where('agent_id', $agentId)->where('status', 'missed')->count();

        return [
            'agent' => [
                'id'    => $agent->id,
                'name'  => $agent->name,
                'email' => $agent->email,
            ],
            'metrics' => [
                'total_leads'         => $totalLeads,
                'won_count'           => $wonLeads,
                'lost_count'          => $lostLeads,
                'won_revenue'         => $wonRevenue,
                'open_pipeline_value' => $pipelineValue,
                'conversion_rate_pct' => $totalLeads > 0 ? round(($wonLeads / $totalLeads) * 100, 1) : 0,
                'follow_ups_done'     => $followUpsDone,
                'follow_ups_missed'   => $followUpsMissed,
            ],
        ];
    }

    /**
     * Conversion funnel drop-off analytics.
     */
    public function getConversionFunnel(array $filters = []): array
    {
        $orderedStages = ['new', 'contacted', 'interested', 'demo_meeting', 'proposal', 'negotiation', 'won'];
        $counts = Lead::whereNull('master_lead_id')
            ->selectRaw('status, count(*) as count, sum(value) as total_value')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $funnel = [];
        $prevCount = null;

        foreach ($orderedStages as $stage) {
            $item = $counts->get($stage);
            $count = $item ? (int) $item->count : 0;
            $val = $item ? (float) $item->total_value : 0;

            $dropOffPct = 0;
            if ($prevCount !== null && $prevCount > 0) {
                $dropOffPct = round((($prevCount - $count) / $prevCount) * 100, 1);
            }

            $funnel[] = [
                'stage'        => $stage,
                'count'        => $count,
                'total_value'  => $val,
                'drop_off_pct' => max(0, $dropOffPct),
            ];

            $prevCount = $count;
        }

        return $funnel;
    }
}
