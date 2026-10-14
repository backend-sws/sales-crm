<?php

namespace App\Services;

use App\Contracts\Services\NotificationChannelServiceInterface;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\NotificationLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

class NotificationService implements NotificationChannelServiceInterface
{
    /**
     * Send a notification through a channel (whatsapp, email, database, push, auto).
     */
    public function send(User $user, string $type, array $payload, string $channel = 'auto'): NotificationLog
    {
        if ($channel === 'auto') {
            // Priority: WhatsApp if phone exists, otherwise email
            $channel = ! empty($user->phone) ? 'whatsapp' : 'email';
        }

        // Simulate sending via Meta Cloud API / Twilio / SMTP
        // In local/production without external keys, log to channel and record database audit
        Log::info("[NotificationService] Dispatching [{$channel}] notification of type [{$type}] to user #{$user->id} ({$user->name})", [
            'payload' => $payload,
        ]);

        return NotificationLog::create([
            'notifiable_type' => User::class,
            'notifiable_id'   => $user->id,
            'channel'         => $channel,
            'type'            => $type,
            'payload'         => array_merge($payload, [
                'recipient_name'  => $user->name,
                'recipient_email' => $user->email,
                'recipient_phone' => $user->phone ?? null,
                'dispatched_at'   => now()->toIso8601String(),
            ]),
            'status'          => 'sent',
            'sent_at'         => now(),
        ]);
    }

    /**
     * Notify agent when a new lead is assigned.
     */
    public function notifyLeadAssigned(Lead $lead, User $agent): NotificationLog
    {
        $payload = [
            'title'        => "🎯 New Lead Assigned: {$lead->name}",
            'message'      => "A new lead '{$lead->name}' ({$lead->company}) with priority {$lead->priority} and score {$lead->score} has been assigned to you.",
            'lead_id'      => $lead->id,
            'lead_name'    => $lead->name,
            'lead_company' => $lead->company,
            'lead_phone'   => $lead->phone,
            'lead_score'   => $lead->score,
            'priority'     => $lead->priority,
            'deal_value'   => $lead->budget ?? $lead->value ?? 0,
            'action_url'   => "/leads?search=" . urlencode($lead->phone),
        ];

        return $this->send($agent, 'lead_assigned', $payload, 'whatsapp');
    }

    /**
     * Notify agent or escalate to manager for overdue follow-up.
     */
    public function notifyOverdueFollowUp(FollowUp $followUp, User $recipient, bool $isEscalation = false): NotificationLog
    {
        $lead = $followUp->lead;
        $hoursOverdue = round(now()->diffInHours($followUp->scheduled_at, true), 1);

        if ($isEscalation) {
            $payload = [
                'title'         => "🚨 Overdue Escalation: Lead #{$lead?->id} ({$lead?->name})",
                'message'       => "Follow-up for lead '{$lead?->name}' assigned to {$followUp->agent?->name} is overdue by {$hoursOverdue} hours. Immediate manager intervention recommended.",
                'follow_up_id'  => $followUp->id,
                'lead_id'       => $lead?->id,
                'lead_name'     => $lead?->name,
                'agent_name'    => $followUp->agent?->name,
                'scheduled_at'  => $followUp->scheduled_at->toIso8601String(),
                'hours_overdue' => $hoursOverdue,
                'is_escalation' => true,
            ];

            return $this->send($recipient, 'follow_up_escalation', $payload, 'email');
        }

        $payload = [
            'title'         => "⚠️ Action Required: Overdue Follow-up with {$lead?->name}",
            'message'       => "Your scheduled {$followUp->type} follow-up with {$lead?->name} ({$lead?->phone}) was due at {$followUp->scheduled_at->format('M d, h:i A')}. Please complete or reschedule.",
            'follow_up_id'  => $followUp->id,
            'lead_id'       => $lead?->id,
            'lead_name'     => $lead?->name,
            'lead_phone'    => $lead?->phone,
            'scheduled_at'  => $followUp->scheduled_at->toIso8601String(),
            'hours_overdue' => $hoursOverdue,
            'is_escalation' => false,
        ];

        return $this->send($recipient, 'follow_up_reminder', $payload, 'whatsapp');
    }

    /**
     * Send morning daily digest summary.
     */
    public function notifyDailyDigest(User $agent, array $summary): NotificationLog
    {
        $todayCount = $summary['today_count'] ?? 0;
        $overdueCount = $summary['overdue_count'] ?? 0;
        $hotLeadsCount = $summary['hot_leads_count'] ?? 0;

        $payload = [
            'title'           => "☀️ Daily Sales Briefing — " . now()->format('D, M d'),
            'message'         => "Good morning {$agent->name}! You have {$todayCount} follow-ups scheduled today, {$overdueCount} overdue items requiring action, and {$hotLeadsCount} hot leads in your pipeline.",
            'today_count'     => $todayCount,
            'overdue_count'   => $overdueCount,
            'hot_leads_count' => $hotLeadsCount,
            'summary'         => $summary,
        ];

        return $this->send($agent, 'daily_digest', $payload, 'whatsapp');
    }

    /**
     * Get recent notification logs.
     */
    public function getRecentLogs(?User $user = null, int $limit = 20): Collection
    {
        $query = NotificationLog::query()->latest('created_at')->limit($limit);

        if ($user && ! $user->hasRole('super_admin') && ! $user->can('leads.view_all')) {
            $query->where('notifiable_id', $user->id)
                  ->where('notifiable_type', User::class);
        }

        return $query->get();
    }
}
