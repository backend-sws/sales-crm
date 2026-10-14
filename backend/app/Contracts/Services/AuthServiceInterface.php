<?php

namespace App\Contracts\Services;

use App\Models\User;

interface AuthServiceInterface
{
    /**
     * Register a new user and generate access token.
     */
    public function register(array $data): array;

    /**
     * Authenticate a user and generate access token.
     */
    public function login(array $credentials): array;

    /**
     * Revoke tokens for the current user session.
     */
    public function logout(User $user): bool;

    /**
     * Get the authenticated user's profile with permissions.
     */
    public function getProfile(User $user): array;
}
