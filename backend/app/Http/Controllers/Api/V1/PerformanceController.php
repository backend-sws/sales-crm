<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\PerformanceServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Developer Performance & Feedback", description: "Objective 0-100 developer score calculation, client ratings, and dispute resolution")]
class PerformanceController extends BaseApiController
{
    public function __construct(
        protected PerformanceServiceInterface $performanceService
    ) {}

    #[OA\Post(
        path: "/api/v1/feedback/tasks/{id}",
        summary: "Client submits rating & review for completed task",
        security: [["bearerAuth" => []]],
        tags: ["Developer Performance & Feedback"]
    )]
    public function submitTaskFeedback(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'rating'           => 'required|numeric|min:1|max:5',
            'quality'          => 'nullable|integer|min:1|max:5',
            'communication'    => 'nullable|integer|min:1|max:5',
            'timeliness'       => 'nullable|integer|min:1|max:5',
            'understanding'    => 'nullable|integer|min:1|max:5',
            'would_work_again' => 'nullable|boolean',
            'comment'          => 'nullable|string|max:1000',
        ]);

        $feedback = $this->performanceService->submitTaskFeedback($id, $validated, $request->user());

        return $this->createdResponse($feedback, 'Task feedback submitted successfully.');
    }

    #[OA\Post(
        path: "/api/v1/feedback/{id}/dispute",
        summary: "Developer disputes an unfair review",
        security: [["bearerAuth" => []]],
        tags: ["Developer Performance & Feedback"]
    )]
    public function dispute(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|min:5|max:1000',
        ]);

        $feedback = $this->performanceService->disputeFeedback($id, $validated['reason'], $request->user());

        return $this->successResponse($feedback, 'Dispute recorded and flagged for Admin review.');
    }

    #[OA\Post(
        path: "/api/v1/admin/feedback/{id}/resolve-dispute",
        summary: "Super Admin resolves dispute (exclude/include in score)",
        security: [["bearerAuth" => []]],
        tags: ["Developer Performance & Feedback"]
    )]
    public function resolveDispute(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'exclude' => 'required|boolean',
            'reason'  => 'required|string|max:500',
        ]);

        $feedback = $this->performanceService->resolveDispute($id, $validated['exclude'], $validated['reason'], $request->user());

        return $this->successResponse($feedback, 'Dispute resolved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/developers/{id}/performance",
        summary: "Get developer score breakdown and feedback history",
        security: [["bearerAuth" => []]],
        tags: ["Developer Performance & Feedback"]
    )]
    public function developerPerformance(Request $request, int $id): JsonResponse
    {
        $period = $request->query('period');
        $performance = $this->performanceService->getDeveloperPerformance($id, $period);

        return $this->successResponse($performance, 'Developer performance telemetry retrieved.');
    }

    #[OA\Get(
        path: "/api/v1/admin/performance/leaderboard",
        summary: "Get top developer performance leaderboard",
        security: [["bearerAuth" => []]],
        tags: ["Developer Performance & Feedback"]
    )]
    public function leaderboard(Request $request): JsonResponse
    {
        $period = $request->query('period');
        $leaderboard = $this->performanceService->getLeaderboard($period);

        return $this->successResponse($leaderboard, 'Performance leaderboard retrieved.');
    }
}
