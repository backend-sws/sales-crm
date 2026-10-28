<?php

namespace App\Contracts\Services;

use App\Models\FeedbackResponse;
use App\Models\PerformanceScore;
use App\Models\User;
use Illuminate\Support\Collection;

interface PerformanceServiceInterface
{
    /**
     * Submit client rating and multi-parameter review for a task.
     *
     * @param int $taskId
     * @param array $data
     * @param User $clientUser
     * @return FeedbackResponse
     */
    public function submitTaskFeedback(int $taskId, array $data, User $clientUser): FeedbackResponse;

    /**
     * Dispute an unfair client review.
     *
     * @param int $feedbackId
     * @param string $reason
     * @param User $developer
     * @return FeedbackResponse
     */
    public function disputeFeedback(int $feedbackId, string $reason, User $developer): FeedbackResponse;

    /**
     * Resolve developer feedback dispute (Admin action).
     *
     * @param int $feedbackId
     * @param bool $exclude
     * @param string $reason
     * @param User $admin
     * @return FeedbackResponse
     */
    public function resolveDispute(int $feedbackId, bool $exclude, string $reason, User $admin): FeedbackResponse;

    /**
     * Calculate and store monthly 0-100 performance score for a developer.
     *
     * @param int $developerId
     * @param string $period YYYY-MM
     * @return PerformanceScore
     */
    public function calculateMonthlyScore(int $developerId, string $period): PerformanceScore;

    /**
     * Get performance telemetry and score breakdown for developer.
     *
     * @param int $developerId
     * @param string|null $period
     * @return array
     */
    public function getDeveloperPerformance(int $developerId, ?string $period = null): array;

    /**
     * Get company-wide developer performance leaderboard.
     *
     * @param string|null $period
     * @return Collection
     */
    public function getLeaderboard(?string $period = null): Collection;
}
