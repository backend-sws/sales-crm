<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\AuthServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Requests\Api\V1\Auth\RegisterRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Authentication", description: "Endpoints for user authentication and session management")]
class AuthController extends BaseApiController
{
    public function __construct(
        protected AuthServiceInterface $authService
    ) {}

    #[OA\Post(
        path: "/api/v1/auth/register",
        summary: "Register new user",
        tags: ["Authentication"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["name", "email", "password", "password_confirmation"],
                properties: [
                    new OA\Property(property: "name", type: "string", example: "Rahul Sharma"),
                    new OA\Property(property: "email", type: "string", format: "email", example: "rahul@example.com"),
                    new OA\Property(property: "password", type: "string", format: "password", example: "secret123"),
                    new OA\Property(property: "password_confirmation", type: "string", format: "password", example: "secret123"),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: "User registered successfully"),
            new OA\Response(response: 422, description: "Validation error")
        ]
    )]
    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return $this->createdResponse($result, 'User registered successfully.');
    }

    #[OA\Post(
        path: "/api/v1/auth/login",
        summary: "Login and obtain access token",
        tags: ["Authentication"],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ["email", "password"],
                properties: [
                    new OA\Property(property: "email", type: "string", format: "email", example: "admin@salescrm.com"),
                    new OA\Property(property: "password", type: "string", format: "password", example: "password123"),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: "Logged in successfully"),
            new OA\Response(response: 422, description: "Invalid credentials")
        ]
    )]
    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->validated());

        return $this->successResponse($result, 'Logged in successfully.');
    }

    #[OA\Get(
        path: "/api/v1/auth/user",
        summary: "Get authenticated user profile",
        security: [["bearerAuth" => []]],
        tags: ["Authentication"],
        responses: [
            new OA\Response(response: 200, description: "User profile retrieved"),
            new OA\Response(response: 401, description: "Unauthenticated")
        ]
    )]
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = $this->authService->getProfile($user);

        return $this->successResponse($profile, 'User profile fetched successfully.');
    }

    #[OA\Post(
        path: "/api/v1/auth/logout",
        summary: "Logout current session and revoke token",
        security: [["bearerAuth" => []]],
        tags: ["Authentication"],
        responses: [
            new OA\Response(response: 200, description: "Logged out successfully"),
            new OA\Response(response: 401, description: "Unauthenticated")
        ]
    )]
    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return $this->successResponse(null, 'Logged out successfully.');
    }
}
