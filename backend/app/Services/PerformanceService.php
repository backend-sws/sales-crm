<?php

namespace App\Services;

use App\Contracts\Services\PerformanceServiceInterface;
use App\Models\FeedbackResponse;
use App\Models\NotificationLog;
use App\Models\PerformanceScore;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class PerformanceService implements PerformanceServiceInterface
{
    /**
     * Submit client rating and multi-parameter review for a task.
     */
    public function submitTaskFeedback(int $taskId, array $data, User $clientUser): FeedbackResponse
    {
        $task = Task::with('project')->findOrFail($taskId);
        $developerId = $task->assignee_id ?? $task->project->pm_id;

        $rating = (float) ($data['rating'] ?? 5.0);

        $feedback = FeedbackResponse::create([
            'task_id'          => $task->id,
            'milestone_id'     => $task->milestone_id,
            'project_id'       => $task->project_id,
            'developer_id'     => $developerId,
            'client_user_id'   => $clientUser->id,
            'rating'           => $rating,
            'quality'          => (int) ($data['quality'] ?? 5),
            'communication'    => (int) ($data['communication'] ?? 5),
            'timeliness'       => (int) ($data['timeliness'] ?? 5),
            'understanding'    => (int) ($data['understanding'] ?? 5),
            'would_work_again' => $data['would_work_again'] ?? true,
            'comment'          => $data['comment'] ?? null,
            'is_excluded'      => false,
        ]);

        // Update task client rating
        $task->update([
            'client_rating'   => (int) round($rating),
            'client_feedback' => $data['comment'] ?? null,
        ]);

        // If rating is <= 2, trigger alert to Super Admin
        if ($rating <= 2.0) {
            NotificationLog::create([
                'user_id' => $developerId,
                'channel' => 'system',
                'title'   => 'Low Client Rating Alert',
                'message' => "Client {$clientUser->name} submitted a {$rating}-star rating for Task #{$task->id} ({$task->title}): " . ($data['comment'] ?? 'No comment'),
                'status'  => 'sent',
            ]);
        }

        // Recalculate developer's current month score
        $period = Carbon::now()->format('Y-m');
        $this->calculateMonthlyScore($developerId, $period);

        return $feedback->load(['developer:id,name', 'clientUser:id,name']);
    }

    /**
     * Dispute an unfair client review.
     */
    public function disputeFeedback(int $feedbackId, string $reason, User $developer): FeedbackResponse
    {
        $feedback = FeedbackResponse::findOrFail($feedbackId);

        if ($feedback->developer_id !== $developer->id && ! $developer->hasRole('super-admin')) {
            throw new AccessDeniedHttpException('You can only dispute feedback directed to your work.');
        }

        $feedback->update([
            'exclusion_reason' => "DISPUTED BY DEV: {$reason}",
        ]);

        return $feedback;
    }

    /**
     * Resolve developer feedback dispute (Admin action).
     */
    public function resolveDispute(int $feedbackId, bool $exclude, string $reason, User $admin): FeedbackResponse
    {
        $feedback = FeedbackResponse::findOrFail($feedbackId);

        $feedback->update([
            'is_excluded'      => $exclude,
            'exclusion_reason' => $exclude ? "EXCLUDED BY ADMIN ({$admin->name}): {$reason}" : "DISPUTE REJECTED ({$admin->name}): {$reason}",
        ]);

        // Recalculate score
        $period = $feedback->created_at->format('Y-m');
        $this->calculateMonthlyScore($feedback->developer_id, $period);

        return $feedback;
    }

    /**
     * Calculate and store monthly 0-100 performance score for a developer.
     */
    public function calculateMonthlyScore(int $developerId, string $period): PerformanceScore
    {
        $startDate = Carbon::createFromFormat('Y-m', $period)->startOfMonth();
        $endDate = Carbon::createFromFormat('Y-m', $period)->endOfMonth();

        // 1. Client Ratings (30%)
        $feedbacks = FeedbackResponse::where('developer_id', $developerId)
            ->where('is_excluded', false)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $clientAvgRating = $feedbacks->count() > 0 ? (float) $feedbacks->avg('rating') : 4.5;
        $clientScore = min(100, max(0, ($clientAvgRating / 5.0) * 100));

        // 2. Tasks & On-time Delivery (20%)
        $tasks = Task::where('assignee_id', $developerId)
            ->whereBetween('completed_at', [$startDate, $endDate])
            ->get();

        $sampleSize = $tasks->count();

        $onTimeCount = 0;
        $reworkCount = 0;
        $estimateDiffs = [];

        foreach ($tasks as $task) {
            // Check on-time
            if ($task->due_date && $task->completed_at) {
                if ($task->completed_at->startOfDay()->lte($task->due_date->endOfDay())) {
                    $onTimeCount++;
                }
            } else {
                $onTimeCount++;
            }

            // Rework
            if ($task->rework_count > 0) {
                $reworkCount++;
            }

            // Estimation accuracy
            if ($task->estimated_hours > 0 && $task->actual_hours > 0) {
                $accuracy = 100 - min(100, abs($task->actual_hours - $task->estimated_hours) / $task->estimated_hours * 100);
                $estimateDiffs[] = max(0, $accuracy);
            }
        }

        $onTimeRate = $sampleSize > 0 ? ($onTimeCount / $sampleSize) * 100 : 90.0;
        $lowReworkRate = $sampleSize > 0 ? ((($sampleSize - $reworkCount) / $sampleSize) * 100) : 95.0;
        $pmReviewScore = 88.0; // Standard PM baseline or review score
        $estimateScore = ! empty($estimateDiffs) ? array_sum($estimateDiffs) / count($estimateDiffs) : 85.0;

        // Weighted formula:
        // Score = (0.30 * ClientRating) + (0.20 * OnTime) + (0.20 * LowRework) + (0.15 * PMReview) + (0.10 * EstAccuracy) + (0.05 * ResponseTime: default 90)
        $finalScore = (0.30 * $clientScore)
                    + (0.20 * $onTimeRate)
                    + (0.20 * $lowReworkRate)
                    + (0.15 * $pmReviewScore)
                    + (0.10 * $estimateScore)
                    + (0.05 * 90.0);

        $finalScore = round(min(100, max(0, $finalScore)), 2);

        return PerformanceScore::updateOrCreate(
            ['developer_id' => $developerId, 'period' => $period],
            [
                'final_score'    => $finalScore,
                'client_score'   => round($clientScore, 2),
                'ontime_score'   => round($onTimeRate, 2),
                'rework_score'   => round($lowReworkRate, 2),
                'pm_score'       => round($pmReviewScore, 2),
                'estimate_score' => round($estimateScore, 2),
                'sample_size'    => $sampleSize,
                'breakdown_json' => [
                    'feedback_count'   => $feedbacks->count(),
                    'tasks_completed'  => $sampleSize,
                    'on_time_count'    => $onTimeCount,
                    'rework_count'     => $reworkCount,
                    'formula_weights'  => [
                        'client_rating' => '30%',
                        'on_time'       => '20%',
                        'low_rework'    => '20%',
                        'pm_review'     => '15%',
                        'est_accuracy'  => '10%',
                        'response_time' => '5%',
                    ],
                ],
            ]
        );
    }

    /**
     * Get performance telemetry and score breakdown for developer.
     */
    public function getDeveloperPerformance(int $developerId, ?string $period = null): array
    {
        $currentPeriod = $period ?: Carbon::now()->format('Y-m');
        $score = PerformanceScore::where('developer_id', $developerId)
            ->where('period', $currentPeriod)
            ->first();

        if (! $score) {
            $score = $this->calculateMonthlyScore($developerId, $currentPeriod);
        }

        // Recent feedback
        $feedbacks = FeedbackResponse::where('developer_id', $developerId)
            ->with(['clientUser:id,name', 'task:id,title'])
            ->latest()
            ->limit(10)
            ->get();

        // 6-month historical trend
        $history = PerformanceScore::where('developer_id', $developerId)
            ->orderBy('period', 'desc')
            ->limit(6)
            ->get()
            ->reverse()
            ->values();

        return [
            'developer_id' => $developerId,
            'period'       => $currentPeriod,
            'score'        => $score,
            'history'      => $history,
            'feedbacks'    => $feedbacks,
        ];
    }

    /**
     * Get company-wide developer performance leaderboard.
     */
    public function getLeaderboard(?string $period = null): Collection
    {
        $currentPeriod = $period ?: Carbon::now()->format('Y-m');

        return PerformanceScore::where('period', $currentPeriod)
            ->with('developer:id,name,email')
            ->orderByDesc('final_score')
            ->limit(20)
            ->get();
    }
}
