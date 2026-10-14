<?php

namespace App\Contracts\Services;

use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\NotificationLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface NotificationChannelServiceInterface
{
    /**
     * Send a notification through a channel (whatsapp, email, database, push, auto).
     */
    public function send(User $user, string $type, array $payload, string $channel = 'auto'): NotificationLog;

    /**
     * Notify agent when a new lead is assigned.
     */
    public function notifyLeadAssigned(Lead $lead, User $agent): NotificationLog;

    /**
     * Notify agent or escalate to manager for overdue follow-up.
     */
    public function notifyOverdueFollowUp(FollowUp $followUp, User $recipient, bool $isEscalation = false): NotificationLog;

    /**
     * Send morning daily digest summary.
     */
    public function notifyDailyDigest(User $agent, array $summary): NotificationLog;

    /**
     * Get recent notification logs.
     */
    public function getRecentLogs(?User $user = null, int $limit = 20): Collection;
}
