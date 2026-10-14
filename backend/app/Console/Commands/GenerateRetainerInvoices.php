<?php

namespace App\Console\Commands;

use App\Contracts\Services\RetainerBillingServiceInterface;
use Illuminate\Console\Command;

class GenerateRetainerInvoices extends Command
{
    protected $signature = 'billing:generate-retainer-invoices';

    protected $description = 'Generate retainer recurring invoices due within the next 7 days';

    public function handle(RetainerBillingServiceInterface $billingService): int
    {
        $this->info('🧾 Processing due retainer billing cycles...');

        $count = $billingService->processDueBillingCycles();

        $this->info("✅ Successfully generated {$count} retainer invoices.");

        return self::SUCCESS;
    }
}
