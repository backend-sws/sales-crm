<?php

namespace App\Contracts\Services;

interface AnalyticsServiceInterface
{
    /**
     * Executive overview telemetry with high-level pipeline and forecast KPIs.
     */
    public function getExecutiveOverview(array $filters = []): array;

    /**
     * Stage-by-stage weighted revenue forecast (pipeline value × conversion probability).
     */
    public function getRevenueForecast(array $filters = []): array;

    /**
     * Detailed lost deal analysis grouped by reason, agent, and source.
     */
    public function getLostDealAnalysis(array $filters = []): array;

    /**
     * Gamified sales team leaderboard with ranks, conversion rates, and badges.
     */
    public function getLeaderboard(array $filters = [], int $limit = 10): array;

    /**
     * Deep-dive scorecard metrics for a single agent.
     */
    public function getAgentPerformanceReport(int $agentId): array;

    /**
     * Conversion funnel drop-off analytics.
     */
    public function getConversionFunnel(array $filters = []): array;
}
