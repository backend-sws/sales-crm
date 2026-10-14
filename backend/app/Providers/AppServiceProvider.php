<?php

namespace App\Providers;

use App\Contracts\Services\AuthServiceInterface;
use App\Contracts\Services\DashboardServiceInterface;
use App\Contracts\Services\LeadServiceInterface;
use App\Services\AuthService;
use App\Services\DashboardService;
use App\Services\LeadService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * All of the container bindings that should be registered.
     *
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        AuthServiceInterface::class => AuthService::class,
        LeadServiceInterface::class => LeadService::class,
        DashboardServiceInterface::class => DashboardService::class,
        \App\Contracts\Services\FollowUpServiceInterface::class => \App\Services\FollowUpService::class,
        \App\Contracts\Services\LeadImportServiceInterface::class => \App\Services\LeadImportService::class,
        \App\Contracts\Services\AutoAssignmentServiceInterface::class => \App\Services\AutoAssignmentService::class,
        \App\Contracts\Services\NotificationChannelServiceInterface::class => \App\Services\NotificationService::class,
        \App\Contracts\Services\AnalyticsServiceInterface::class => \App\Services\AnalyticsService::class,
        \App\Contracts\Services\ImpersonationServiceInterface::class => \App\Services\ImpersonationService::class,
        \App\Contracts\Services\ScheduledReportServiceInterface::class => \App\Services\ScheduledReportService::class,
        \App\Contracts\Services\ClientConversionServiceInterface::class => \App\Services\ClientConversionService::class,
        \App\Contracts\Services\ClientServiceInterface::class => \App\Services\ClientService::class,
        \App\Contracts\Services\ServiceTrackServiceInterface::class => \App\Services\ServiceTrackService::class,
        \App\Contracts\Services\RetainerBillingServiceInterface::class => \App\Services\RetainerBillingService::class,
        \App\Contracts\Services\ClientHealthScoreServiceInterface::class => \App\Services\ClientHealthScoreService::class,
        \App\Contracts\Services\ESignServiceInterface::class => \App\Services\ESignService::class,
        \App\Contracts\Services\ProjectServiceInterface::class => \App\Services\ProjectService::class,
        \App\Contracts\Services\ProjectTaskServiceInterface::class => \App\Services\ProjectTaskService::class,
        \App\Contracts\Services\TimeTrackingServiceInterface::class => \App\Services\TimeTrackingService::class,
        \App\Contracts\Services\SprintServiceInterface::class => \App\Services\SprintService::class,
        \App\Contracts\Services\ScopeGovernanceServiceInterface::class => \App\Services\ScopeGovernanceService::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
