<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Seed all 7 roles and their permissions.
     *
     * Roles:
     *   1. super_admin       – Company owner: all access + impersonation + audit
     *   2. sales_manager     – Sales head: team leads, reports, reassign
     *   3. sales_agent       – Salesperson: only their own assigned leads
     *   4. project_manager   – Delivery head: assigned projects, CR, meetings, tasks
     *   5. developer         – Dev: only assigned project tasks
     *   6. account_manager   – Service track: client tickets, monthly reports
     *   7. client            – External: only own services, projects, invoices
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // ─── PERMISSIONS ────────────────────────────────────────────────────────────

        $permissions = [
            // Users & Roles
            'users.view', 'users.create', 'users.edit', 'users.delete',
            'roles.assign',

            // Impersonation & Audit
            'impersonation.start',
            'audit.view',

            // Leads
            'leads.view_all',       // see all leads across agents
            'leads.view_own',       // see only own assigned leads
            'leads.create',
            'leads.edit',
            'leads.delete',
            'leads.assign',         // reassign to another agent
            'leads.import',
            'leads.export',
            'leads.convert',        // Won → Client conversion

            // Follow-ups
            'followups.view_all',
            'followups.view_own',
            'followups.create',
            'followups.complete',

            // Analytics & Reports
            'analytics.view_company',   // Super Admin / Manager: full company analytics
            'analytics.view_team',      // Manager: own team analytics
            'analytics.view_own',       // Agent: own performance only
            'reports.export',

            // Clients
            'clients.view_all',
            'clients.view_own',         // Agent can see their converted clients
            'clients.edit',

            // Service Track
            'services.view',
            'services.create',
            'service_tickets.view',
            'service_tickets.create',
            'service_tickets.update',
            'service_reports.upload',

            // Projects
            'projects.view_all',
            'projects.view_assigned',
            'projects.create',
            'projects.edit',

            // Scope / SOW
            'scope.create',
            'scope.approve',            // Client approves scope

            // Change Requests
            'change_requests.create',
            'change_requests.decide',   // Client approves/rejects CR

            // Meetings & MoM
            'meetings.create',
            'meetings.confirm',         // Client confirms MoM

            // Tasks
            'tasks.view_all',
            'tasks.view_assigned',
            'tasks.create',
            'tasks.update_status',
            'tasks.upload_proof',
            'tasks.accept',             // Client accepts task
            'tasks.reject',             // Client rejects task

            // Time Tracking
            'time_entries.create',
            'time_entries.view_all',

            // Milestones & Invoices
            'milestones.create',
            'invoices.view',
            'invoices.pay',             // Client pays invoice

            // GitHub
            'github.view_all',
            'github.view_own',

            // Chat
            'chat.send',
            'chat.view',

            // Feedback & Performance
            'feedback.give',
            'feedback.view_all',
            'feedback.view_own',
            'performance.view_all',
            'performance.view_own',

            // Settings
            'settings.manage',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'api']);
        }

        // ─── ROLES ───────────────────────────────────────────────────────────────────

        // 1. SUPER ADMIN — everything
        $superAdmin = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'api']);
        $superAdmin->syncPermissions(Permission::all());

        // 2. SALES MANAGER
        $salesManager = Role::firstOrCreate(['name' => 'sales_manager', 'guard_name' => 'api']);
        $salesManager->syncPermissions([
            'leads.view_all', 'leads.create', 'leads.edit', 'leads.assign',
            'leads.import', 'leads.export', 'leads.convert',
            'followups.view_all', 'followups.create', 'followups.complete',
            'analytics.view_company', 'analytics.view_team', 'reports.export',
            'clients.view_all',
            'services.view', 'service_tickets.view',
        ]);

        // 3. SALES AGENT
        $salesAgent = Role::firstOrCreate(['name' => 'sales_agent', 'guard_name' => 'api']);
        $salesAgent->syncPermissions([
            'leads.view_own', 'leads.create', 'leads.edit', 'leads.import', 'leads.convert',
            'followups.view_own', 'followups.create', 'followups.complete',
            'analytics.view_own',
            'clients.view_own',
        ]);

        // 4. PROJECT MANAGER
        $pm = Role::firstOrCreate(['name' => 'project_manager', 'guard_name' => 'api']);
        $pm->syncPermissions([
            'clients.view_all',
            'projects.view_all', 'projects.create', 'projects.edit',
            'scope.create',
            'change_requests.create',
            'meetings.create',
            'tasks.view_all', 'tasks.create', 'tasks.update_status', 'tasks.upload_proof',
            'time_entries.view_all',
            'milestones.create', 'invoices.view',
            'github.view_all',
            'chat.send', 'chat.view',
            'feedback.view_all',
            'performance.view_all',
            'service_tickets.view', 'service_tickets.update',
        ]);

        // 5. DEVELOPER
        $developer = Role::firstOrCreate(['name' => 'developer', 'guard_name' => 'api']);
        $developer->syncPermissions([
            'projects.view_assigned',
            'tasks.view_assigned', 'tasks.update_status', 'tasks.upload_proof',
            'time_entries.create',
            'github.view_own',
            'chat.send', 'chat.view',
            'feedback.view_own',
            'performance.view_own',
        ]);

        // 6. ACCOUNT MANAGER
        $accountManager = Role::firstOrCreate(['name' => 'account_manager', 'guard_name' => 'api']);
        $accountManager->syncPermissions([
            'clients.view_all', 'clients.edit',
            'services.view', 'services.create',
            'service_tickets.view', 'service_tickets.create', 'service_tickets.update',
            'service_reports.upload',
            'analytics.view_own',
        ]);

        // 7. CLIENT — external user, restricted to own data
        $client = Role::firstOrCreate(['name' => 'client', 'guard_name' => 'api']);
        $client->syncPermissions([
            'scope.approve',
            'change_requests.decide',
            'meetings.confirm',
            'tasks.accept', 'tasks.reject',
            'invoices.view', 'invoices.pay',
            'chat.send', 'chat.view',
            'feedback.give',
            'service_tickets.create',
        ]);

        // ─── SEED DEMO USERS (one per role) ──────────────────────────────────────────

        $demoUsers = [
            [
                'name'     => 'Sales Admin',
                'email'    => 'admin@salescrm.com',
                'phone'    => '+91 99000 00001',
                'password' => Hash::make('password123'),
                'role'     => 'super_admin',
            ],
            [
                'name'     => 'Rakesh Manager',
                'email'    => 'manager@salescrm.com',
                'phone'    => '+91 99000 00002',
                'password' => Hash::make('password123'),
                'role'     => 'sales_manager',
            ],
            [
                'name'     => 'Rahul Agent',
                'email'    => 'agent@salescrm.com',
                'phone'    => '+91 99000 00003',
                'password' => Hash::make('password123'),
                'role'     => 'sales_agent',
            ],
            [
                'name'     => 'Priya PM',
                'email'    => 'pm@salescrm.com',
                'phone'    => '+91 99000 00004',
                'password' => Hash::make('password123'),
                'role'     => 'project_manager',
            ],
            [
                'name'     => 'Arun Developer',
                'email'    => 'dev@salescrm.com',
                'phone'    => '+91 99000 00005',
                'password' => Hash::make('password123'),
                'hourly_rate' => 800.00,
                'role'     => 'developer',
            ],
            [
                'name'     => 'Neha Account Manager',
                'email'    => 'am@salescrm.com',
                'phone'    => '+91 99000 00006',
                'password' => Hash::make('password123'),
                'role'     => 'account_manager',
            ],
            [
                'name'     => 'Vikram Client',
                'email'    => 'client@salescrm.com',
                'phone'    => '+91 99000 00007',
                'password' => Hash::make('password123'),
                'role'     => 'client',
            ],
        ];

        foreach ($demoUsers as $data) {
            $role = $data['role'];
            unset($data['role']);

            $user = User::firstOrCreate(
                ['email' => $data['email']],
                $data
            );

            // Assign role (spatie uses api guard since Sanctum)
            $user->syncRoles([$role]);
        }
    }
}
