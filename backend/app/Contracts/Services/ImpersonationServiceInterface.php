<?php

namespace App\Contracts\Services;

use App\Models\User;

interface ImpersonationServiceInterface
{
    /**
     * Start an impersonation session: generate temporary token, log session start.
     */
    public function startImpersonation(User $admin, User $target, ?string $ip = null, ?string $userAgent = null, ?string $reason = null): array;

    /**
     * Stop an impersonation session: record end time, revoke token.
     */
    public function stopImpersonation(int $logId, ?User $currentUser = null): bool;

    /**
     * Retrieve recent impersonation audit logs.
     */
    public function getLogs(int $limit = 20);
}
