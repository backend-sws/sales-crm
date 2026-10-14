<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Project;
use App\Models\ScopeVersion;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PhaseFourProjectTrackTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $pmUser;
    protected User $devUser;
    protected User $clientUser;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup roles
        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'developer', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'client', 'guard_name' => 'api']);

        $this->adminUser = User::factory()->create([
            'email'       => 'admin@salescrm.com',
            'hourly_rate' => 100.0,
        ]);
        $this->adminUser->assignRole('super_admin');

        $this->pmUser = User::factory()->create([
            'email'       => 'pm@salescrm.com',
            'hourly_rate' => 80.0,
        ]);
        $this->pmUser->assignRole('project_manager');

        $this->devUser = User::factory()->create([
            'email'       => 'dev@salescrm.com',
            'hourly_rate' => 50.0,
        ]);
        $this->devUser->assignRole('developer');

        $this->client = Client::create([
            'name'          => 'Rahul Sharma',
            'company'       => 'Apex Tech Solutions',
            'email'         => 'rahul@apextech.in',
            'billing_state' => 'Maharashtra',
            'status'        => 'active',
        ]);

        $this->clientUser = User::factory()->create([
            'email'     => 'rahul@apextech.in',
            'client_id' => $this->client->id,
        ]);
        $this->clientUser->assignRole('client');
    }

    public function test_can_create_project_with_milestones(): void
    {
        $response = $this->actingAs($this->pmUser, 'sanctum')
            ->postJson('/api/v1/projects', [
                'client_id'     => $this->client->id,
                'name'          => 'Apex E-Commerce Platform',
                'description'   => 'Custom Next.js & Laravel headless store',
                'total_value'   => 500000,
                'total_budget'  => 300000,
                'initial_scope' => '# SOW Scope v1\n- Auth\n- Product catalog\n- Payment gateway',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Apex E-Commerce Platform')
            ->assertJsonPath('data.status', 'draft');

        $projectId = $response->json('data.id');

        // Add milestone
        $msResponse = $this->actingAs($this->pmUser, 'sanctum')
            ->postJson("/api/v1/projects/{$projectId}/milestones", [
                'title'  => 'Milestone 1: Backend Architecture',
                'amount' => 150000,
            ]);

        $msResponse->assertStatus(201)
            ->assertJsonPath('data.title', 'Milestone 1: Backend Architecture');

        $this->assertDatabaseHas('projects', ['name' => 'Apex E-Commerce Platform']);
        $this->assertDatabaseHas('scope_versions', ['project_id' => $projectId, 'version_number' => 1]);
    }

    public function test_scope_version_digital_approval_locks_baseline(): void
    {
        $project = Project::create([
            'client_id'    => $this->client->id,
            'name'         => 'CRM Integration',
            'status'       => 'draft',
            'total_value'  => 200000,
            'total_budget' => 120000,
        ]);

        $scope = ScopeVersion::create([
            'project_id'     => $project->id,
            'version_number' => 1,
            'document_body'  => 'Scope deliverables baseline text',
            'status'         => 'pending_approval',
        ]);

        $response = $this->actingAs($this->clientUser, 'sanctum')
            ->postJson("/api/v1/scope-versions/{$scope->id}/approve", [
                'signer_name'    => 'Rahul Sharma',
                'signature_data' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                'signature_type' => 'drawn',
            ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('scope_approvals', [
            'scope_version_id' => $scope->id,
            'signer_name'      => 'Rahul Sharma',
        ]);

        $this->assertDatabaseHas('scope_versions', [
            'id'          => $scope->id,
            'is_baseline' => true,
            'status'      => 'approved',
        ]);

        $this->assertDatabaseHas('projects', [
            'id'     => $project->id,
            'status' => 'scope_approved',
        ]);
    }

    public function test_task_dependency_blocks_moving_to_in_progress(): void
    {
        $project = Project::create([
            'client_id'   => $this->client->id,
            'name'        => 'Fintech App',
            'status'      => 'in_dev',
            'total_value' => 100000,
        ]);

        $taskA = Task::create([
            'project_id' => $project->id,
            'title'      => 'Task A: Database Design',
            'status'     => 'in_progress',
        ]);

        $taskB = Task::create([
            'project_id' => $project->id,
            'title'      => 'Task B: API Implementation',
            'status'     => 'backlog',
        ]);

        // Task B depends on Task A
        $taskB->dependsOn()->attach($taskA->id);

        // Attempting to move Task B to in_progress while Task A is not done MUST fail
        $response = $this->actingAs($this->devUser, 'sanctum')
            ->patchJson("/api/v1/tasks/{$taskB->id}/status", [
                'status' => 'in_progress',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        // Now finish Task A
        $taskA->update(['status' => 'done']);

        // Now Task B can successfully move to in_progress
        $okResponse = $this->actingAs($this->devUser, 'sanctum')
            ->patchJson("/api/v1/tasks/{$taskB->id}/status", [
                'status' => 'in_progress',
            ]);

        $okResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'in_progress');
    }

    public function test_mandatory_proof_gate_blocks_moving_to_client_review(): void
    {
        $project = Project::create([
            'client_id'   => $this->client->id,
            'name'        => 'Proof Gate Test',
            'status'      => 'in_dev',
            'total_value' => 50000,
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'title'      => 'Landing Page Design',
            'status'     => 'qa',
        ]);

        // Moving to client_review without proof must fail
        $response = $this->actingAs($this->devUser, 'sanctum')
            ->patchJson("/api/v1/tasks/{$task->id}/status", [
                'status' => 'client_review',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['proof']);

        // Attach proof of work
        $proofRes = $this->actingAs($this->devUser, 'sanctum')
            ->postJson("/api/v1/tasks/{$task->id}/proof", [
                'file_name' => 'staging_demo.mp4',
                'file_type' => 'video',
                'url'       => 'https://loom.com/share/demo123',
                'notes'     => 'Interactive video walkthrough of page features',
            ]);

        $proofRes->assertStatus(201);

        // Now moving to client_review should succeed
        $okResponse = $this->actingAs($this->devUser, 'sanctum')
            ->patchJson("/api/v1/tasks/{$task->id}/status", [
                'status' => 'client_review',
            ]);

        $okResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'client_review');
    }

    public function test_client_accept_and_reject_flow(): void
    {
        $project = Project::create([
            'client_id'   => $this->client->id,
            'name'        => 'Client Review Flow',
            'status'      => 'client_review',
            'total_value' => 50000,
        ]);

        $task = Task::create([
            'project_id' => $project->id,
            'title'      => 'Header Navigation',
            'status'     => 'client_review',
        ]);

        // Reject flow increments rework_count and bounces to in_progress
        $rejectRes = $this->actingAs($this->clientUser, 'sanctum')
            ->postJson("/api/v1/tasks/{$task->id}/client-decision", [
                'action' => 'reject',
                'reason' => 'Dropdown menu does not close on mobile screen click.',
            ]);

        $rejectRes->assertStatus(200)
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.rework_count', 1);

        // Accept flow moves to done and records rating
        $acceptRes = $this->actingAs($this->clientUser, 'sanctum')
            ->postJson("/api/v1/tasks/{$task->id}/client-decision", [
                'action' => 'accept',
                'rating' => 5,
                'reason' => 'Looks great, thank you!',
            ]);

        $acceptRes->assertStatus(200)
            ->assertJsonPath('data.status', 'done')
            ->assertJsonPath('data.client_rating', 5);
    }

    public function test_time_tracking_and_budget_margin_computation(): void
    {
        $project = Project::create([
            'client_id'    => $this->client->id,
            'name'         => 'Time & Budget App',
            'status'       => 'in_dev',
            'total_value'  => 10000, // ₹10,000 client price
            'total_budget' => 6000,  // ₹6,000 budget
        ]);

        $task = Task::create([
            'project_id'      => $project->id,
            'assignee_id'     => $this->devUser->id,
            'title'           => 'Implement Auth',
            'estimated_hours' => 20, // 20h * 50 = ₹1,000 estimated
            'status'          => 'in_progress',
        ]);

        // 1. Start Live Timer
        $startRes = $this->actingAs($this->devUser, 'sanctum')
            ->postJson("/api/v1/tasks/{$task->id}/timer/start");

        $startRes->assertStatus(201);
        $entryId = $startRes->json('data.id');

        // Check active timer
        $activeRes = $this->actingAs($this->devUser, 'sanctum')
            ->getJson('/api/v1/time-entries/active');

        $activeRes->assertStatus(200)
            ->assertJsonPath('data.id', $entryId);

        // 2. Stop Timer
        $stopRes = $this->actingAs($this->devUser, 'sanctum')
            ->postJson("/api/v1/time-entries/{$entryId}/stop", [
                'description' => 'Completed login and token authorization setup',
            ]);

        $stopRes->assertStatus(200);

        // 3. Manual worklog (10 hours @ ₹50/hr = ₹500)
        $manualRes = $this->actingAs($this->devUser, 'sanctum')
            ->postJson("/api/v1/tasks/{$task->id}/time-entries", [
                'duration_hours' => 10,
                'is_billable'    => true,
                'description'    => 'Deep debugging session',
            ]);

        $manualRes->assertStatus(201);

        // 4. Verify budget snapshot
        $budgetRes = $this->actingAs($this->pmUser, 'sanctum')
            ->getJson("/api/v1/projects/{$project->id}/budget");

        $budgetRes->assertStatus(200);
        $data = $budgetRes->json('data');

        $this->assertEquals(6000, $data['total_budget']);
        $this->assertEquals(10000, $data['total_value']);
        $this->assertGreaterThanOrEqual(500, $data['actual_cost']); // at least ₹500
        $this->assertLessThanOrEqual(9500, $data['gross_margin']);
    }

    public function test_sprint_creation_and_burndown_dataset(): void
    {
        $project = Project::create([
            'client_id'   => $this->client->id,
            'name'        => 'Sprint Test App',
            'status'      => 'in_dev',
            'total_value' => 50000,
        ]);

        $sprintRes = $this->actingAs($this->pmUser, 'sanctum')
            ->postJson("/api/v1/projects/{$project->id}/sprints", [
                'name'            => 'Sprint 1 - Foundation',
                'start_date'      => now()->toDateString(),
                'end_date'        => now()->addDays(13)->toDateString(),
                'velocity_target' => 40,
                'status'          => 'active',
            ]);

        $sprintRes->assertStatus(201);
        $sprintId = $sprintRes->json('data.id');

        // Create tasks and assign to sprint
        $t1 = Task::create([
            'project_id'   => $project->id,
            'sprint_id'    => $sprintId,
            'title'        => 'Task 1',
            'story_points' => 8,
            'status'       => 'done',
            'completed_at' => now(),
        ]);

        $t2 = Task::create([
            'project_id'   => $project->id,
            'sprint_id'    => $sprintId,
            'title'        => 'Task 2',
            'story_points' => 13,
            'status'       => 'in_progress',
        ]);

        // Get burndown data
        $bdRes = $this->actingAs($this->pmUser, 'sanctum')
            ->getJson("/api/v1/sprints/{$sprintId}/burndown");

        $bdRes->assertStatus(200)
            ->assertJsonPath('data.total_scope', 21)
            ->assertJsonPath('data.total_days', 14);

        $this->assertNotEmpty($bdRes->json('data.burndown_points'));
    }

    public function test_change_request_approval_auto_creates_task(): void
    {
        $project = Project::create([
            'client_id'    => $this->client->id,
            'name'         => 'CR Auto-Task App',
            'status'       => 'in_dev',
            'total_value'  => 50000,
            'total_budget' => 30000,
        ]);

        // Client raises Change Request
        $crRes = $this->actingAs($this->clientUser, 'sanctum')
            ->postJson("/api/v1/projects/{$project->id}/change-requests", [
                'title'               => 'Add Multi-Currency Support (USD, EUR, GBP)',
                'description'         => 'Support real-time currency conversion on checkout',
                'estimated_hours'     => 16,
                'additional_cost'     => 15000,
                'timeline_delay_days' => 3,
            ]);

        $crRes->assertStatus(201);
        $crId = $crRes->json('data.id');

        // Client approves Change Request
        $decisionRes = $this->actingAs($this->clientUser, 'sanctum')
            ->patchJson("/api/v1/change-requests/{$crId}/decision", [
                'decision' => 'approved',
                'notes'    => 'Approved for production integration',
            ]);

        $decisionRes->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');

        // Verify task auto-created
        $this->assertDatabaseHas('tasks', [
            'project_id'  => $project->id,
            'source_type' => 'change_request',
            'source_id'   => $crId,
            'title'       => 'CR: Add Multi-Currency Support (USD, EUR, GBP)',
        ]);

        // Verify project total value incremented
        $freshProject = $project->fresh();
        $this->assertEquals(65000, $freshProject->total_value);
    }
}
