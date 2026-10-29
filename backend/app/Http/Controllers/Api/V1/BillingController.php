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
            'apply_gst'  => 'nullable|boolean',
            'notes'      => 'nullable|string',
        ]);

        $invoice = $this->billingService->generateInvoice($id, $validated);

        return $this->createdResponse($invoice, "Invoice '{$invoice->invoice_number}' generated successfully.");
    }

    #[OA\Post(
        path: "/api/v1/clients/{id}/invoices",
        summary: "Create custom itemized tax invoice for a client with service prices",
        security: [["bearerAuth" => []]],
        tags: ["Billing & Invoices"]
    )]
    public function createCustomInvoice(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'client_service_id' => 'nullable|exists:client_services,id',
            'project_id'        => 'nullable|exists:projects,id',
            'invoice_number'    => 'nullable|string|max:50',
            'issue_date'        => 'nullable|date',
            'due_date'          => 'nullable|date|after_or_equal:issue_date',
            'apply_gst'         => 'nullable|boolean',
            'notes'             => 'nullable|string',
            'line_items'        => 'required|array|min:1',
            'line_items.*.description' => 'required|string|max:255',
            'line_items.*.hsn_sac'     => 'nullable|string|max:50',
            'line_items.*.quantity'    => 'nullable|numeric|min:0.01',
            'line_items.*.unit_price'  => 'required|numeric|min:0',
            'line_items.*.amount'      => 'nullable|numeric|min:0',
        ]);

        $invoice = $this->billingService->createCustomInvoice($id, $validated, $request->user());

        return $this->createdResponse($invoice, "Custom Invoice '{$invoice->invoice_number}' created successfully.");
    }

    #[OA\Get(
        path: "/api/v1/invoices/{id}",
        summary: "Get single invoice details for preview and printing",
        security: [["bearerAuth" => []]],
        tags: ["Billing & Invoices"]
    )]
    public function show(int $id): JsonResponse
    {
        $invoice = $this->billingService->getInvoice($id);
        return $this->successResponse($invoice, 'Invoice retrieved successfully.');
    }

    #[OA\Delete(
        path: "/api/v1/invoices/{id}",
        summary: "Delete an unpaid invoice",
        security: [["bearerAuth" => []]],
        tags: ["Billing & Invoices"]
    )]
    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->billingService->deleteInvoice($id, $request->user());
        return $this->successResponse(null, 'Invoice deleted successfully.');
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
