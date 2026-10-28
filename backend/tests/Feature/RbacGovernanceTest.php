<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RbacGovernanceTest extends TestCase
{
    use DatabaseTransactions;

    protected User $superAdmin;
    protected User $salesAgent;
    protected User $developer;
    protected User $clientUser;
    protected Client $clientRecord;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        // 1. Super Admin
        $this->superAdmin = User::firstOrCreate(
            ['email' => 'superadmin_test@salescrm.com'],
            ['name' => 'Super Admin Test', 'password' => bcrypt('password123')]
        );
        $this->superAdmin->syncRoles(['super_admin']);

        // 2. Sales Agent
        $this->salesAgent = User::firstOrCreate(
            ['email' => 'agent_test@salescrm.com'],
            ['name' => 'Agent Test', 'password' => bcrypt('password123')]
        );
        $this->salesAgent->syncRoles(['sales_agent']);

        // 3. Developer
        $this->developer = User::firstOrCreate(
            ['email' => 'dev_test@salescrm.com'],
            ['name' => 'Dev Test', 'password' => bcrypt('password123')]
        );
        $this->developer->syncRoles(['developer']);

        // 4. Client
        $this->clientRecord = Client::create([
            'name'         => 'Test Enterprise Client',
            'company'      => 'Enterprise Corp',
            'email'        => 'contact@enterprise.com',
            'phone'        => '9123456789',
            'status'       => 'active',
            'account_type' => 'project_based',
        ]);

        $this->clientUser = User::firstOrCreate(
            ['email' => 'client_test@salescrm.com'],
            [
                'name'      => 'Client User Test',
                'password'  => bcrypt('password123'),
                'client_id' => $this->clientRecord->id,
            ]
        );
        $this->clientUser->syncRoles(['client']);
    }

    public function test_super_admin_can_fetch_roles_and_permissions_matrix(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/admin/roles-permissions');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'roles',
                    'matrix',
                    'categories',
                    'total_permissions',
                ],
            ]);
    }

    public function test_non_super_admin_cannot_access_roles_permissions_matrix(): void
    {
        // Sales Agent cannot access
        $res1 = $this->actingAs($this->salesAgent, 'sanctum')
            ->getJson('/api/v1/admin/roles-permissions');
        $res1->assertStatus(403);

        // Developer cannot access
        $res2 = $this->actingAs($this->developer, 'sanctum')
            ->getJson('/api/v1/admin/roles-permissions');
        $res2->assertStatus(403);

        // Client cannot access
        $res3 = $this->actingAs($this->clientUser, 'sanctum')
            ->getJson('/api/v1/admin/roles-permissions');
        $res3->assertStatus(403);
    }

    public function test_super_admin_can_sync_role_permissions(): void
    {
        $roleName = 'developer';
        $newPermissions = ['tasks.view_assigned', 'tasks.update_status', 'chat.send', 'chat.view'];

        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/roles-permissions/sync', [
                'role'        => $roleName,
                'permissions' => $newPermissions,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.role', $roleName);

        $role = Role::findByName($roleName, 'api');
        $currentPerms = $role->permissions->pluck('name')->toArray();

        foreach ($newPermissions as $perm) {
            $this->assertContains($perm, $currentPerms);
        }
    }

    public function test_cannot_restrict_super_admin_permissions(): void
    {
        $response = $this->actingAs($this->superAdmin, 'sanctum')
            ->postJson('/api/v1/admin/roles-permissions/sync', [
                'role'        => 'super_admin',
                'permissions' => ['leads.view_own'],
            ]);

        $response->assertStatus(400);
    }

    public function test_unauthorized_roles_cannot_access_project_budget_endpoint(): void
    {
        $project = Project::create([
            'client_id'   => $this->clientRecord->id,
            'name'        => 'Budget Shield Test Project',
            'pm_id'       => $this->superAdmin->id,
            'total_value' => 500000,
        ]);

        // Developer gets 403 Forbidden
        $devRes = $this->actingAs($this->developer, 'sanctum')
            ->getJson("/api/v1/projects/{$project->id}/budget");
        $devRes->assertStatus(403);

        // Client gets 403 Forbidden
        $clientRes = $this->actingAs($this->clientUser, 'sanctum')
            ->getJson("/api/v1/projects/{$project->id}/budget");
        $clientRes->assertStatus(403);

        // Super Admin gets 200 OK
        $adminRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson("/api/v1/projects/{$project->id}/budget");
        $adminRes->assertStatus(200);
    }

    public function test_client_and_developer_projects_scoping(): void
    {
        // Project 1: Belonging to this->clientRecord
        $project1 = Project::create([
            'client_id'   => $this->clientRecord->id,
            'name'        => 'Client 1 Project',
            'pm_id'       => $this->superAdmin->id,
            'total_value' => 100000,
        ]);

        // Project 2: Belonging to another client
        $otherClient = Client::create([
            'name'         => 'Another Client',
            'company'      => 'Other Corp',
            'email'        => 'other@corp.com',
            'phone'        => '9123456788',
            'status'       => 'active',
            'account_type' => 'project_based',
        ]);
        $project2 = Project::create([
            'client_id'   => $otherClient->id,
            'name'        => 'Other Client Project',
            'pm_id'       => $this->superAdmin->id,
            'total_value' => 200000,
        ]);

        // Assign developer only to task on project1
        Task::create([
            'project_id'  => $project1->id,
            'title'       => 'Assigned Dev Task',
            'assignee_id' => $this->developer->id,
            'status'      => 'in_progress',
        ]);

        // 1. Client User verifies list (only project1 visible, project2 hidden)
        $clientListRes = $this->actingAs($this->clientUser, 'sanctum')
            ->getJson('/api/v1/projects');
        $clientListRes->assertStatus(200);
        $clientProjectIds = collect($clientListRes->json('data'))->pluck('id')->toArray();
        $this->assertContains($project1->id, $clientProjectIds);
        $this->assertNotContains($project2->id, $clientProjectIds);

        // 2. Developer verifies list (only project1 where task is assigned is visible)
        $devListRes = $this->actingAs($this->developer, 'sanctum')
            ->getJson('/api/v1/projects');
        $devListRes->assertStatus(200);
        $devProjectIds = collect($devListRes->json('data'))->pluck('id')->toArray();
        $this->assertContains($project1->id, $devProjectIds);
        $this->assertNotContains($project2->id, $devProjectIds);

        // 3. Super Admin sees all projects
        $adminListRes = $this->actingAs($this->superAdmin, 'sanctum')
            ->getJson('/api/v1/projects');
        $adminListRes->assertStatus(200);
        $adminProjectIds = collect($adminListRes->json('data'))->pluck('id')->toArray();
        $this->assertContains($project1->id, $adminProjectIds);
        $this->assertContains($project2->id, $adminProjectIds);
    }
}
