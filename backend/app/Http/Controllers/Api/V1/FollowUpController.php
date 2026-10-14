<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\FollowUpServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Http\Requests\Api\V1\FollowUp\CompleteFollowUpRequest;
use App\Http\Requests\Api\V1\FollowUp\StoreFollowUpRequest;
use App\Models\FollowUp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[
    OA\Tag(name: "FollowUps", description: "Follow-up scheduling, execution and chaining")
]
class FollowUpController extends BaseApiController
{
    public function __construct(
        protected FollowUpServiceInterface $followUpService
    ) {}

    #[OA\Get(
        path: "/api/v1/follow-ups",
        summary: "List all follow-ups with filters",
        security: [["bearerAuth" => []]],
        tags: ["FollowUps"],
        responses: [
            new OA\Response(response: 200, description: "Follow-ups retrieved")
        ]
    )]
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['lead_id', 'agent_id', 'status', 'type']);
        $followUps = $this->followUpService->getFollowUps($filters, $request->user());

        return $this->successResponse($followUps, 'Follow-ups retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/follow-ups/today",
        summary: "Get today's pending follow-ups",
        security: [["bearerAuth" => []]],
        tags: ["FollowUps"],
        responses: [
            new OA\Response(response: 200, description: "Today's follow-ups retrieved")
        ]
    )]
    public function today(Request $request): JsonResponse
    {
        $followUps = $this->followUpService->getTodayFollowUps($request->user());

        return $this->successResponse($followUps, "Today's follow-ups retrieved successfully.");
    }

    #[OA\Get(
        path: "/api/v1/follow-ups/overdue",
        summary: "Get overdue pending follow-ups",
        security: [["bearerAuth" => []]],
        tags: ["FollowUps"],
        responses: [
            new OA\Response(response: 200, description: "Overdue follow-ups retrieved")
        ]
    )]
    public function overdue(Request $request): JsonResponse
    {
        $followUps = $this->followUpService->getOverdueFollowUps($request->user());

        return $this->successResponse($followUps, 'Overdue follow-ups retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/follow-ups/summary",
        summary: "Get summary counts of overdue, today, upcoming, and completed follow-ups",
        security: [["bearerAuth" => []]],
        tags: ["FollowUps"],
        responses: [
            new OA\Response(response: 200, description: "Follow-up summary counts")
        ]
    )]
    public function summary(Request $request): JsonResponse
    {
        $summary = $this->followUpService->getSummary($request->user());

        return $this->successResponse($summary, 'Follow-up summary counts retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/follow-ups",
        summary: "Schedule a new follow-up",
        security: [["bearerAuth" => []]],
        tags: ["FollowUps"],
        responses: [
            new OA\Response(response: 201, description: "Follow-up scheduled successfully")
        ]
    )]
    public function store(StoreFollowUpRequest $request): JsonResponse
    {
        $followUp = $this->followUpService->scheduleFollowUp($request->validated(), $request->user());

        return $this->createdResponse($followUp, 'Follow-up scheduled successfully.');
    }

    #[OA\Patch(
        path: "/api/v1/follow-ups/{id}/complete",
        summary: "Complete a follow-up and optionally schedule next follow-up",
        security: [["bearerAuth" => []]],
        tags: ["FollowUps"],
        responses: [
            new OA\Response(response: 200, description: "Follow-up marked complete")
        ]
    )]
    public function complete(CompleteFollowUpRequest $request, int $id): JsonResponse
    {
        $followUp = FollowUp::find($id);

        if (! $followUp) {
            return $this->notFoundResponse("Follow-up with ID {$id} not found.");
        }

        $completed = $this->followUpService->completeFollowUp($followUp, $request->validated(), $request->user());

        return $this->successResponse($completed, 'Follow-up marked complete and outcome recorded.');
    }
}
