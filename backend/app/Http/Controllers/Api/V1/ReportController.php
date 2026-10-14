<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\ScheduledReportServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Response;

#[OA\Tag(name: "Reports", description: "Scheduled reporting, digests, and analytics data export")]
class ReportController extends BaseApiController
{
    public function __construct(
        protected ScheduledReportServiceInterface $reportService
    ) {}

    #[OA\Get(
        path: "/api/v1/reports/scheduled",
        summary: "List all scheduled reports and executive digest subscriptions",
        security: [["bearerAuth" => []]],
        tags: ["Reports"]
    )]
    public function index(Request $request): JsonResponse
    {
        $reports = $this->reportService->getSubscribedReports($request->user());

        return $this->successResponse($reports, 'Scheduled reports retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/reports/scheduled",
        summary: "Subscribe to or immediately trigger a scheduled executive report",
        security: [["bearerAuth" => []]],
        tags: ["Reports"]
    )]
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'report_type' => 'required|string|in:weekly_digest,monthly_executive,agent_performance',
            'frequency'   => 'nullable|string|in:weekly,monthly,on_demand',
            'parameters'  => 'nullable|array',
        ]);

        $report = $this->reportService->createSubscription(
            $request->user()->id,
            $validated['report_type'],
            $validated['frequency'] ?? 'weekly',
            $validated['parameters'] ?? []
        );

        return $this->createdResponse($report, "Report '{$validated['report_type']}' successfully generated and queued.");
    }

    #[OA\Post(
        path: "/api/v1/reports/scheduled/{id}/generate",
        summary: "Trigger immediate on-demand regeneration of a scheduled report",
        security: [["bearerAuth" => []]],
        tags: ["Reports"]
    )]
    public function generate(int $id): JsonResponse
    {
        $report = $this->reportService->generateReport($id);

        return $this->successResponse($report, 'Report refreshed and updated successfully.');
    }

    #[OA\Get(
        path: "/api/v1/reports/agent/{id}/export",
        summary: "Export agent performance scorecard as CSV",
        security: [["bearerAuth" => []]],
        tags: ["Reports"]
    )]
    public function exportAgent(Request $request, int $id): Response
    {
        $format = $request->get('format', 'csv');
        $export = $this->reportService->exportAgentReport($id, $format);

        if ($format === 'json') {
            return $this->successResponse($export, 'Agent scorecard exported.');
        }

        return response($export['content'], 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$export['filename']}\"",
            'Cache-Control'       => 'no-store, no-cache',
        ]);
    }

    #[OA\Get(
        path: "/api/v1/reports/scheduled/download/{filename}",
        summary: "Download generated CSV/report artifact",
        security: [["bearerAuth" => []]],
        tags: ["Reports"]
    )]
    public function download(string $filename): Response
    {
        // Sanitize filename to avoid path traversal
        $safeName = basename($filename);
        $path = "reports/{$safeName}";

        if (! Storage::disk('local')->exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'Report file not found or has expired.',
            ], 404);
        }

        $content = Storage::disk('local')->get($path);

        return response($content, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$safeName}\"",
            'Cache-Control'       => 'no-store, no-cache',
        ]);
    }
}
