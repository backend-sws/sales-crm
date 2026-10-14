<?php

namespace App\Contracts\Services;

interface DashboardServiceInterface
{
    /**
     * Get aggregate CRM metrics, funnel stats, and recent activities.
     */
    public function getDashboardMetrics(): array;
}
