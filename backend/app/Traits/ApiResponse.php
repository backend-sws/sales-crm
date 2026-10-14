<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;
use Symfony\Component\HttpFoundation\Response;

trait ApiResponse
{
    /**
     * Send a standardized success JSON response.
     */
    protected function successResponse(
        mixed $data = null,
        string $message = 'Request processed successfully.',
        int $statusCode = Response::HTTP_OK,
        array $meta = []
    ): JsonResponse {
        $response = [
            'success' => true,
            'statusCode' => $statusCode,
            'message' => $message,
            'data' => $data,
            'errors' => null,
            'meta' => array_merge([
                'timestamp' => now()->toISOString(),
                'version' => 'v1',
            ], $meta),
        ];

        return response()->json($response, $statusCode);
    }

    /**
     * Send a standardized created (201) JSON response.
     */
    protected function createdResponse(
        mixed $data = null,
        string $message = 'Resource created successfully.',
        array $meta = []
    ): JsonResponse {
        return $this->successResponse($data, $message, Response::HTTP_CREATED, $meta);
    }

    /**
     * Send a standardized paginated response.
     */
    protected function paginatedResponse(
        LengthAwarePaginator $paginator,
        string $message = 'Data retrieved successfully.',
        array $meta = []
    ): JsonResponse {
        $paginationMeta = [
            'pagination' => [
                'total' => $paginator->total(),
                'count' => $paginator->count(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'total_pages' => $paginator->lastPage(),
                'has_more_pages' => $paginator->hasMorePages(),
            ],
        ];

        return $this->successResponse(
            $paginator->items(),
            $message,
            Response::HTTP_OK,
            array_merge($paginationMeta, $meta)
        );
    }

    /**
     * Send a standardized error JSON response.
     */
    protected function errorResponse(
        string $message = 'An unexpected error occurred.',
        int $statusCode = Response::HTTP_BAD_REQUEST,
        mixed $errors = null,
        array $meta = []
    ): JsonResponse {
        $response = [
            'success' => false,
            'statusCode' => $statusCode,
            'message' => $message,
            'data' => null,
            'errors' => $errors,
            'meta' => array_merge([
                'timestamp' => now()->toISOString(),
                'version' => 'v1',
            ], $meta),
        ];

        return response()->json($response, $statusCode);
    }

    /**
     * Send a standardized 404 Not Found response.
     */
    protected function notFoundResponse(
        string $message = 'Requested resource not found.'
    ): JsonResponse {
        return $this->errorResponse($message, Response::HTTP_NOT_FOUND);
    }

    /**
     * Send a standardized 401 Unauthorized response.
     */
    protected function unauthorizedResponse(
        string $message = 'Unauthenticated access.'
    ): JsonResponse {
        return $this->errorResponse($message, Response::HTTP_UNAUTHORIZED);
    }

    /**
     * Send a standardized 403 Forbidden response.
     */
    protected function forbiddenResponse(
        string $message = 'You do not have permission to perform this action.'
    ): JsonResponse {
        return $this->errorResponse($message, Response::HTTP_FORBIDDEN);
    }

    /**
     * Send a standardized 422 Validation Error response.
     */
    protected function validationErrorResponse(
        mixed $errors,
        string $message = 'Validation failed.'
    ): JsonResponse {
        return $this->errorResponse($message, Response::HTTP_UNPROCESSABLE_ENTITY, $errors);
    }
}
