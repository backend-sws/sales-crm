<?php

use App\Http\Controllers\Api\V1\AdminUserController;
use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\FollowUpController;
use App\Http\Controllers\Api\V1\ImpersonationController;
use App\Http\Controllers\Api\V1\InboundLeadController;
use App\Http\Controllers\Api\V1\LeadController;
use App\Http\Controllers\Api\V1\LeadImportController;
use App\Http\Controllers\Api\V1\BillingController;
use App\Http\Controllers\Api\V1\ClientController;
use App\Http\Controllers\Api\V1\DocumentController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ServiceTrackController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (Version 1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // Health check endpoint
    Route::get('/health', function () {
        return response()->json([
            'success' => true,
            'statusCode' => 200,
            'message' => 'SalesCRM API v1 is healthy and operating normally.',
            'data' => [
                'environment' => config('app.env'),
                'framework' => 'Laravel '.app()->version(),
                'version' => 'v1',
                'timestamp' => now()->toISOString(),
            ],
            'errors' => null,
            'meta' => [
                'timestamp' => now()->toISOString(),
                'version' => 'v1',
            ],
        ]);
    });

    // Public Inbound Lead Capture (Webhooks, Website forms, Meta Ads)
    Route::post('/leads/inbound', [InboundLeadController::class, 'handleInbound']);

    // Report downloads (presigned/unique filename artifact access)
    Route::get('/reports/scheduled/download/{filename}', [ReportController::class, 'download']);

    // Public Authentication routes
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login'])->name('login');
    });

    // Authenticated API routes
    Route::middleware(['auth:sanctum', 'impersonation.protect'])->group(function () {
        // User profile & session
        Route::get('/auth/user', [AuthController::class, 'user']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Dashboard Analytics
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Notifications & Alerts
        Route::get('/notifications/recent', [NotificationController::class, 'recent']);
        Route::post('/notifications/test', [NotificationController::class, 'test']);

        // Leads Management (Phase 1)
        Route::get('/leads/analytics', [LeadController::class, 'analytics']);
        Route::get('/leads/kanban', [LeadController::class, 'kanban']);
        Route::get('/leads/metadata', [LeadController::class, 'metadata']);
        Route::post('/leads/bulk-assign', [LeadController::class, 'bulkAssign']);
        Route::post('/leads/bulk-status', [LeadController::class, 'bulkStatus']);
        Route::post('/leads/import/preview', [LeadImportController::class, 'preview']);
        Route::post('/leads/import/process', [LeadImportController::class, 'process']);
        Route::get('/leads/import/{id}/status', [LeadImportController::class, 'status']);
        Route::get('/leads/{id}/timeline', [LeadController::class, 'timeline']);
        Route::patch('/leads/{id}/status', [LeadController::class, 'updateStatus']);
        Route::post('/leads/{id}/assign', [LeadController::class, 'assign']);
        Route::post('/leads/{id}/auto-assign', [LeadController::class, 'autoAssign']);
        Route::post('/leads/{id}/merge', [LeadController::class, 'merge']);
        Route::get('/leads/{id}/duplicates', [LeadController::class, 'duplicates']);
        Route::post('/leads/{id}/recalculate-score', [LeadController::class, 'recalculateScore']);
        Route::apiResource('leads', LeadController::class);

        // Follow-ups Management (Phase 1)
        Route::get('/follow-ups/summary', [FollowUpController::class, 'summary']);
        Route::get('/follow-ups/today', [FollowUpController::class, 'today']);
        Route::get('/follow-ups/overdue', [FollowUpController::class, 'overdue']);
        Route::patch('/follow-ups/{id}/complete', [FollowUpController::class, 'complete']);
        Route::apiResource('follow-ups', FollowUpController::class)->only(['index', 'store']);

        // Executive Analytics & Revenue Forecasting (Phase 2)
        Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);
        Route::get('/analytics/forecast', [AnalyticsController::class, 'forecast']);
        Route::get('/analytics/lost-deal-analysis', [AnalyticsController::class, 'lostDealAnalysis']);
        Route::get('/analytics/leaderboard', [AnalyticsController::class, 'leaderboard']);
        Route::get('/analytics/funnel', [AnalyticsController::class, 'funnel']);
        Route::get('/analytics/agents/{id}', [AnalyticsController::class, 'agentScorecard']);

        // Admin User Management & Impersonation (Phase 2)
        Route::get('/admin/users', [AdminUserController::class, 'index']);
        Route::post('/admin/users', [AdminUserController::class, 'store']);
        Route::patch('/admin/users/{id}', [AdminUserController::class, 'update']);
        Route::get('/admin/teams', [AdminUserController::class, 'teams']);
        Route::post('/admin/impersonate/exit', [ImpersonationController::class, 'exit']);
        Route::post('/admin/impersonate/{user}', [ImpersonationController::class, 'start']);
        Route::get('/admin/impersonation-logs', [ImpersonationController::class, 'logs']);
        Route::get('/admin/audit-logs', [AuditLogController::class, 'index']);
        Route::get('/admin/audit-logs/export', [AuditLogController::class, 'export']);

        // Scheduled Reports & Data Exports (Phase 2)
        Route::get('/reports/scheduled', [ReportController::class, 'index']);
        Route::post('/reports/scheduled', [ReportController::class, 'store']);
        Route::post('/reports/scheduled/{id}/generate', [ReportController::class, 'generate']);
        Route::get('/reports/agent/{id}/export', [ReportController::class, 'exportAgent']);

        // Client Management & Won Conversion (Phase 3)
        Route::post('/leads/{id}/convert', [ClientController::class, 'convert']);
        Route::get('/client/portal-profile', [ClientController::class, 'portalProfile']);
        Route::get('/clients', [ClientController::class, 'index']);
        Route::get('/clients/{id}', [ClientController::class, 'show']);
        Route::patch('/clients/{id}', [ClientController::class, 'update']);
        Route::post('/clients/{id}/branding', [ClientController::class, 'updateBranding']);
        Route::get('/clients/{id}/onboarding', [ClientController::class, 'onboarding']);
        Route::patch('/clients/{id}/onboarding/{step}', [ClientController::class, 'updateOnboardingStep']);
        Route::get('/clients/{id}/health', [ClientController::class, 'health']);

        // Service Track (Tickets & Periodic Reports) (Phase 3)
        Route::get('/services/{id}/tickets', [ServiceTrackController::class, 'tickets']);
        Route::post('/services/{id}/tickets', [ServiceTrackController::class, 'createTicket']);
        Route::patch('/tickets/{id}/status', [ServiceTrackController::class, 'updateTicketStatus']);
        Route::post('/tickets/{id}/confirm', [ServiceTrackController::class, 'confirmTicket']);
        Route::post('/services/{id}/reports', [ServiceTrackController::class, 'uploadReport']);
        Route::get('/services/{id}/reports', [ServiceTrackController::class, 'reports']);

        // Retainer Billing & Invoices (Phase 3)
        Route::get('/clients/{id}/invoices', [BillingController::class, 'index']);
        Route::post('/services/{id}/invoices/generate', [BillingController::class, 'generate']);
        Route::patch('/invoices/{id}/mark-paid', [BillingController::class, 'markPaid']);

        // Documents & E-Sign (Phase 3)
        Route::get('/clients/{id}/documents', [DocumentController::class, 'index']);
        Route::post('/clients/{id}/documents', [DocumentController::class, 'store']);
        Route::post('/documents/{id}/sign', [DocumentController::class, 'sign']);
    });
});

