<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\LeadImportServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Http\Requests\Api\V1\Import\PreviewImportRequest;
use App\Http\Requests\Api\V1\Import\ProcessImportRequest;
use App\Models\LeadImport;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

#[
    OA\Tag(name: "LeadImports", description: "Bulk CSV/Excel lead import wizard and deduplication")
]
class LeadImportController extends BaseApiController
{
    public function __construct(
        protected LeadImportServiceInterface $importService
    ) {}

    #[OA\Post(
        path: "/api/v1/leads/import/preview",
        summary: "Upload spreadsheet and preview columns for mapping",
        security: [["bearerAuth" => []]],
        tags: ["LeadImports"],
        responses: [
            new OA\Response(response: 200, description: "Spreadsheet parsed and headers extracted")
        ]
    )]
    public function preview(PreviewImportRequest $request): JsonResponse
    {
        $preview = $this->importService->previewFile($request->file('file'));

        return $this->successResponse($preview, 'File uploaded and parsed successfully.');
    }

    #[OA\Post(
        path: "/api/v1/leads/import/process",
        summary: "Process import batch with column mappings and duplicate strategy",
        security: [["bearerAuth" => []]],
        tags: ["LeadImports"],
        responses: [
            new OA\Response(response: 200, description: "Import batch processed successfully")
        ]
    )]
    public function process(ProcessImportRequest $request): JsonResponse
    {
        $importRecord = $this->importService->processImport(
            $request->validated('rows'),
            $request->validated('column_mapping'),
            $request->validated('duplicate_strategy', 'skip'),
            $request->validated('assigned_agent_id'),
            $request->user()
        );

        return $this->successResponse($importRecord, 'Import process completed.');
    }

    #[OA\Get(
        path: "/api/v1/leads/import/{id}/status",
        summary: "Check import batch status and error logs",
        security: [["bearerAuth" => []]],
        tags: ["LeadImports"],
        responses: [
            new OA\Response(response: 200, description: "Import status retrieved")
        ]
    )]
    public function status(int $id): JsonResponse
    {
        $importRecord = LeadImport::find($id);

        if (! $importRecord) {
            return $this->notFoundResponse("Import batch #{$id} not found.");
        }

        return $this->successResponse($importRecord, 'Import batch details retrieved.');
    }
}
