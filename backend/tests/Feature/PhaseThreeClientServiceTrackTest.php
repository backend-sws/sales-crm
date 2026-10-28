<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\ClientDocument;
use App\Models\ClientService;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class PhaseThreeClientServiceTrackTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected User $accountManager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::firstOrCreate(
            ['email' => 'admin_p3@salescrm.com'],
            ['name' => 'Admin P3 User', 'password' => bcrypt('password123')]
        );
        $this->admin->assignRole('super_admin');

        $this->accountManager = User::firstOrCreate(
            ['email' => 'am_p3@salescrm.com'],
            ['name' => 'Account Manager P3', 'password' => bcrypt('password123')]
        );
        if (\Spatie\Permission\Models\Role::where('name', 'account_manager')->exists()) {
            $this->accountManager->assignRole('account_manager');
        }
    }

    public function test_can_convert_won_lead_to_client_account(): void
    {
        $source = LeadSource::firstOrCreate(['name' => 'Direct Referral']);
        $lead = Lead::create([
            'name'        => 'Vikram Singhania',
            'company'     => 'Singhania Logistics Ltd',
            'email'       => 'vikram@singhanialogistics.com',
            'phone'       => '9820098200',
            'source'      => $source->name,
            'source_id'   => $source->id,
            'priority'    => 'hot',
            'status'      => 'proposal',
            'budget'      => 45000,
            'value'       => 45000,
            'assigned_to' => $this->accountManager->id,
        ]);

        $payload = [
            'name'               => 'Vikram Singhania',
            'company'            => 'Singhania Logistics Ltd',
            'email'              => 'vikram@singhanialogistics.com',
            'phone'              => '9820098200',
            'gst_number'         => '27AAAAA0000A1Z5',
            'billing_address'    => 'Tower B, BKC, Mumbai',
            'billing_state'      => 'Maharashtra',
            'account_manager_id' => $this->accountManager->id,
            'primary_color'      => '#0D9488',
            'create_user'        => true,
            'password'           => 'Secret123',
            'services'           => [
                [
                    'service_name'  => 'Enterprise CRM Managed Retainer',
                    'service_type'  => 'recurring',
                    'billing_cycle' => 'monthly',
                    'value'         => 45000,
                    'start_date'    => now()->toDateString(),
                ],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/leads/{$lead->id}/convert", $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.company', 'Singhania Logistics Ltd');

        $clientId = $response->json('data.id');

        // Verify database records
        $client = Client::find($clientId);
        $this->assertNotNull($client);
        $this->assertEquals('Maharashtra', $client->billing_state);
        $this->assertEquals('27AAAAA0000A1Z5', $client->gst_number);

        // Verify Lead status updated
        $lead->refresh();
        $this->assertEquals('won', $lead->status);
        $this->assertEquals($client->id, $lead->converted_client_id);

        // Verify White-label branding
        $this->assertNotNull($client->branding);
        $this->assertEquals('#0D9488', $client->branding->primary_color);

        // Verify Health score initialized to 100
        $this->assertNotNull($client->healthScore);
        $this->assertEquals(100.0, (float) $client->healthScore->score);
        $this->assertEquals('healthy', $client->healthScore->status);

        // Verify Service Track created
        $this->assertCount(1, $client->services);
        $this->assertEquals(45000.0, (float) $client->services[0]->value);

        // Verify User login created
        $user = User::where('email', 'vikram@singhanialogistics.com')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->hasRole('client'));
    }

    public function test_can_directly_create_client_account(): void
    {
        $payload = [
            'name'               => 'Rohan Mehra',
            'company'            => 'Mehra FinTech Solutions Pvt Ltd',
            'email'              => 'rohan@mehrafintech.com',
            'phone'              => '+91 9988776655',
            'gst_number'         => '27ABCDE1234F1Z5',
            'billing_address'    => 'B-402, Trade Center, BKC',
            'billing_state'      => 'Maharashtra',
            'service_name'       => 'Full-Stack Dedicated Retainer',
            'service_type'       => 'recurring',
            'billing_cycle'      => 'monthly',
            'service_value'      => 65000,
            'create_user'        => true,
            'password'           => 'Secret456',
            'primary_color'      => '#3B82F6',
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/clients', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.company', 'Mehra FinTech Solutions Pvt Ltd');

        $clientId = $response->json('data.id');
        $client = Client::find($clientId);
        $this->assertNotNull($client);
        $this->assertEquals('Maharashtra', $client->billing_state);
        $this->assertNotNull($client->branding);
        $this->assertNotNull($client->healthScore);
        $this->assertCount(1, $client->services);
        $this->assertEquals(65000.0, (float) $client->services[0]->value);

        $user = User::where('email', 'rohan@mehrafintech.com')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->hasRole('client'));
    }

    public function test_can_list_and_get_client_profile(): void
    {
        $client = Client::create([
            'name'                 => 'Pooja Verma',
            'company'              => 'Verma Infotech',
            'email'                => 'pooja@vermainfotech.com',
            'phone'                => '9811198111',
            'billing_state'        => 'Karnataka',
            'status'               => 'active',
            'onboarding_completed' => false,
        ]);

        $listRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/clients');

        $listRes->assertStatus(200)
            ->assertJsonPath('success', true);

        $showRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/clients/{$client->id}");

        $showRes->assertStatus(200)
            ->assertJsonPath('data.company', 'Verma Infotech');
    }

    public function test_ticket_lifecycle_and_client_confirmation(): void
    {
        $client = Client::create([
            'name'          => 'Rahul Jain',
            'company'       => 'Jain Enterprises',
            'email'         => 'rahul@jain.com',
            'billing_state' => 'Maharashtra',
            'status'        => 'active',
        ]);

        $service = ClientService::create([
            'client_id'         => $client->id,
            'service_name'      => 'SEO & Web Management',
            'service_type'      => 'recurring',
            'billing_cycle'     => 'monthly',
            'value'             => 20000,
            'status'            => 'active',
            'start_date'        => now()->toDateString(),
            'next_invoice_date' => now()->addMonth()->toDateString(),
        ]);

        // 1. Create Ticket
        $createTicketRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/services/{$service->id}/tickets", [
                'title'       => 'Fix Broken Landing Page Links',
                'description' => 'Ensure 301 redirects are properly mapped',
                'priority'    => 'high',
            ]);

        $createTicketRes->assertStatus(201)
            ->assertJsonPath('data.status', 'open');

        $ticketId = $createTicketRes->json('data.id');

        // 2. Transition Status to in_progress
        $statusRes = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticketId}/status", [
                'status' => 'in_progress',
            ]);

        $statusRes->assertStatus(200)
            ->assertJsonPath('data.status', 'in_progress');

        // 3. Transition to done
        $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/tickets/{$ticketId}/status", ['status' => 'done']);

        // 4. Client Confirms
        $confirmRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/tickets/{$ticketId}/confirm");

        $confirmRes->assertStatus(200)
            ->assertJsonPath('data.status', 'confirmed');

        $this->assertNotNull($confirmRes->json('data.confirmed_at'));
    }

    public function test_retainer_billing_calculates_correct_gst_and_payment(): void
    {
        // Intra-state client (Maharashtra) -> CGST 9% + SGST 9%
        $client = Client::create([
            'name'          => 'Aakash Deshmukh',
            'company'       => 'Deshmukh Media Pvt Ltd',
            'email'         => 'aakash@deshmukh.com',
            'billing_state' => 'Maharashtra',
            'status'        => 'active',
        ]);

        $service = ClientService::create([
            'client_id'         => $client->id,
            'service_name'      => 'Growth Retainer',
            'service_type'      => 'recurring',
            'billing_cycle'     => 'monthly',
            'value'             => 50000,
            'status'            => 'active',
            'start_date'        => now()->toDateString(),
            'next_invoice_date' => now()->toDateString(),
        ]);

        // Generate Invoice
        $invRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/services/{$service->id}/invoices/generate");

        $invRes->assertStatus(201);
        $invoice = Invoice::find($invRes->json('data.id'));

        $this->assertNotNull($invoice);
        $this->assertEquals(50000.0, (float) $invoice->subtotal);
        $this->assertEquals(4500.0, (float) $invoice->cgst_amount);
        $this->assertEquals(4500.0, (float) $invoice->sgst_amount);
        $this->assertEquals(0.0, (float) $invoice->igst_amount);
        $this->assertEquals(59000.0, (float) $invoice->total_amount);

        // Record Payment
        $payRes = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/invoices/{$invoice->id}/mark-paid", [
                'paid_amount'    => 59000,
                'payment_method' => 'bank_transfer',
                'notes'          => 'NEFT Transaction REF-998822',
            ]);

        $payRes->assertStatus(200)
            ->assertJsonPath('data.status', 'paid');
    }

    public function test_document_e_signing_and_audit_trail(): void
    {
        $client = Client::create([
            'name'          => 'Anita Roy',
            'company'       => 'Roy Designs',
            'email'         => 'anita@roydesigns.com',
            'billing_state' => 'West Bengal',
            'status'        => 'active',
        ]);

        // Upload Document
        $docRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/clients/{$client->id}/documents", [
                'title'    => 'Non-Disclosure Agreement (NDA)',
                'type'     => 'nda',
                'file_url' => 'https://cdn.example.com/contracts/nda.pdf',
            ]);

        $docRes->assertStatus(201)
            ->assertJsonPath('data.status', 'pending_signature');

        $docId = $docRes->json('data.id');

        // E-Sign Document
        $signRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/documents/{$docId}/sign", [
                'signer_name'         => 'Anita Roy',
                'signature_data_url'  => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            ]);

        $signRes->assertStatus(200)
            ->assertJsonPath('data.status', 'signed')
            ->assertJsonPath('data.signer_name', 'Anita Roy');

        $doc = ClientDocument::find($docId);
        $this->assertEquals('signed', $doc->status);
        $this->assertNotNull($doc->signed_at);
    }

    public function test_client_user_can_access_own_portal_profile(): void
    {
        $client = Client::create([
            'name'          => 'Karan Malhotra',
            'company'       => 'Malhotra Media',
            'email'         => 'karan@malhotra.com',
            'billing_state' => 'Delhi',
            'status'        => 'active',
        ]);

        $clientUser = User::create([
            'name'      => 'Karan Malhotra',
            'email'     => 'karan_user@malhotra.com',
            'password'  => bcrypt('password123'),
            'client_id' => $client->id,
            'is_active' => true,
        ]);
        $clientUser->assignRole('client');

        $res = $this->actingAs($clientUser, 'sanctum')
            ->getJson('/api/v1/client/portal-profile');

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.company', 'Malhotra Media');
    }

    public function test_can_create_direct_client_with_fixed_scope_service(): void
    {
        $payload = [
            'name'          => 'Rohit Verma',
            'company'       => 'Verma Technologies',
            'email'         => 'rohit@vermatech.com',
            'phone'         => '9876543210',
            'billing_state' => 'Karnataka',
            'service_name'  => 'Fixed Scope Deliverable MVP',
            'service_type'  => 'fixed_scope',
            'billing_cycle' => 'milestone',
            'service_value' => 50000,
            'create_user'   => true,
            'password'      => 'Client@123',
        ];

        $res = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/clients', $payload);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.company', 'Verma Technologies');

        $this->assertDatabaseHas('client_services', [
            'service_name'  => 'Fixed Scope Deliverable MVP',
            'service_type'  => 'fixed_scope',
            'billing_cycle' => 'milestone',
        ]);
    }

    public function test_artisan_phase_three_commands_run_cleanly(): void
    {
        $exitCodeInvoices = Artisan::call('billing:generate-retainer-invoices');
        $this->assertEquals(0, $exitCodeInvoices);

        $exitCodeHealth = Artisan::call('clients:recalculate-health');
        $this->assertEquals(0, $exitCodeHealth);
    }
}
