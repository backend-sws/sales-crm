<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\DashboardServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Dashboard", description: "CRM aggregate analytics, funnel stage metrics and stats")]
class DashboardController extends BaseApiController
{
    public function __construct(
        protected DashboardServiceInterface $dashboardService
    ) {}

    #[OA\Get(
        path: "/api/v1/dashboard",
        summary: "Get CRM dashboard metrics and pipeline funnel telemetry",
        security: [["bearerAuth" => []]],
        tags: ["Dashboard"],
        responses: [
            new OA\Response(
                response: 200,
                description: "Dashboard metrics and breakdown retrieved"
            )
        ]
    )]
    public function index(): JsonResponse
    {
        $metrics = $this->dashboardService->getDashboardMetrics();

        return $this->successResponse($metrics, 'Dashboard metrics retrieved successfully.');
    }
}
