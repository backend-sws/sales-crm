<?php

namespace App\Contracts\Services;

use App\Models\Invoice;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface RetainerBillingServiceInterface
{
    /**
     * Generate invoice for a client service (with GST calculation).
     */
    public function generateInvoice(int $serviceId, ?array $override = null): Invoice;

    /**
     * Mark invoice as paid (or partially paid).
     */
    public function markInvoicePaid(int $invoiceId, array $paymentDetails, User $actor): Invoice;

    /**
     * Get invoices for a client.
     */
    public function getInvoices(int $clientId, array $filters = []): Collection;

    /**
     * Process due billing cycles (called by scheduler).
     */
    public function processDueBillingCycles(): int;
}
