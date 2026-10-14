<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Response;

#[OA\Tag(name: "Audit Trail", description: "Immutable system activity audit logs")]
class AuditLogController extends BaseApiController
{
    #[OA\Get(
        path: "/api/v1/admin/audit-logs",
        summary: "Get paginated immutable system audit trail (Super Admin only)",
        security: [["bearerAuth" => []]],
        tags: ["Audit Trail"]
    )]
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasRole('super_admin')) {
            return $this->forbiddenResponse('Only Super Administrators can view system audit logs.');
        }

        $query = $this->buildFilteredQuery($request);
        $perPage = (int) $request->get('per_page', 25);
        $logs = $query->paginate($perPage);

        return $this->paginatedResponse($logs, 'System audit logs retrieved successfully.');
    }

    #[OA\Get(
        path: "/api/v1/admin/audit-logs/export",
        summary: "Export system audit trail as CSV for compliance archival",
        security: [["bearerAuth" => []]],
        tags: ["Audit Trail"]
    )]
    public function export(Request $request): Response
    {
        if (! $request->user()->hasRole('super_admin')) {
            return $this->forbiddenResponse('Only Super Administrators can export audit trail.');
        }

        $logs = $this->buildFilteredQuery($request)->limit(2000)->get();

        $csvLines = [
            "Log ID,Timestamp,Category,Description,Subject Type,Subject ID,Causer Type,Causer ID,Properties JSON",
        ];

        foreach ($logs as $log) {
            $desc = str_replace('"', '""', $log->description);
            $subject = str_replace('"', '""', $log->subject_type ?? '');
            $props = str_replace('"', '""', json_encode($log->properties ?? []));
            $csvLines[] = "{$log->id},{$log->created_at->toIso8601String()},\"{$log->log_name}\",\"{$desc}\",\"{$subject}\",{$log->subject_id},\"{$log->causer_type}\",{$log->causer_id},\"{$props}\"";
        }

        $filename = "audit_trail_" . now()->format('Ymd_His') . ".csv";

        return response(implode("\r\n", $csvLines), 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control'       => 'no-store, no-cache',
        ]);
    }

    protected function buildFilteredQuery(Request $request)
    {
        $query = ActivityLog::query()->latest('created_at');

        if ($request->filled('log_name')) {
            $query->where('log_name', $request->get('log_name'));
        }

        if ($request->filled('causer_id')) {
            $query->where('causer_id', $request->get('causer_id'));
        }

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->get('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->get('date_to'));
        }

        return $query;
    }
}
