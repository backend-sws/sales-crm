<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\ESignServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Client Documents & E-Sign", description: "Contracts, proposals, NDA and digital signature execution")]
class DocumentController extends BaseApiController
{
    public function __construct(
        protected ESignServiceInterface $esignService
    ) {}

    #[OA\Get(
        path: "/api/v1/clients/{id}/documents",
        summary: "List legal documents and contracts for client",
        security: [["bearerAuth" => []]],
        tags: ["Client Documents & E-Sign"]
    )]
    public function index(int $id): JsonResponse
    {
        $docs = $this->esignService->getDocuments($id);

        return $this->successResponse($docs, 'Client documents retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/clients/{id}/documents",
        summary: "Upload contract or proposal document for client signature",
        security: [["bearerAuth" => []]],
        tags: ["Client Documents & E-Sign"]
    )]
    public function store(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'title'    => 'required|string|max:255',
            'type'     => 'nullable|string|in:contract,proposal,nda,welcome',
            'file_url' => 'required|string|max:500',
        ]);

        $doc = $this->esignService->createDocument($id, $validated, $request->user());

        return $this->createdResponse($doc, "Document '{$doc->title}' created for e-signature.");
    }

    #[OA\Post(
        path: "/api/v1/documents/{id}/sign",
        summary: "Submit legal e-signature on a document",
        security: [["bearerAuth" => []]],
        tags: ["Client Documents & E-Sign"]
    )]
    public function sign(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'signer_name'        => 'required|string|max:255',
            'signature_data_url' => 'nullable|string',
        ]);

        $ip = $request->ip() ?: '127.0.0.1';
        $doc = $this->esignService->signDocument($id, $validated, $ip);

        return $this->successResponse($doc, "Document '{$doc->title}' successfully signed.");
    }

    #[OA\Patch(
        path: "/api/v1/documents/{id}",
        summary: "Update pending document before signing",
        security: [["bearerAuth" => []]],
        tags: ["Client Documents & E-Sign"]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'title'    => 'sometimes|string|max:255',
            'type'     => 'nullable|string|in:contract,proposal,nda,welcome',
            'file_url' => 'sometimes|string|max:500',
        ]);

        try {
            $doc = $this->esignService->updateDocument($id, $validated, $request->user());
            return $this->successResponse($doc, "Document '{$doc->title}' updated successfully.");
        } catch (\DomainException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }

    #[OA\Delete(
        path: "/api/v1/documents/{id}",
        summary: "Delete pending unsigned document",
        security: [["bearerAuth" => []]],
        tags: ["Client Documents & E-Sign"]
    )]
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->esignService->deleteDocument($id);
            return $this->successResponse(null, "Document deleted successfully.");
        } catch (\DomainException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }
    }
}
