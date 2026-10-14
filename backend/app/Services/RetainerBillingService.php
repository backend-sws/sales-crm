<?php

namespace App\Services;

use App\Contracts\Services\RetainerBillingServiceInterface;
use App\Models\ActivityLog;
use App\Models\ClientService;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class RetainerBillingService implements RetainerBillingServiceInterface
{
    /**
     * Generate invoice for a client service (with GST calculation).
     */
    public function generateInvoice(int $serviceId, ?array $override = null): Invoice
    {
        $service = ClientService::with('client')->findOrFail($serviceId);
        $client = $service->client;

        $subtotal = (float) ($override['amount'] ?? $service->value);

        // Tax calculation: Maharashtra intra-state (CGST 9% + SGST 9%) vs Inter-state IGST 18%
        $isHomeState = strcasecmp(trim($client->billing_state ?? ''), 'Maharashtra') === 0;

        if ($isHomeState) {
            $cgst = round($subtotal * 0.09, 2);
            $sgst = round($subtotal * 0.09, 2);
            $igst = 0.00;
        } else {
            $cgst = 0.00;
            $sgst = 0.00;
            $igst = round($subtotal * 0.18, 2);
        }

        $total = round($subtotal + $cgst + $sgst + $igst, 2);

        $seq = Invoice::count() + 1;
        $invoiceNumber = 'INV-' . date('Y') . '-' . str_pad($seq, 4, '0', STR_PAD_LEFT);

        $issueDate = $override['issue_date'] ?? now()->toDateString();
        $dueDate = $override['due_date'] ?? now()->addDays(15)->toDateString();

        $invoice = Invoice::create([
            'client_id'         => $client->id,
            'client_service_id' => $service->id,
            'invoice_number'    => $invoiceNumber,
            'issue_date'        => $issueDate,
            'due_date'          => $dueDate,
            'subtotal'          => $subtotal,
            'cgst_amount'       => $cgst,
            'sgst_amount'       => $sgst,
            'igst_amount'       => $igst,
            'total_amount'      => $total,
            'paid_amount'       => 0.00,
            'status'            => 'sent',
            'line_items'        => [
                [
                    'description' => "{$service->service_name} ({$service->billing_cycle} cycle)",
                    'amount'      => $subtotal,
                ],
            ],
            'notes'             => $override['notes'] ?? 'GST Retainer recurring billing invoice',
        ]);

        // Advance next_invoice_date on service
        $cycle = $service->billing_cycle;
        $nextDate = $cycle === 'yearly'
            ? now()->parse($service->next_invoice_date ?: $issueDate)->addYear()
            : ($cycle === 'quarterly'
                ? now()->parse($service->next_invoice_date ?: $issueDate)->addMonths(3)
                : now()->parse($service->next_invoice_date ?: $issueDate)->addMonth());

        $service->update(['next_invoice_date' => $nextDate->toDateString()]);

        ActivityLog::create([
            'log_name'     => 'billing',
            'description'  => "Generated invoice {$invoiceNumber} for ₹" . number_format($total) . " ({$client->name})",
            'subject_type' => Invoice::class,
            'subject_id'   => $invoice->id,
            'causer_type'  => User::class,
            'causer_id'    => auth()->id(),
            'created_at'   => now(),
        ]);

        return $invoice->load(['client', 'service']);
    }

    /**
     * Mark invoice as paid (or partially paid).
     */
    public function markInvoicePaid(int $invoiceId, array $paymentDetails, User $actor): Invoice
    {
        $invoice = Invoice::findOrFail($invoiceId);

        $paidAmount = (float) ($paymentDetails['paid_amount'] ?? $invoice->total_amount);
        $status = $paidAmount >= $invoice->total_amount ? 'paid' : 'partially_paid';

        $invoice->update([
            'paid_amount' => $paidAmount,
            'status'      => $status,
            'paid_at'     => now(),
            'notes'       => ($invoice->notes ? $invoice->notes . "\n" : '') . ($paymentDetails['notes'] ?? 'Payment recorded'),
        ]);

        ActivityLog::create([
            'log_name'     => 'billing',
            'description'  => "Marked invoice {$invoice->invoice_number} as {$status} (₹" . number_format($paidAmount) . ")",
            'subject_type' => Invoice::class,
            'subject_id'   => $invoice->id,
            'causer_type'  => User::class,
            'causer_id'    => $actor->id,
            'created_at'   => now(),
        ]);

        return $invoice->fresh(['client', 'service']);
    }

    /**
     * Get invoices for a client.
     */
    public function getInvoices(int $clientId, array $filters = []): Collection
    {
        $query = Invoice::where('client_id', $clientId)->latest('issue_date');

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->get();
    }

    /**
     * Process due billing cycles (called by scheduler).
     */
    public function processDueBillingCycles(): int
    {
        $dueServices = ClientService::where('status', 'active')
            ->whereNotNull('next_invoice_date')
            ->where('next_invoice_date', '<=', now()->addDays(7)->toDateString())
            ->get();

        $count = 0;
        foreach ($dueServices as $service) {
            $this->generateInvoice($service->id);
            $count++;
        }

        return $count;
    }
}
