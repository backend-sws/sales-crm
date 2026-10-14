<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 3: Won -> Client Auto-Conversion, Service Track & Portal.
     */
    public function up(): void
    {
        // 1. Clients
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('company', 255)->nullable();
            $table->string('email', 255)->unique();
            $table->string('phone', 50)->nullable()->index();
            $table->string('gst_number', 50)->nullable();
            $table->text('billing_address')->nullable();
            $table->string('billing_state', 100)->nullable();
            $table->foreignId('source_lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->foreignId('account_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('onboarding_completed')->default(false);
            $table->json('onboarding_steps')->nullable();
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            $table->timestamps();
        });

        // 2. Client Branding (White-label Portal)
        Schema::create('client_branding', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->unique()->constrained('clients')->cascadeOnDelete();
            $table->string('logo_url', 500)->nullable();
            $table->string('primary_color', 7)->default('#1E40AF');
            $table->string('subdomain', 100)->nullable()->unique();
            $table->string('custom_domain', 255)->nullable()->unique();
            $table->boolean('hide_vendor_branding')->default(true);
            $table->json('enabled_features')->nullable();
            $table->timestamps();
        });

        // 3. Client Services (Service Subscriptions / Track)
        Schema::create('client_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('service_name', 255);
            $table->enum('service_type', ['recurring', 'one_time', 'software_project'])->default('recurring');
            $table->enum('status', ['active', 'in_progress', 'paused', 'completed'])->default('active');
            $table->date('start_date');
            $table->enum('billing_cycle', ['monthly', 'quarterly', 'yearly', 'milestone'])->default('monthly');
            $table->decimal('value', 12, 2)->default(0);
            $table->date('next_invoice_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 4. Client Documents (E-sign Contracts & Proposals)
        Schema::create('client_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('type', 100)->default('contract'); // contract, proposal, nda, welcome
            $table->string('title', 255);
            $table->string('file_url', 500);
            $table->string('signed_file_url', 500)->nullable();
            $table->enum('status', ['pending_signature', 'signed', 'declined', 'expired'])->default('pending_signature');
            $table->dateTime('signed_at')->nullable();
            $table->string('signer_ip', 45)->nullable();
            $table->string('signer_name', 255)->nullable();
            $table->longText('signature_data_url')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 5. Service Requests (Tickets for Service Track)
        Schema::create('service_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_service_id')->constrained('client_services')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('ticket_number', 50)->unique();
            $table->string('title', 255);
            $table->text('description');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->enum('status', ['open', 'in_progress', 'done', 'confirmed', 'closed'])->default('open');
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('added_by_type', ['client', 'admin'])->default('client');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('sla_deadline')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->timestamps();
        });

        // 6. Service Reports (Monthly / Periodic Telemetry & Ingest)
        Schema::create('service_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_service_id')->constrained('client_services')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('title', 255);
            $table->string('period', 100);
            $table->string('file_url', 500)->nullable();
            $table->json('metrics')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 7. Client Health Scores
        Schema::create('client_health_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->unique()->constrained('clients')->cascadeOnDelete();
            $table->decimal('score', 5, 2)->default(100.00);
            $table->decimal('ticket_score', 5, 2)->default(100.00);
            $table->decimal('payment_score', 5, 2)->default(100.00);
            $table->decimal('engagement_score', 5, 2)->default(100.00);
            $table->decimal('feedback_score', 5, 2)->default(100.00);
            $table->decimal('response_score', 5, 2)->default(100.00);
            $table->enum('status', ['healthy', 'at_risk', 'churning'])->default('healthy');
            $table->dateTime('calculated_at');
            $table->timestamps();
        });

        // 8. Invoices (Retainer & Billing Invoices)
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('client_service_id')->nullable()->constrained('client_services')->nullOnDelete();
            $table->string('invoice_number', 50)->unique();
            $table->date('issue_date');
            $table->date('due_date');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('cgst_amount', 12, 2)->default(0);
            $table->decimal('sgst_amount', 12, 2)->default(0);
            $table->decimal('igst_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->enum('status', ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'])->default('sent');
            $table->dateTime('paid_at')->nullable();
            $table->json('line_items')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('client_health_scores');
        Schema::dropIfExists('service_reports');
        Schema::dropIfExists('service_requests');
        Schema::dropIfExists('client_documents');
        Schema::dropIfExists('client_services');
        Schema::dropIfExists('client_branding');
        Schema::dropIfExists('clients');
    }
};
