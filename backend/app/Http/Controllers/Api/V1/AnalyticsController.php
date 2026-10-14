<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\AnalyticsServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Analytics", description: "Executive telemetry, revenue forecasting, lost deal analysis, and sales leaderboard")]
class AnalyticsController extends BaseApiController
{
    public function __construct(
        protected AnalyticsServiceInterface $analyticsService
    ) {}

    #[OA\Get(
        path: "/api/v1/analytics/overview",
        summary: "Get executive dashboard overview KPIs",
        security: [["bearerAuth" => []]],
        tags: ["Analytics"]
    )]
    public function overview(Request $request): JsonResponse
    {
        $filters = $request->only(['date_from', 'date_to', 'assigned_to']);
        $data = $this->analyticsService->getExecutiveOverview($filters);

        return $this->successResponse($data, 'Executive overview telemetry retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/analytics/forecast",
        summary: "Get stage-by-stage weighted revenue forecast",
        security: [["bearerAuth" => []]],
        tags: ["Analytics"]
    )]
    public function forecast(Request $request): JsonResponse
    {
        $filters = $request->only(['date_from', 'date_to', 'assigned_to']);
        $data = $this->analyticsService->getRevenueForecast($filters);

        return $this->successResponse($data, 'Revenue forecast retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/analytics/lost-deal-analysis",
        summary: "Get lost deal pattern breakdown by reason, agent, and source",
        security: [["bearerAuth" => []]],
        tags: ["Analytics"]
    )]
    public function lostDealAnalysis(Request $request): JsonResponse
    {
        $filters = $request->only(['date_from', 'date_to']);
        $data = $this->analyticsService->getLostDealAnalysis($filters);

        return $this->successResponse($data, 'Lost deal analysis retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/analytics/leaderboard",
        summary: "Get gamified sales team leaderboard",
        security: [["bearerAuth" => []]],
        tags: ["Analytics"]
    )]
    public function leaderboard(Request $request): JsonResponse
    {
        $limit = (int) $request->get('limit', 10);
        $filters = $request->only(['date_from', 'date_to']);
        $data = $this->analyticsService->getLeaderboard($filters, $limit);

        return $this->successResponse($data, 'Sales team leaderboard retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/analytics/funnel",
        summary: "Get stage-by-stage conversion funnel drop-off analytics",
        security: [["bearerAuth" => []]],
        tags: ["Analytics"]
    )]
    public function funnel(Request $request): JsonResponse
    {
        $filters = $request->only(['date_from', 'date_to']);
        $data = $this->analyticsService->getConversionFunnel($filters);

        return $this->successResponse($data, 'Conversion funnel analytics retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/analytics/agents/{id}",
        summary: "Get single agent performance scorecard",
        security: [["bearerAuth" => []]],
        tags: ["Analytics"]
    )]
    public function agentScorecard(int $id): JsonResponse
    {
        $data = $this->analyticsService->getAgentPerformanceReport($id);

        return $this->successResponse($data, 'Agent scorecard retrieved successfully.');
    }
}
