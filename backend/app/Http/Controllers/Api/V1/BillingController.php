<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\Services\RetainerBillingServiceInterface;
use App\Http\Controllers\Api\BaseApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Billing & Invoices", description: "Retainer auto-billing, GST calculation and payment tracking")]
class BillingController extends BaseApiController
{
    public function __construct(
        protected RetainerBillingServiceInterface $billingService
    ) {}

    #[OA\Get(
        path: "/api/v1/clients/{id}/invoices",
        summary: "Get invoices for client",
        security: [["bearerAuth" => []]],
        tags: ["Billing & Invoices"]
    )]
    public function index(Request $request, int $id): JsonResponse
    {
        $filters = $request->only(['status']);
        $invoices = $this->billingService->getInvoices($id, $filters);

        return $this->successResponse($invoices, 'Client invoices retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/services/{id}/invoices/generate",
        summary: "Generate retainer recurring invoice for a service",
        security: [["bearerAuth" => []]],
        tags: ["Billing & Invoices"]
    )]
    public function generate(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'amount'     => 'nullable|numeric|min:0',
            'issue_date' => 'nullable|date',
            'due_date'   => 'nullable|date|after_or_equal:issue_date',
            'notes'      => 'nullable|string',
        ]);

        $invoice = $this->billingService->generateInvoice($id, $validated);

        return $this->createdResponse($invoice, "Invoice '{$invoice->invoice_number}' generated successfully.");
    }

    #[OA\Patch(
        path: "/api/v1/invoices/{id}/mark-paid",
        summary: "Record payment on an invoice",
        security: [["bearerAuth" => []]],
        tags: ["Billing & Invoices"]
    )]
    public function markPaid(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'paid_amount' => 'nullable|numeric|min:0',
            'notes'       => 'nullable|string',
        ]);

        $invoice = $this->billingService->markInvoicePaid($id, $validated, $request->user());

        return $this->successResponse($invoice, "Invoice '{$invoice->invoice_number}' payment recorded.");
    }
}
