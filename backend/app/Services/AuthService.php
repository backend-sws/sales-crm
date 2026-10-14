<?php

namespace App\Services;

use App\Contracts\Services\AuthServiceInterface;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService implements AuthServiceInterface
{
    /**
     * Register a new user and generate access token.
     * Note: In production, user creation goes through admin panel with role assignment.
     */
    public function register(array $data): array
    {
        $user = User::create([
            'name'  => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => Hash::make($data['password']),
        ]);

        // Default role for self-registration (admin can change later)
        $user->assignRole('sales_agent');

        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'user'        => $this->formatUser($user),
            'token'       => $token,
            'token_type'  => 'Bearer',
            'redirect_to' => '/sales/dashboard',
        ];
    }

    /**
     * Authenticate a user and generate access token.
     */
    public function login(array $credentials): array
    {
        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Your account has been deactivated. Please contact the administrator.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;
        $roles = $user->getRoleNames()->toArray();
        $primaryRole = $roles[0] ?? 'sales_agent';

        return [
            'user'         => $this->formatUser($user),
            'token'        => $token,
            'token_type'   => 'Bearer',
            'redirect_to'  => $this->getRedirectPath($primaryRole),
        ];
    }

    /**
     * Revoke tokens for the current user session.
     */
    public function logout(User $user): bool
    {
        return (bool) $user->currentAccessToken()?->delete();
    }

    /**
     * Get the authenticated user's profile with permissions.
     */
    public function getProfile(User $user): array
    {
        return $this->formatUser($user);
    }

    /**
     * Format a user object with roles, permissions and redirect hint.
     */
    private function formatUser(User $user): array
    {
        $roles       = $user->getRoleNames()->toArray();
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();
        $primaryRole = $roles[0] ?? 'sales_agent';

        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'phone'       => $user->phone,
            'avatar'      => $user->avatar,
            'is_active'   => $user->is_active,
            'client_id'   => $user->client_id,
            'created_at'  => $user->created_at?->toISOString(),
            'roles'       => $roles,
            'permissions' => $permissions,
            'redirect_to' => $this->getRedirectPath($primaryRole),
        ];
    }

    /**
     * Return the frontend route for a given role.
     *
     * Used so the React router can immediately send the user to the
     * correct role-based dashboard without extra round-trips.
     */
    private function getRedirectPath(string $role): string
    {
        return match ($role) {
            'super_admin'     => '/admin/dashboard',
            'sales_manager'   => '/manager/dashboard',
            'sales_agent'     => '/sales/dashboard',
            'project_manager' => '/pm/dashboard',
            'developer'       => '/dev/dashboard',
            'account_manager' => '/am/dashboard',
            'client'          => '/client/dashboard',
            default           => '/dashboard',
        };
    }
}
