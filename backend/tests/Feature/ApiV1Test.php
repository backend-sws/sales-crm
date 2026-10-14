<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ApiV1Test extends TestCase
{
    use DatabaseTransactions;

    public function test_health_check_returns_standard_response(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'statusCode',
                'message',
                'data' => ['environment', 'framework', 'version', 'timestamp'],
                'errors',
                'meta' => ['timestamp', 'version'],
            ])
            ->assertJson(['success' => true, 'statusCode' => 200]);
    }

    public function test_auth_login_and_authenticated_endpoints(): void
    {
        $testEmail = 'agent_'.uniqid().'@salescrm.com';

        $user = User::factory()->create([
            'email' => $testEmail,
            'password' => bcrypt('secret123'),
        ]);

        // Login
        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => $testEmail,
            'password' => 'secret123',
        ]);

        $loginResponse->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'statusCode',
                'message',
                'data' => [
                    'user' => ['id', 'name', 'email'],
                    'token',
                    'token_type',
                ],
                'errors',
                'meta',
            ]);

        $token = $loginResponse->json('data.token');

        // Fetch User profile
        $userResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/auth/user');

        $userResponse->assertStatus(200)
            ->assertJsonPath('data.email', $testEmail);

        // Fetch Dashboard metrics
        $dashboardResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/dashboard');

        $dashboardResponse->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'summary' => ['total_leads', 'total_pipeline_value', 'won_deals_value', 'conversion_rate_percentage'],
                    'funnel_breakdown',
                    'recent_leads',
                ],
            ]);

        // Create Lead
        $leadResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/leads', [
                'name' => 'Acme Corporation',
                'email' => 'contact@acme.com',
                'company' => 'Acme Corp',
                'status' => 'new',
                'value' => 50000,
            ]);

        $leadResponse->assertStatus(201)
            ->assertJsonPath('data.name', 'Acme Corporation');
    }

    public function test_validation_errors_return_standard_envelope(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'not-an-email',
            // missing password
        ]);

        $response->assertStatus(422)
            ->assertJsonStructure([
                'success',
                'statusCode',
                'message',
                'data',
                'errors',
                'meta',
            ])
            ->assertJson([
                'success' => false,
                'statusCode' => 422,
            ]);
    }

    public function test_phase_two_executive_analytics_and_revenue_forecast(): void
    {
        Role::firstOrCreate(['name' => 'super_admin']);
        Role::firstOrCreate(['name' => 'sales_agent']);

        $admin = User::factory()->create();
        $admin->assignRole('super_admin');
        $token = $admin->createToken('test_admin')->plainTextToken;

        // 1. Executive Overview
        $overviewRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/analytics/overview');

        $overviewRes->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['metrics', 'forecast_summary', 'funnel_breakdown'],
            ]);

        // 2. Revenue Forecast
        $forecastRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/analytics/forecast');

        $forecastRes->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'stages',
                    'summary' => ['raw_open_pipeline', 'weighted_forecast_open'],
                ],
            ]);

        // 3. Lost Deal Analysis
        $lostRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/analytics/lost-deal-analysis');

        $lostRes->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['total_lost_count', 'total_lost_value', 'by_reason', 'by_agent', 'by_source'],
            ]);

        // 4. Gamified Leaderboard
        $leaderboardRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/analytics/leaderboard');

        $leaderboardRes->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['agent_id', 'name', 'won_revenue', 'won_count', 'rank', 'badges'],
                ],
            ]);
    }

    public function test_phase_two_impersonation_lifecycle_and_destructive_action_blocking(): void
    {
        Role::firstOrCreate(['name' => 'super_admin']);
        Role::firstOrCreate(['name' => 'sales_agent']);

        $admin = User::factory()->create(['name' => 'Super Admin User']);
        $admin->assignRole('super_admin');
        $adminToken = $admin->createToken('admin_auth')->plainTextToken;

        $target = User::factory()->create(['name' => 'Target Sales Agent']);
        $target->assignRole('sales_agent');

        // 1. Start Impersonation
        $startRes = $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/impersonate/{$target->id}", [
                'reason' => 'Verifying permissions and UI dashboard behavior',
            ]);

        $startRes->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => ['token', 'impersonation_log_id', 'target_user', 'admin'],
            ]);

        $impersonatedToken = $startRes->json('data.token');
        $logId = $startRes->json('data.impersonation_log_id');

        // Reset test auth state so Sanctum re-evaluates the new bearer token
        $this->app['auth']->forgetGuards();

        // 2. Destructive Action Must Be Blocked (HTTP 403)
        $blockedRes = $this->withHeader('Authorization', "Bearer {$impersonatedToken}")
            ->postJson('/api/v1/admin/users', [
                'name'     => 'Unauthorized Added User',
                'email'    => 'hack_'.uniqid().'@salescrm.com',
                'role'     => 'super_admin',
                'password' => 'secret12345',
            ]);

        $blockedRes->assertStatus(403)
            ->assertJson(['success' => false, 'statusCode' => 403]);

        // 3. Exit Impersonation
        $this->app['auth']->forgetGuards();
        $exitRes = $this->withHeader('Authorization', "Bearer {$impersonatedToken}")
            ->postJson('/api/v1/admin/impersonate/exit', [
                'impersonation_log_id' => $logId,
            ]);

        $exitRes->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_phase_two_scheduled_reports_and_audit_trail_export(): void
    {
        Role::firstOrCreate(['name' => 'super_admin']);
        $admin = User::factory()->create();
        $admin->assignRole('super_admin');
        $token = $admin->createToken('test_reports')->plainTextToken;

        // 1. Trigger Scheduled Report Creation
        $reportRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/reports/scheduled', [
                'report_type' => 'weekly_digest',
                'frequency'   => 'weekly',
            ]);

        $reportRes->assertStatus(201)
            ->assertJsonPath('data.report_type', 'weekly_digest')
            ->assertJsonPath('data.status', 'ready');

        // 2. List Scheduled Reports
        $listRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/reports/scheduled');

        $listRes->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['id', 'report_type', 'frequency', 'status', 'file_url'],
                ],
            ]);

        // 3. Audit Logs Retrieval
        $auditRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/admin/audit-logs');

        $auditRes->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['id', 'log_name', 'description', 'created_at'],
                ],
            ]);

        // 4. Audit Trail CSV Export
        $exportRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->get('/api/v1/admin/audit-logs/export');

        $exportRes->assertStatus(200);
        $this->assertStringContainsString('Log ID,Timestamp,Category', $exportRes->getContent());
    }
}
