<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseApiController;
use App\Models\ActivityLog;
use App\Models\Lead;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use OpenApi\Attributes as OA;

#[OA\Tag(name: "Admin User Management", description: "Manage CRM sales agents, managers, teams, and access control")]
class AdminUserController extends BaseApiController
{
    #[OA\Get(
        path: "/api/v1/admin/users",
        summary: "List all users with roles, workload, and performance metrics",
        security: [["bearerAuth" => []]],
        tags: ["Admin User Management"]
    )]
    public function index(Request $request): JsonResponse
    {
        $users = User::with('roles')
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                $openLeads = Lead::where('assigned_to', $user->id)
                    ->whereNotIn('status', ['won', 'lost'])
                    ->whereNull('master_lead_id')
                    ->count();

                $wonRevenue = (float) Lead::where('assigned_to', $user->id)
                    ->where('status', 'won')
                    ->whereNull('master_lead_id')
                    ->sum('value');

                return [
                    'id'               => $user->id,
                    'name'             => $user->name,
                    'email'            => $user->email,
                    'phone'            => $user->phone,
                    'is_active'        => (bool) $user->is_active,
                    'roles'            => $user->roles->pluck('name'),
                    'role'             => $user->roles->first()?->name ?? 'sales_agent',
                    'open_deals_count' => $openLeads,
                    'won_revenue'      => $wonRevenue,
                    'created_at'       => $user->created_at->toIso8601String(),
                ];
            });

        return $this->successResponse($users, 'CRM users retrieved successfully.');
    }

    #[OA\Post(
        path: "/api/v1/admin/users",
        summary: "Create a new CRM user and assign role (Admin only)",
        security: [["bearerAuth" => []]],
        tags: ["Admin User Management"]
    )]
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|max:255|unique:users,email',
            'phone'    => 'nullable|string|max:50',
            'password' => 'required|string|min:6',
            'role'     => 'required|string|exists:roles,name',
        ]);

        $user = User::create([
            'name'      => $validated['name'],
            'email'     => $validated['email'],
            'phone'     => $validated['phone'] ?? null,
            'password'  => Hash::make($validated['password']),
            'is_active' => true,
        ]);

        $user->assignRole($validated['role']);

        ActivityLog::create([
            'log_name'     => 'users',
            'description'  => "Created user {$user->name} ({$user->email}) with role {$validated['role']}",
            'subject_type' => User::class,
            'subject_id'   => $user->id,
            'causer_type'  => User::class,
            'causer_id'    => $request->user()->id,
            'created_at'   => now(),
        ]);

        return $this->createdResponse([
            'user' => $user->load('roles'),
        ], "User {$user->name} created successfully with role {$validated['role']}.");
    }

    #[OA\Patch(
        path: "/api/v1/admin/users/{id}",
        summary: "Update user status or details",
        security: [["bearerAuth" => []]],
        tags: ["Admin User Management"]
    )]
    public function update(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name'      => 'nullable|string|max:255',
            'phone'     => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
            'role'      => 'nullable|string|exists:roles,name',
        ]);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['phone'])) $user->phone = $validated['phone'];
        if (isset($validated['is_active'])) $user->is_active = $validated['is_active'];

        $user->save();

        if (! empty($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        ActivityLog::create([
            'log_name'     => 'users',
            'description'  => "Updated user {$user->name} (#{$user->id}) details",
            'subject_type' => User::class,
            'subject_id'   => $user->id,
            'causer_type'  => User::class,
            'causer_id'    => $request->user()->id,
            'created_at'   => now(),
        ]);

        return $this->successResponse($user->load('roles'), "User {$user->name} updated successfully.");
    }

    #[OA\Get(
        path: "/api/v1/admin/teams",
        summary: "List all sales teams",
        security: [["bearerAuth" => []]],
        tags: ["Admin User Management"]
    )]
    public function teams(): JsonResponse
    {
        $teams = Team::with(['manager', 'members'])->get();

        return $this->successResponse($teams, 'Teams retrieved successfully.');
    }
}
