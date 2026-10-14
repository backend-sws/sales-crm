<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BlockImpersonatedDestructiveActions
{
    /**
     * Handle an incoming request.
     * Enforce security boundary: Destructive administrative actions are strictly prohibited
     * while operating under an active user impersonation session.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->currentAccessToken()) {
            $tokenName = $user->currentAccessToken()->name;

            // Check if active token is an impersonation session
            if (str_starts_with($tokenName, 'impersonated_by_')) {
                $adminId = str_replace('impersonated_by_', '', $tokenName);
                
                // Attach audit context to request
                $request->attributes->set('impersonated_by_admin_id', $adminId);

                // Prohibit destructive operations:
                // 1. DELETE methods
                // 2. Modifying users, roles, permissions, passwords, or database schemas
                if ($request->isMethod('DELETE') || 
                    $request->is('api/v1/admin/users*') || 
                    $request->is('api/v1/auth/password*') ||
                    $request->is('api/v1/admin/impersonate/*')
                ) {
                    // Exception: exiting impersonation is explicitly allowed
                    if ($request->is('api/v1/admin/impersonate/exit')) {
                        return $next($request);
                    }

                    return response()->json([
                        'success'    => false,
                        'statusCode' => 403,
                        'message'    => 'Destructive administrative actions (modifying user accounts, passwords, or critical settings) are strictly prohibited during active impersonation sessions.',
                        'data'       => null,
                        'errors'     => [
                            'impersonation_security' => 'You are currently in impersonation mode. Please exit impersonation first to perform this action.',
                        ],
                        'meta' => [
                            'impersonated_by_admin_id' => $adminId,
                            'timestamp'                => now()->toISOString(),
                        ],
                    ], 403);
                }
            }
        }

        $response = $next($request);

        // Attach header if impersonated
        if ($request->attributes->has('impersonated_by_admin_id')) {
            $response->headers->set('X-Impersonated-By', (string) $request->attributes->get('impersonated_by_admin_id'));
        }

        return $response;
    }
}
