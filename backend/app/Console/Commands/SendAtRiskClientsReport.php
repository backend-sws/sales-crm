<?php

namespace App\Console\Commands;

use App\Contracts\Services\ClientHealthScoreServiceInterface;
use App\Contracts\Services\NotificationChannelServiceInterface;
use App\Models\User;
use Illuminate\Console\Command;

class SendAtRiskClientsReport extends Command
{
    protected $signature = 'clients:send-at-risk-report';

    protected $description = 'Alert super admins and account managers regarding clients with critical health scores below threshold';

    public function handle(
        ClientHealthScoreServiceInterface $healthScoreService,
        NotificationChannelServiceInterface $notificationService
    ): int {
        $this->info('⚠️ Checking for clients at risk or churning...');

        $atRisk = $healthScoreService->getAtRiskClients(45);

        if ($atRisk->isEmpty()) {
            $this->info('🟢 Great news: No clients currently flagged at risk.');
            return self::SUCCESS;
        }

        $admins = User::role(['super_admin', 'sales_manager'])->where('is_active', true)->get();

        foreach ($admins as $admin) {
            $notificationService->send(
                $admin,
                'at_risk_clients',
                [
                    'title'       => '⚠️ At-Risk Clients Retention Alert',
                    'message'     => "{$atRisk->count()} client(s) currently require immediate attention due to low retention health scores.",
                    'count'       => $atRisk->count(),
                    'client_list' => $atRisk->map(fn ($c) => [
                        'name'    => $c->name,
                        'company' => $c->company,
                        'score'   => $c->healthScore?->score,
                        'status'  => $c->healthScore?->status,
                    ])->toArray(),
                ],
                'email'
            );
        }

        $this->info("✅ Dispatched at-risk retention alerts to {$admins->count()} administrators.");

        return self::SUCCESS;
    }
}
