<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\ImpersonationServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Admin Impersonation", description: "Super Admin secure user impersonation sessions")]
class ImpersonationController extends BaseApiController
{
    public function __construct(
        protected ImpersonationServiceInterface $impersonationService
    ) {}

    #[OA\Post(
        path: "/api/v1/admin/impersonate/{user}",
        summary: "Start impersonating another CRM user (Super Admin only)",
        security: [["bearerAuth" => []]],
        tags: ["Admin Impersonation"]
    )]
    public function start(Request $request, string|int $user): JsonResponse
    {
        $userId = (int) $user;
        $admin = $request->user();

        if (! $admin->hasRole('super_admin')) {
            return $this->forbiddenResponse('Only Super Administrators are authorized to impersonate users.');
        }

        $target = User::find($userId);
        if (! $target) {
            return $this->notFoundResponse("Target user with ID {$userId} not found.");
        }

        try {
            $result = $this->impersonationService->startImpersonation(
                $admin,
                $target,
                $request->ip(),
                $request->userAgent(),
                $request->input('reason')
            );

            return $this->successResponse($result, "Impersonation session initiated for {$target->name}.");
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    #[OA\Post(
        path: "/api/v1/admin/impersonate/exit",
        summary: "Exit current impersonation session and return to admin",
        security: [["bearerAuth" => []]],
        tags: ["Admin Impersonation"]
    )]
    public function exit(Request $request): JsonResponse
    {
        $logId = (int) $request->input('impersonation_log_id');
        $this->impersonationService->stopImpersonation($logId, $request->user());

        return $this->successResponse(null, 'Impersonation session terminated successfully.');
    }

    #[OA\Get(
        path: "/api/v1/admin/impersonation-logs",
        summary: "Get history of user impersonations",
        security: [["bearerAuth" => []]],
        tags: ["Admin Impersonation"]
    )]
    public function logs(Request $request): JsonResponse
    {
        if (! $request->user()->hasRole('super_admin')) {
            return $this->forbiddenResponse('Unauthorized.');
        }

        $limit = (int) $request->get('limit', 20);
        $logs = $this->impersonationService->getLogs($limit);

        return $this->successResponse($logs, 'Impersonation audit logs retrieved successfully.');
    }
}
