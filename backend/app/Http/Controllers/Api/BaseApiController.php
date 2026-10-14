<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use OpenApi\Attributes as OA;

#[
    OA\Info(
        version: "1.0.0",
        title: "SalesCRM API v1 Documentation",
        description: "Official RESTful API documentation for SalesCRM built with Laravel 13, Service-Interface architecture, and standardized response envelope."
    ),
    OA\Server(
        url: "http://127.0.0.1:8000",
        description: "Local Development Server"
    ),
    OA\SecurityScheme(
        securityScheme: "bearerAuth",
        type: "http",
        scheme: "bearer",
        bearerFormat: "Sanctum Token",
        description: "Enter Bearer token obtained from /api/v1/auth/login"
    )
]
abstract class BaseApiController extends Controller
{
    use ApiResponse;
}
