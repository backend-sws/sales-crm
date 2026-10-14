<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\NotificationChannelServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Notifications", description: "CRM notification alerts, logs, and simulated delivery")]
class NotificationController extends BaseApiController
{
    public function __construct(
        protected NotificationChannelServiceInterface $notificationService
    ) {}

    #[OA\Get(
        path: "/api/v1/notifications/recent",
        summary: "Get recent notification audit logs",
        security: [["bearerAuth" => []]],
        tags: ["Notifications"],
        responses: [
            new OA\Response(response: 200, description: "Recent notification logs retrieved")
        ]
    )]
    public function recent(Request $request): JsonResponse
    {
        $limit = (int) $request->get('limit', 20);
        $logs = $this->notificationService->getRecentLogs($request->user(), $limit);

        return $this->successResponse($logs, 'Recent notifications retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/notifications/test",
        summary: "Send a test notification alert",
        security: [["bearerAuth" => []]],
        tags: ["Notifications"],
        responses: [
            new OA\Response(response: 200, description: "Test notification dispatched")
        ]
    )]
    public function test(Request $request): JsonResponse
    {
        $request->validate([
            'channel' => 'nullable|string|in:whatsapp,email,database,auto',
            'type'    => 'nullable|string',
            'message' => 'nullable|string',
        ]);

        $channel = $request->get('channel', 'whatsapp');
        $user = $request->user();

        $log = $this->notificationService->send($user, 'test_alert', [
            'title'   => '🧪 SalesCRM Test Notification',
            'message' => $request->get('message', 'This is a verified test alert from the SalesCRM Notification Engine.'),
        ], $channel);

        return $this->successResponse($log, "Test notification dispatched via {$channel}.");
    }
}
