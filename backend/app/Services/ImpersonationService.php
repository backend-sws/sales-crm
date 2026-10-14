<?php

namespace App\Services;

use App\Contracts\Services\ImpersonationServiceInterface;
use App\Models\ActivityLog;
use App\Models\ImpersonationLog;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class ImpersonationService implements ImpersonationServiceInterface
{
    /**
     * Start an impersonation session: generate temporary token, log session start.
     */
    public function startImpersonation(User $admin, User $target, ?string $ip = null, ?string $userAgent = null, ?string $reason = null): array
    {
        // Security rule: Non-admins cannot impersonate
        if (! $admin->hasRole('super_admin')) {
            throw new \InvalidArgumentException('Only Super Admins can initiate user impersonation sessions.');
        }

        // Prevent self-impersonation
        if ($admin->id === $target->id) {
            throw new \InvalidArgumentException('You cannot impersonate your own administrator account.');
        }

        // Create log record
        $log = ImpersonationLog::create([
            'admin_id'       => $admin->id,
            'target_user_id' => $target->id,
            'reason'         => $reason ?? 'Administrative diagnostics & user assistance',
            'ip_address'     => $ip,
            'user_agent'     => $userAgent,
            'started_at'     => now(),
        ]);

        // Generate temporary short-lived token for target user (60 minutes expiry)
        $tokenResult = $target->createToken("impersonated_by_{$admin->id}", ['*'], now()->addMinutes(60));

        // Immutable activity log entry
        ActivityLog::create([
            'log_name'     => 'auth',
            'description'  => "Admin {$admin->name} (#{$admin->id}) started impersonating {$target->name} (#{$target->id})",
            'subject_type' => User::class,
            'subject_id'   => $target->id,
            'causer_type'  => User::class,
            'causer_id'    => $admin->id,
            'properties'   => [
                'ip'                   => $ip,
                'reason'               => $reason,
                'impersonation_log_id' => $log->id,
            ],
            'created_at'   => now(),
        ]);

        Log::notice("[Impersonation] Admin #{$admin->id} ({$admin->email}) started impersonating user #{$target->id} ({$target->email})");

        return [
            'token'                => $tokenResult->plainTextToken,
            'impersonation_log_id' => $log->id,
            'target_user'          => $target->load('roles'),
            'admin'                => [
                'id'    => $admin->id,
                'name'  => $admin->name,
                'email' => $admin->email,
            ],
        ];
    }

    /**
     * Stop an impersonation session: record end time, revoke token.
     */
    public function stopImpersonation(int $logId, ?User $currentUser = null): bool
    {
        $log = ImpersonationLog::find($logId);

        if ($log && ! $log->ended_at) {
            $log->update(['ended_at' => now()]);

            ActivityLog::create([
                'log_name'     => 'auth',
                'description'  => "Impersonation session #{$log->id} ended for user #{$log->target_user_id}",
                'subject_type' => User::class,
                'subject_id'   => $log->target_user_id,
                'causer_type'  => User::class,
                'causer_id'    => $log->admin_id,
                'properties'   => [
                    'duration_minutes' => round($log->started_at->diffInMinutes(now()), 1),
                ],
                'created_at'   => now(),
            ]);
        }

        // Revoke current active token
        if ($currentUser && $currentUser->currentAccessToken()) {
            $currentUser->currentAccessToken()->delete();
        }

        return true;
    }

    /**
     * Retrieve recent impersonation audit logs.
     */
    public function getLogs(int $limit = 20)
    {
        return ImpersonationLog::with(['admin', 'targetUser'])
            ->latest('started_at')
            ->limit($limit)
            ->get();
    }
}
