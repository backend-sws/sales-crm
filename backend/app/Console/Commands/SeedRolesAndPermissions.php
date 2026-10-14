<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class SeedRolesAndPermissions extends Command
{
    protected $signature   = 'rbac:seed';
    protected $description = 'Seed all 7 roles, permissions, and one demo user per role';

    private const GUARD = 'api';

    public function handle(): int
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // ── 1. PERMISSIONS ──────────────────────────────────────────────────────
        $permissions = [
            // Users & Roles
            'users.view', 'users.create', 'users.edit', 'users.delete', 'roles.assign',
            // Impersonation & Audit
            'impersonation.start', 'audit.view',
            // Leads
            'leads.view_all', 'leads.view_own', 'leads.create', 'leads.edit',
            'leads.delete', 'leads.assign', 'leads.import', 'leads.export', 'leads.convert',
            // Follow-ups
            'followups.view_all', 'followups.view_own', 'followups.create', 'followups.complete',
            // Analytics & Reports
            'analytics.view_company', 'analytics.view_team', 'analytics.view_own', 'reports.export',
            // Clients
            'clients.view_all', 'clients.view_own', 'clients.edit',
            // Service Track
            'services.view', 'services.create',
            'service_tickets.view', 'service_tickets.create', 'service_tickets.update',
            'service_reports.upload',
            // Projects
            'projects.view_all', 'projects.view_assigned', 'projects.create', 'projects.edit',
            // Scope & Change Requests
            'scope.create', 'scope.approve',
            'change_requests.create', 'change_requests.decide',
            // Meetings
            'meetings.create', 'meetings.confirm',
            // Tasks
            'tasks.view_all', 'tasks.view_assigned', 'tasks.create', 'tasks.update_status',
            'tasks.upload_proof', 'tasks.accept', 'tasks.reject',
            // Time Tracking
            'time_entries.create', 'time_entries.view_all',
            // Milestones & Invoices
            'milestones.create', 'invoices.view', 'invoices.pay',
            // GitHub
            'github.view_all', 'github.view_own',
            // Chat
            'chat.send', 'chat.view',
            // Feedback & Performance
            'feedback.give', 'feedback.view_all', 'feedback.view_own',
            'performance.view_all', 'performance.view_own',
            // Settings
            'settings.manage',
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => self::GUARD]);
        }
        $this->info('✓ ' . count($permissions) . ' permissions created.');

        // ── 2. ROLES ────────────────────────────────────────────────────────────
        $rolePermissions = [
            'super_admin' => $permissions, // all
            'sales_manager' => [
                'leads.view_all', 'leads.create', 'leads.edit', 'leads.assign',
                'leads.import', 'leads.export', 'leads.convert',
                'followups.view_all', 'followups.create', 'followups.complete',
                'analytics.view_company', 'analytics.view_team', 'reports.export',
                'clients.view_all', 'services.view', 'service_tickets.view',
            ],
            'sales_agent' => [
                'leads.view_own', 'leads.create', 'leads.edit', 'leads.import', 'leads.convert',
                'followups.view_own', 'followups.create', 'followups.complete',
                'analytics.view_own', 'clients.view_own',
            ],
            'project_manager' => [
                'clients.view_all',
                'projects.view_all', 'projects.create', 'projects.edit',
                'scope.create', 'change_requests.create',
                'meetings.create',
                'tasks.view_all', 'tasks.create', 'tasks.update_status', 'tasks.upload_proof',
                'time_entries.view_all', 'milestones.create', 'invoices.view',
                'github.view_all', 'chat.send', 'chat.view',
                'feedback.view_all', 'performance.view_all',
                'service_tickets.view', 'service_tickets.update',
            ],
            'developer' => [
                'projects.view_assigned',
                'tasks.view_assigned', 'tasks.update_status', 'tasks.upload_proof',
                'time_entries.create', 'github.view_own',
                'chat.send', 'chat.view',
                'feedback.view_own', 'performance.view_own',
            ],
            'account_manager' => [
                'clients.view_all', 'clients.edit',
                'services.view', 'services.create',
                'service_tickets.view', 'service_tickets.create', 'service_tickets.update',
                'service_reports.upload', 'analytics.view_own',
            ],
            'client' => [
                'scope.approve', 'change_requests.decide', 'meetings.confirm',
                'tasks.accept', 'tasks.reject',
                'invoices.view', 'invoices.pay',
                'chat.send', 'chat.view',
                'feedback.give', 'service_tickets.create',
            ],
        ];

        foreach ($rolePermissions as $roleName => $perms) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => self::GUARD]);
            $permObjs = Permission::where('guard_name', self::GUARD)->whereIn('name', $perms)->get();
            $role->syncPermissions($permObjs);
            $this->info("✓ Role [{$roleName}] → " . count($perms) . ' permissions');
        }

        // ── 3. DEMO USERS ────────────────────────────────────────────────────────
        $demoUsers = [
            ['name' => 'Sales Admin',         'email' => 'admin@salescrm.com',   'phone' => '+91 99000 00001', 'role' => 'super_admin',     'hourly_rate' => 0],
            ['name' => 'Rakesh Manager',       'email' => 'manager@salescrm.com', 'phone' => '+91 99000 00002', 'role' => 'sales_manager',   'hourly_rate' => 0],
            ['name' => 'Rahul Agent',          'email' => 'agent@salescrm.com',   'phone' => '+91 99000 00003', 'role' => 'sales_agent',     'hourly_rate' => 0],
            ['name' => 'Priya PM',             'email' => 'pm@salescrm.com',      'phone' => '+91 99000 00004', 'role' => 'project_manager', 'hourly_rate' => 0],
            ['name' => 'Arun Developer',       'email' => 'dev@salescrm.com',     'phone' => '+91 99000 00005', 'role' => 'developer',       'hourly_rate' => 800],
            ['name' => 'Neha Account Manager', 'email' => 'am@salescrm.com',      'phone' => '+91 99000 00006', 'role' => 'account_manager', 'hourly_rate' => 0],
            ['name' => 'Vikram Client',        'email' => 'client@salescrm.com',  'phone' => '+91 99000 00007', 'role' => 'client',          'hourly_rate' => 0],
        ];

        foreach ($demoUsers as $data) {
            $roleName = $data['role'];
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name'        => $data['name'],
                    'phone'       => $data['phone'],
                    'password'    => Hash::make('password123'),
                    'hourly_rate' => $data['hourly_rate'],
                    'is_active'   => true,
                ]
            );

            $role = Role::findByName($roleName, self::GUARD);
            $user->syncRoles([$role]);
            $this->info("✓ User [{$data['email']}] → role [{$roleName}]");
        }

        $this->newLine();
        $this->info('🎉 RBAC seeding complete! All 7 roles ready.');
        $this->table(
            ['Email', 'Role', 'Password'],
            collect($demoUsers)->map(fn($u) => [$u['email'], $u['role'], 'password123'])->toArray()
        );

        return self::SUCCESS;
    }
}
