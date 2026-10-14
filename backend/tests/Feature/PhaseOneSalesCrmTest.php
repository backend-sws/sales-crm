<?php

namespace Tests\Feature;

use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PhaseOneSalesCrmTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected User $agent1;
    protected User $agent2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::firstOrCreate(
            ['email' => 'admin@salescrm.com'],
            ['name' => 'Admin User', 'password' => bcrypt('password123')]
        );
        $this->admin->assignRole('super_admin');

        $this->agent1 = User::firstOrCreate(
            ['email' => 'agent1_test@salescrm.com'],
            ['name' => 'Agent One', 'password' => bcrypt('password123')]
        );
        $this->agent1->assignRole('sales_agent');

        $this->agent2 = User::firstOrCreate(
            ['email' => 'agent2_test@salescrm.com'],
            ['name' => 'Agent Two', 'password' => bcrypt('password123')]
        );
        $this->agent2->assignRole('sales_agent');
    }

    public function test_can_get_leads_and_kanban_board(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/leads/kanban');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'new', 'contacted', 'interested', 'demo_meeting', 'proposal', 'negotiation', 'won', 'lost'
                ]
            ]);
    }

    public function test_can_create_lead_with_source_and_products(): void
    {
        $source = LeadSource::firstOrCreate(['name' => 'Test Web Source']);
        $product = Product::firstOrCreate(['name' => 'Test Software Package', 'type' => 'software']);

        $payload = [
            'name'        => 'Test Prospect Co',
            'email'       => 'prospect@example.com',
            'phone'       => '+91 99887 76655',
            'company'     => 'Prospect Enterprise',
            'city'        => 'Mumbai',
            'source_id'   => $source->id,
            'priority'    => 'hot',
            'budget'      => 150000.00,
            'product_ids' => [$product->id],
            'assigned_to' => $this->agent1->id,
        ];

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/leads', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Test Prospect Co')
            ->assertJsonPath('data.priority', 'hot');

        $leadId = $response->json('data.id');
        $this->assertDatabaseHas('leads', [
            'id'    => $leadId,
            'email' => 'prospect@example.com',
        ]);
        $this->assertDatabaseHas('lead_products', [
            'lead_id'    => $leadId,
            'product_id' => $product->id,
        ]);
        $this->assertDatabaseHas('lead_activities', [
            'lead_id' => $leadId,
            'type'    => 'created',
        ]);
    }

    public function test_status_update_requires_lost_reason_when_lost(): void
    {
        $lead = Lead::create([
            'name'   => 'Lost Candidate Lead',
            'phone'  => '+91 91234 56789',
            'status' => 'new',
        ]);

        // Attempt marking lost without reason -> expect 422
        $failResponse = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/leads/{$lead->id}/status", [
                'status' => 'lost',
            ]);

        $failResponse->assertStatus(422)
            ->assertJsonValidationErrors(['lost_reason']);

        // Marking lost with reason -> expect 200
        $successResponse = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/leads/{$lead->id}/status", [
                'status'      => 'lost',
                'lost_reason' => 'Competitor',
                'lost_notes'  => 'Selected cheaper alternative.',
            ]);

        $successResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'lost')
            ->assertJsonPath('data.lost_reason', 'Competitor');
    }

    public function test_can_assign_lead_and_bulk_assign(): void
    {
        $lead1 = Lead::create(['name' => 'Bulk Lead 1', 'status' => 'new']);
        $lead2 = Lead::create(['name' => 'Bulk Lead 2', 'status' => 'new']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/leads/bulk-assign', [
                'lead_ids' => [$lead1->id, $lead2->id],
                'agent_id' => $this->agent2->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.count', 2);

        $this->assertDatabaseHas('leads', ['id' => $lead1->id, 'assigned_to' => $this->agent2->id]);
        $this->assertDatabaseHas('leads', ['id' => $lead2->id, 'assigned_to' => $this->agent2->id]);
    }

    public function test_can_schedule_and_complete_chained_follow_up(): void
    {
        $lead = Lead::create([
            'name'        => 'Follow-up Lead',
            'status'      => 'contacted',
            'assigned_to' => $this->agent1->id,
        ]);

        // 1. Schedule follow-up
        $scheduleResponse = $this->actingAs($this->agent1, 'sanctum')
            ->postJson('/api/v1/follow-ups', [
                'lead_id'      => $lead->id,
                'type'         => 'call',
                'scheduled_at' => now()->addDay()->format('Y-m-d H:i:s'),
            ]);

        $scheduleResponse->assertStatus(201);
        $followUpId = $scheduleResponse->json('data.id');

        // 2. Complete follow-up with chained next follow-up
        $completeResponse = $this->actingAs($this->agent1, 'sanctum')
            ->patchJson("/api/v1/follow-ups/{$followUpId}/complete", [
                'outcome'           => 'Spoke with CFO. Demo agreed for next Monday.',
                'next_type'         => 'meeting',
                'next_scheduled_at' => now()->addDays(5)->format('Y-m-d H:i:s'),
            ]);

        $completeResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'done')
            ->assertJsonPath('data.outcome', 'Spoke with CFO. Demo agreed for next Monday.');

        $this->assertNotNull($completeResponse->json('data.next_follow_up_id'));
    }

    public function test_can_merge_duplicate_leads(): void
    {
        $master = Lead::create(['name' => 'Original Lead', 'email' => 'original@test.com', 'status' => 'contacted']);
        $duplicate = Lead::create(['name' => 'Duplicate Lead', 'email' => 'duplicate@test.com', 'status' => 'new']);

        // Schedule follow up on duplicate
        FollowUp::create([
            'lead_id'      => $duplicate->id,
            'agent_id'     => $this->agent1->id,
            'type'         => 'call',
            'scheduled_at' => now()->addDay(),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/leads/{$master->id}/merge", [
                'duplicate_lead_id' => $duplicate->id,
            ]);

        $response->assertStatus(200);

        // Duplicate must have master_lead_id set and be soft-deleted
        $this->assertSoftDeleted('leads', ['id' => $duplicate->id, 'master_lead_id' => $master->id]);

        // Duplicate's follow-up moved to master
        $this->assertDatabaseHas('follow_ups', ['lead_id' => $master->id]);

        // Audit log created
        $this->assertDatabaseHas('lead_merge_logs', [
            'master_lead_id' => $master->id,
            'merged_lead_id' => $duplicate->id,
        ]);
    }

    public function test_agent_only_sees_own_leads_in_paginated_list(): void
    {
        $agentLead = Lead::create(['name' => 'Agent Lead', 'assigned_to' => $this->agent1->id]);
        $otherLead = Lead::create(['name' => 'Other Lead', 'assigned_to' => $this->agent2->id]);

        $response = $this->actingAs($this->agent1, 'sanctum')
            ->getJson('/api/v1/leads');

        $response->assertStatus(200);
        $leadIds = collect($response->json('data'))->pluck('id');

        $this->assertTrue($leadIds->contains($agentLead->id));
        $this->assertFalse($leadIds->contains($otherLead->id));
    }
}
