<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->redirectGuestsTo(fn () => null);
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
            'impersonation.protect' => \App\Http\Middleware\BlockImpersonatedDestructiveActions::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'statusCode' => 422,
                    'message' => 'Validation failed.',
                    'data' => null,
                    'errors' => $e->errors(),
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                        'version' => 'v1',
                    ],
                ], 422);
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'statusCode' => 401,
                    'message' => 'Unauthenticated access.',
                    'data' => null,
                    'errors' => null,
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                        'version' => 'v1',
                    ],
                ], 401);
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'statusCode' => 404,
                    'message' => 'Requested endpoint or resource not found.',
                    'data' => null,
                    'errors' => null,
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                        'version' => 'v1',
                    ],
                ], 404);
            }
        });

        $exceptions->render(function (\Spatie\Permission\Exceptions\UnauthorizedException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'statusCode' => 403,
                    'message' => 'Forbidden: ' . $e->getMessage(),
                    'data' => null,
                    'errors' => null,
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                        'version' => 'v1',
                    ],
                ], 403);
            }
        });

        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'statusCode' => 403,
                    'message' => 'You do not have permission to perform this action.',
                    'data' => null,
                    'errors' => null,
                    'meta' => [
                        'timestamp' => now()->toISOString(),
                        'version' => 'v1',
                    ],
                ], 403);
            }
        });
    })->create();
