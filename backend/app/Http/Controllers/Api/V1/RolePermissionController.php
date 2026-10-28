<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

#[OA\Tag(name: "RBAC Governance", description: "SuperAdmin Role & Permission Governance Matrix")]
class RolePermissionController extends BaseApiController
{
    /**
     * Get the complete Roles and Permissions matrix with categorized grouping.
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasRole('super_admin')) {
            return $this->forbiddenResponse('Only Super Administrators can access RBAC Governance.');
        }

        $roles = Role::where('guard_name', 'api')->get(['id', 'name']);
        $allPermissions = Permission::where('guard_name', 'api')->get(['id', 'name']);

        // Build current assigned matrix: role_name => [perm1, perm2, ...]
        $matrix = [];
        foreach ($roles as $role) {
            $matrix[$role->name] = $role->permissions()->pluck('name')->toArray();
        }

        // Categorize permissions into human-friendly domain modules
        $categories = [
            'Leads & Pipeline' => [
                'leads.view_all'   => 'View All Leads (Global)',
                'leads.view_own'   => 'View Assigned Leads (Own)',
                'leads.create'     => 'Create New Lead',
                'leads.edit'       => 'Edit Lead Details',
                'leads.delete'     => 'Delete Lead Record',
                'leads.assign'     => 'Assign & Route Leads',
                'leads.import'     => 'Import CSV Leads',
                'leads.export'     => 'Export Leads Data',
                'leads.convert'    => 'Convert Won Deal to Client',
            ],
            'Follow-Ups & Tasks' => [
                'followups.view_all' => 'View All Follow-Ups',
                'followups.view_own' => 'View Own Follow-Ups',
                'followups.create'   => 'Schedule Follow-Up',
                'followups.complete' => 'Mark Follow-Up Complete',
            ],
            'Clients & Service Track' => [
                'clients.view_all'       => 'View All Clients Directory',
                'clients.view_own'       => 'View Converted/Assigned Clients',
                'clients.edit'           => 'Edit Client & Branding',
                'services.view'          => 'View Retainers & Services',
                'services.create'        => 'Create Retainer Package',
                'service_tickets.view'   => 'View Service Support Tickets',
                'service_tickets.create' => 'Create Service Ticket',
                'service_tickets.update' => 'Update Ticket Status/Response',
                'service_reports.upload' => 'Upload Monthly Performance Report',
            ],
            'Projects & Sprints' => [
                'projects.view_all'      => 'View All Delivery Projects',
                'projects.view_assigned' => 'View Assigned Projects Only',
                'projects.create'        => 'Create Delivery Project',
                'projects.edit'          => 'Edit Project Scope & Sprints',
                'tasks.view_all'         => 'View All Project Tasks',
                'tasks.view_assigned'    => 'View Assigned Tasks Only',
                'tasks.create'           => 'Create Sprint Tasks',
                'tasks.update_status'    => 'Move Tasks on Kanban',
                'tasks.upload_proof'     => 'Upload Work Verification Proof',
                'tasks.accept'           => 'Approve Task Deliverable (Client)',
                'tasks.reject'           => 'Request Task Revisions (Client)',
            ],
            'Scope Governance & MoM' => [
                'scope.create'           => 'Create SOW Scope Snapshot',
                'scope.approve'          => 'Sign-off on Scope Version',
                'change_requests.create' => 'Submit Scope Change Request',
                'change_requests.decide' => 'Approve/Reject Change Request',
                'meetings.create'        => 'Record Client Meeting & MoM',
                'meetings.confirm'       => 'Confirm Meeting Minutes (MoM)',
            ],
            'Financials & Time Logs' => [
                'time_entries.create'   => 'Log Work & Start Active Timer',
                'time_entries.view_all' => 'View All Member Worklogs & Rates',
                'milestones.create'     => 'Create Billing Milestones',
                'invoices.view'         => 'View Invoices & Billing',
                'invoices.pay'          => 'Record Invoice Payment',
            ],
            'Analytics & Forecasting' => [
                'analytics.view_company' => 'Executive Company Analytics & P&L',
                'analytics.view_team'    => 'Team Lead Analytics',
                'analytics.view_own'     => 'Personal Scorecard & Target',
                'reports.export'         => 'Export Executive Scheduled Reports',
            ],
            'Collaboration & Git' => [
                'chat.view'            => 'View Project Slack Channels',
                'chat.send'            => 'Send Messages & Upload Attachments',
                'github.view_all'      => 'View Git Repositories & Analytics',
                'github.view_own'      => 'View Personal Commit Signals',
                'feedback.give'        => 'Submit Task Peer Feedback',
                'feedback.view_all'    => 'View All Team Feedback',
                'feedback.view_own'    => 'View Received Feedback',
                'performance.view_all' => 'View Developer Performance Board',
                'performance.view_own' => 'View Personal Performance Score',
            ],
            'Administration & System' => [
                'users.view'           => 'View Staff & Admin Directory',
                'users.create'         => 'Invite New Staff Member',
                'users.edit'           => 'Edit User Roles & Status',
                'users.delete'         => 'Deactivate User Account',
                'roles.assign'         => 'Assign Custom Roles',
                'impersonation.start'  => 'Impersonate Staff User Session',
                'audit.view'           => 'Audit Trail Explorer Access',
                'settings.manage'      => 'Manage Global Integrations & AI Keys',
            ],
        ];

        return $this->successResponse([
            'roles'             => $roles,
            'matrix'            => $matrix,
            'categories'        => $categories,
            'total_permissions' => $allPermissions->count(),
        ], 'RBAC matrix retrieved successfully.');
    }

    /**
     * Synchronize permissions for a specific role in real time.
     */
    public function sync(Request $request): JsonResponse
    {
        if (! $request->user()->hasRole('super_admin')) {
            return $this->forbiddenResponse('Only Super Administrators can modify role permissions.');
        }

        $validated = $request->validate([
            'role'          => 'required|string|exists:roles,name',
            'permissions'   => 'present|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $roleName = $validated['role'];
        if ($roleName === 'super_admin') {
            return $this->errorResponse('Super Administrator always retains all system permissions and cannot be restricted.', 400);
        }

        $role = Role::findByName($roleName, 'api');
        $role->syncPermissions($validated['permissions']);

        // Forget cached permissions across all application instances
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Write immutable audit log
        ActivityLog::create([
            'log_name'     => 'RBAC_GOVERNANCE',
            'description'  => "Synchronized permissions for role '{$roleName}' (" . count($validated['permissions']) . ' permissions granted)',
            'subject_type' => Role::class,
            'subject_id'   => $role->id,
            'causer_type'  => get_class($request->user()),
            'causer_id'    => $request->user()->id,
            'properties'   => [
                'role'                => $roleName,
                'permissions_count'   => count($validated['permissions']),
                'permissions_granted' => $validated['permissions'],
            ],
            'created_at'   => now(),
        ]);

        return $this->successResponse([
            'role'        => $roleName,
            'permissions' => $role->permissions()->pluck('name')->toArray(),
        ], "Role '{$roleName}' permissions updated successfully.");
    }
}
