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
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\ProjectTaskController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ScopeGovernanceController;
use App\Http\Controllers\Api\V1\ServiceTrackController;
use App\Http\Controllers\Api\V1\SprintController;
use App\Http\Controllers\Api\V1\TimeTrackingController;
use App\Http\Controllers\Api\V1\AiController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\GitHubWebhookController;
use App\Http\Controllers\Api\V1\PerformanceController;
use App\Http\Controllers\Api\V1\StorageController;
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

    // Public GitHub Webhook (Push & Pull Request Ingestion)
    Route::post('/webhooks/github', [GitHubWebhookController::class, 'handleWebhook']);

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

        // Projects, Milestones & Budgets (Phase 4)
        Route::get('/projects', [ProjectController::class, 'index']);
        Route::post('/projects', [ProjectController::class, 'store']);
        Route::get('/projects/{id}', [ProjectController::class, 'show']);
        Route::patch('/projects/{id}', [ProjectController::class, 'update']);
        Route::get('/projects/{id}/budget', [ProjectController::class, 'budget']);
        Route::get('/projects/{id}/capacity', [ProjectController::class, 'capacity']);
        Route::post('/projects/{id}/milestones', [ProjectController::class, 'storeMilestone']);
        Route::post('/milestones/{milestoneId}/invoice', [ProjectController::class, 'invoiceMilestone']);

        // Tasks, Kanban & Dependencies (Phase 4)
        Route::get('/projects/{projectId}/tasks', [ProjectTaskController::class, 'index']);
        Route::post('/projects/{projectId}/tasks', [ProjectTaskController::class, 'store']);
        Route::patch('/tasks/{id}', [ProjectTaskController::class, 'update']);
        Route::patch('/tasks/{id}/status', [ProjectTaskController::class, 'updateStatus']);
        Route::post('/tasks/{id}/dependencies', [ProjectTaskController::class, 'addDependency']);
        Route::delete('/tasks/{id}/dependencies/{dependsOnTaskId}', [ProjectTaskController::class, 'removeDependency']);
        Route::post('/tasks/{id}/proof', [ProjectTaskController::class, 'attachProof']);
        Route::post('/tasks/{id}/client-decision', [ProjectTaskController::class, 'clientDecision']);
        Route::get('/projects/{projectId}/gantt', [ProjectTaskController::class, 'gantt']);

        // Time Tracking & Worklogs (Phase 4)
        Route::get('/time-entries/active', [TimeTrackingController::class, 'activeTimer']);
        Route::post('/tasks/{taskId}/timer/start', [TimeTrackingController::class, 'startTimer']);
        Route::post('/time-entries/{id}/stop', [TimeTrackingController::class, 'stopTimer']);
        Route::post('/tasks/{taskId}/time-entries', [TimeTrackingController::class, 'store']);
        Route::get('/projects/{projectId}/worklogs', [TimeTrackingController::class, 'projectWorklogs']);

        // Sprints & Burndown (Phase 4)
        Route::get('/projects/{projectId}/sprints', [SprintController::class, 'index']);
        Route::post('/projects/{projectId}/sprints', [SprintController::class, 'store']);
        Route::post('/sprints/{id}/tasks', [SprintController::class, 'assignTasks']);
        Route::get('/sprints/{id}/burndown', [SprintController::class, 'burndown']);
        Route::patch('/sprints/{id}/close', [SprintController::class, 'close']);

        // Scope Governance, Diff & Change Requests (Phase 4)
        Route::get('/projects/{projectId}/scope-versions', [ScopeGovernanceController::class, 'scopeVersions']);
        Route::post('/projects/{projectId}/scope-versions', [ScopeGovernanceController::class, 'storeScopeVersion']);
        Route::post('/scope-versions/{id}/approve', [ScopeGovernanceController::class, 'approveScope']);
        Route::get('/scope-versions/{v1}/diff/{v2}', [ScopeGovernanceController::class, 'diff']);
        Route::get('/projects/{projectId}/change-requests', [ScopeGovernanceController::class, 'changeRequests']);
        Route::post('/projects/{projectId}/change-requests', [ScopeGovernanceController::class, 'storeChangeRequest']);
        Route::patch('/change-requests/{id}/decision', [ScopeGovernanceController::class, 'decideChangeRequest']);
        Route::get('/projects/{projectId}/meetings', [ScopeGovernanceController::class, 'meetings']);
        Route::post('/projects/{projectId}/meetings', [ScopeGovernanceController::class, 'storeMeeting']);
        Route::post('/meetings/{id}/confirm', [ScopeGovernanceController::class, 'confirmMoM']);
        Route::post('/meeting-action-items/{id}/convert', [ScopeGovernanceController::class, 'convertActionItem']);

        // Storage & Presigned Direct Uploads (Phase 5)
        Route::post('/storage/presigned-upload', [StorageController::class, 'presignedUpload']);
        Route::post('/storage/upload-direct', [StorageController::class, 'uploadDirect']);

        // Slack Project Chat & Internal Notes (Phase 5)
        Route::get('/projects/{projectId}/channels', [ChatController::class, 'channels']);
        Route::get('/channels/{channelId}/messages', [ChatController::class, 'messages']);
        Route::post('/channels/{channelId}/messages', [ChatController::class, 'sendMessage']);
        Route::post('/messages/{messageId}/react', [ChatController::class, 'react']);

        // GitHub Repository Integration & Git Analytics (Phase 5)
        Route::post('/projects/{projectId}/github/link', [GitHubWebhookController::class, 'linkRepo']);
        Route::get('/projects/{projectId}/github/analytics', [GitHubWebhookController::class, 'analytics']);
        Route::post('/projects/{projectId}/github/simulate-webhook', [GitHubWebhookController::class, 'simulate']);

        // Google Gemini Generative AI Assistant (Phase 5)
        Route::get('/ai/leads/{id}/suggestions', [AiController::class, 'leadSuggestions']);
        Route::post('/ai/meetings/{id}/summarize', [AiController::class, 'summarizeMeeting']);
        Route::get('/ai/sprints/{id}/risk-assessment', [AiController::class, 'sprintRisk']);
        Route::post('/ai/projects/{id}/generate-tasks', [AiController::class, 'generateTasks']);

        // Multi-Signal Developer Performance & Feedback (Phase 5)
        Route::post('/feedback/tasks/{id}', [PerformanceController::class, 'submitTaskFeedback']);
        Route::post('/feedback/{id}/dispute', [PerformanceController::class, 'dispute']);
        Route::post('/admin/feedback/{id}/resolve-dispute', [PerformanceController::class, 'resolveDispute']);
        Route::get('/developers/{id}/performance', [PerformanceController::class, 'developerPerformance']);
        Route::get('/admin/performance/leaderboard', [PerformanceController::class, 'leaderboard']);
    });
});

