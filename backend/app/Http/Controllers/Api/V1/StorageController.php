<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\PresignedStorageServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Storage & Uploads", description: "Presigned URL generation and direct file uploads for chat and attachments")]
class StorageController extends BaseApiController
{
    public function __construct(
        protected PresignedStorageServiceInterface $storageService
    ) {}

    #[OA\Post(
        path: "/api/v1/storage/presigned-upload",
        summary: "Request presigned upload URL for direct attachment upload",
        security: [["bearerAuth" => []]],
        tags: ["Storage & Uploads"]
    )]
    public function presignedUpload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file_name'       => 'required|string|max:255',
            'file_type'       => 'required|string|max:100',
            'file_size_bytes' => 'required|integer|max:52428800', // 50MB max
            'folder'          => 'nullable|string|max:50',
        ]);

        $folder = $validated['folder'] ?? 'chat_attachments';
        $payload = $this->storageService->generatePresignedUpload(
            $validated['file_name'],
            $validated['file_type'],
            $validated['file_size_bytes'],
            $folder
        );

        return $this->successResponse($payload, 'Presigned upload URL generated successfully.');
    }

    #[OA\Post(
        path: "/api/v1/storage/upload-direct",
        summary: "Direct multipart file upload endpoint",
        security: [["bearerAuth" => []]],
        tags: ["Storage & Uploads"]
    )]
    public function uploadDirect(Request $request): JsonResponse
    {
        $request->validate([
            'file'   => 'required|file|max:51200', // 50MB
            'folder' => 'nullable|string|max:50',
        ]);

        $folder = $request->input('folder', 'chat_attachments');
        $uploaded = $this->storageService->storeDirectUpload($request->file('file'), $folder);

        return $this->createdResponse($uploaded, 'File uploaded successfully.');
    }
}
