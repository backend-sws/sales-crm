<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectChannel;
use App\Models\ProjectMessage;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PhaseFiveAdvancedIntegrationsTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $pmUser;
    protected User $devUser;
    protected User $clientUser;
    protected Client $client;
    protected Project $project;
    protected Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure roles
        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'developer', 'guard_name' => 'api']);
        Role::firstOrCreate(['name' => 'client', 'guard_name' => 'api']);

        $this->adminUser = User::factory()->create(['email' => 'admin5@salescrm.com']);
        $this->adminUser->assignRole('super_admin');

        $this->pmUser = User::factory()->create(['email' => 'pm5@salescrm.com']);
        $this->pmUser->assignRole('project_manager');

        $this->devUser = User::factory()->create(['email' => 'dev5@salescrm.com']);
        $this->devUser->assignRole('developer');

        $this->client = Client::create([
            'name'    => 'Vikram Singhania',
            'company' => 'Global Freight Corp',
            'email'   => 'vikram@globalfreight.in',
            'status'  => 'active',
        ]);

        $this->clientUser = User::factory()->create([
            'email'     => 'vikram@globalfreight.in',
            'client_id' => $this->client->id,
        ]);
        $this->clientUser->assignRole('client');

        $this->project = Project::create([
            'client_id'    => $this->client->id,
            'pm_id'        => $this->pmUser->id,
            'name'         => 'Logistics Mobile ERP',
            'total_budget' => 500000.0,
            'total_value'  => 650000.0,
            'status'       => 'in_dev',
        ]);

        $this->task = Task::create([
            'project_id'      => $this->project->id,
            'title'           => 'Fleet GPS Tracking API',
            'status'          => 'in_progress',
            'priority'        => 'high',
            'assignee_id'     => $this->devUser->id,
            'estimated_hours' => 12.0,
        ]);
    }

    public function test_it_generates_presigned_upload_metadata(): void
    {
        $response = $this->actingAs($this->devUser, 'sanctum')
            ->postJson('/api/v1/storage/presigned-upload', [
                'file_name'       => 'architecture_diagram.png',
                'file_type'       => 'image/png',
                'file_size_bytes' => 102400,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'storage_path',
                    'upload_url',
                    'public_url',
                ]
            ]);
    }

    public function test_it_initializes_slack_channels_and_hides_internal_notes_from_clients(): void
    {
        // 1. Staff sees both #general and #internal-notes
        $staffResp = $this->actingAs($this->pmUser, 'sanctum')
            ->getJson("/api/v1/projects/{$this->project->id}/channels");

        $staffResp->assertStatus(200);
        $names = collect($staffResp->json('data'))->pluck('name')->all();
        $this->assertContains('general', $names);
        $this->assertContains('internal-notes', $names);

        // 2. Client sees ONLY #general
        $clientResp = $this->actingAs($this->clientUser, 'sanctum')
            ->getJson("/api/v1/projects/{$this->project->id}/channels");

        $clientResp->assertStatus(200);
        $clientNames = collect($clientResp->json('data'))->pluck('name')->all();
        $this->assertContains('general', $clientNames);
        $this->assertNotContains('internal-notes', $clientNames);

        // 3. Client direct access to internal-notes is blocked with 403 Forbidden
        $internalChannel = ProjectChannel::where('project_id', $this->project->id)
            ->where('name', 'internal-notes')
            ->first();

        $forbiddenResp = $this->actingAs($this->clientUser, 'sanctum')
            ->getJson("/api/v1/channels/{$internalChannel->id}/messages");

        $forbiddenResp->assertStatus(403);
    }

    public function test_it_sends_chat_messages_with_code_snippets_and_attachments(): void
    {
        $generalChannel = ProjectChannel::firstOrCreate(
            ['project_id' => $this->project->id, 'name' => 'general'],
            ['is_internal' => false]
        );

        $response = $this->actingAs($this->devUser, 'sanctum')
            ->postJson("/api/v1/channels/{$generalChannel->id}/messages", [
                'content'       => 'Completed the telemetry parser! Check the snippet below:',
                'code_snippet'  => 'function getGpsCoordinates() { return { lat: 19.0760, lng: 72.8777 }; }',
                'code_language' => 'typescript',
                'attachments'   => [
                    [
                        'file_name'       => 'gps_spec.pdf',
                        'file_url'        => 'http://localhost/storage/gps_spec.pdf',
                        'file_type'       => 'application/pdf',
                        'file_size_bytes' => 45000,
                    ]
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.code_language', 'typescript')
            ->assertJsonCount(1, 'data.attachments');

        $messageId = $response->json('data.id');

        // Toggle emoji reaction
        $reactResp = $this->actingAs($this->pmUser, 'sanctum')
            ->postJson("/api/v1/messages/{$messageId}/react", [
                'emoji' => '🚀',
            ]);

        $reactResp->assertStatus(200)
            ->assertJsonPath('data.action', 'added');
    }

    public function test_it_ingests_and_simulates_github_commits_with_task_linkage(): void
    {
        // Simulate a commit linked to TASK-{id}
        $simResp = $this->actingAs($this->pmUser, 'sanctum')
            ->postJson("/api/v1/projects/{$this->project->id}/github/simulate-webhook", [
                'type'      => 'commit',
                'task_id'   => $this->task->id,
                'message'   => "feat: TASK-{$this->task->id}: Implement live GPS socket stream",
                'additions' => 140,
                'deletions' => 20,
            ]);

        $simResp->assertStatus(201)
            ->assertJsonPath('data.item.task_id', $this->task->id);

        // Fetch Git Analytics
        $analyticsResp = $this->actingAs($this->pmUser, 'sanctum')
            ->getJson("/api/v1/projects/{$this->project->id}/github/analytics");

        $analyticsResp->assertStatus(200)
            ->assertJsonPath('data.repo_configured', true)
            ->assertJsonPath('data.total_commits', 1)
            ->assertJsonPath('data.total_additions', 140)
            ->assertJsonPath('data.total_deletions', 20)
            ->assertJsonPath('data.net_lines', 120);
    }

    public function test_it_provides_resilient_ai_recommendations_and_sprint_risk(): void
    {
        $meeting = $this->project->meetings()->create([
            'title'        => 'Weekly Scope & Architecture Review',
            'scheduled_at' => now(),
            'agenda'       => 'Review GPS latency and decide on cloud broker',
            'mom_notes'    => "Decided: Switch to Redis pub/sub for lower latency.\nAction: PM to test staging broker connection.\nAction: Developer to document WebSocket payload format.",
        ]);

        $aiResp = $this->actingAs($this->pmUser, 'sanctum')
            ->postJson("/api/v1/ai/meetings/{$meeting->id}/summarize");

        $aiResp->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'executive_summary',
                    'key_decisions',
                    'action_items',
                    'powered_by',
                ]
            ]);
    }

    public function test_it_submits_client_feedback_and_calculates_developer_performance(): void
    {
        // 1. Client rates task
        $feedbackResp = $this->actingAs($this->clientUser, 'sanctum')
            ->postJson("/api/v1/feedback/tasks/{$this->task->id}", [
                'rating'           => 4.8,
                'quality'          => 5,
                'communication'    => 5,
                'timeliness'       => 4,
                'understanding'    => 5,
                'would_work_again' => true,
                'comment'          => 'Flawless execution on the GPS API!',
            ]);

        $feedbackResp->assertStatus(201)
            ->assertJsonPath('data.developer_id', $this->devUser->id);

        // 2. Fetch Developer Performance Scorecard
        $perfResp = $this->actingAs($this->devUser, 'sanctum')
            ->getJson("/api/v1/developers/{$this->devUser->id}/performance");

        $perfResp->assertStatus(200)
            ->assertJsonPath('data.developer_id', $this->devUser->id)
            ->assertJsonStructure([
                'data' => [
                    'score' => [
                        'final_score',
                        'client_score',
                        'ontime_score',
                        'rework_score',
                        'breakdown_json',
                    ],
                    'feedbacks',
                ]
            ]);
    }
}
