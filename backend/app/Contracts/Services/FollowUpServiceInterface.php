<?php

namespace App\Contracts\Services;

use App\Models\FollowUp;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface FollowUpServiceInterface
{
    /**
     * Get follow-ups with filters.
     */
    public function getFollowUps(array $filters = [], ?User $user = null): Collection;

    /**
     * Get pending follow-ups scheduled for today.
     */
    public function getTodayFollowUps(?User $user = null): Collection;

    /**
     * Get overdue follow-ups (scheduled before today and still pending).
     */
    public function getOverdueFollowUps(?User $user = null): Collection;

    /**
     * Schedule a new follow-up for a lead.
     */
    public function scheduleFollowUp(array $data, ?User $actor = null): FollowUp;

    /**
     * Complete a follow-up with outcome notes, and optionally chain the next follow-up.
     */
    public function completeFollowUp(FollowUp $followUp, array $outcomeData, ?User $actor = null): FollowUp;

    /**
     * Get summary counts for follow-ups (overdue, today, upcoming, completed_today).
     */
    public function getSummary(?User $user = null): array;
}
