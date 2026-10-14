<?php

namespace App\Services;

use App\Contracts\Services\FollowUpServiceInterface;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class FollowUpService implements FollowUpServiceInterface
{
    /**
     * Get follow-ups with filters.
     */
    public function getFollowUps(array $filters = [], ?User $user = null): Collection
    {
        $query = FollowUp::with(['lead', 'agent', 'nextFollowUp']);

        if ($user && ! $user->hasRole('super_admin') && ! $user->can('followups.view_all')) {
            $query->where('agent_id', $user->id);
        } elseif (! empty($filters['agent_id'])) {
            $query->where('agent_id', $filters['agent_id']);
        }

        if (! empty($filters['lead_id'])) {
            $query->where('lead_id', $filters['lead_id']);
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        return $query->orderBy('scheduled_at', 'asc')->get();
    }

    /**
     * Get pending follow-ups scheduled for today.
     */
    public function getTodayFollowUps(?User $user = null): Collection
    {
        $query = FollowUp::with(['lead', 'agent'])
            ->where('status', 'pending')
            ->whereDate('scheduled_at', today());

        if ($user && ! $user->hasRole('super_admin') && ! $user->can('followups.view_all')) {
            $query->where('agent_id', $user->id);
        }

        return $query->orderBy('scheduled_at', 'asc')->get();
    }

    /**
     * Get overdue follow-ups (scheduled before today and still pending).
     */
    public function getOverdueFollowUps(?User $user = null): Collection
    {
        $query = FollowUp::with(['lead', 'agent'])
            ->where('status', 'pending')
            ->where('scheduled_at', '<', now());

        if ($user && ! $user->hasRole('super_admin') && ! $user->can('followups.view_all')) {
            $query->where('agent_id', $user->id);
        }

        return $query->orderBy('scheduled_at', 'asc')->get();
    }

    /**
     * Schedule a new follow-up for a lead.
     */
    public function scheduleFollowUp(array $data, ?User $actor = null): FollowUp
    {
        return DB::transaction(function () use ($data, $actor) {
            if (empty($data['agent_id']) && $actor) {
                $data['agent_id'] = $actor->id;
            }

            $followUp = FollowUp::create($data);

            // Update lead's last activity
            $lead = Lead::find($followUp->lead_id);
            if ($lead) {
                $lead->last_activity_at = now();
                $lead->saveQuietly();

                LeadActivity::create([
                    'lead_id'    => $lead->id,
                    'user_id'    => $actor?->id,
                    'type'       => 'follow_up_scheduled',
                    'payload'    => [
                        'type'         => $followUp->type,
                        'scheduled_at' => $followUp->scheduled_at->toIso8601String(),
                        'agent_name'   => $followUp->agent?->name ?? 'Agent',
                    ],
                    'created_at' => now(),
                ]);
            }

            return $followUp->fresh(['lead', 'agent']);
        });
    }

    /**
     * Complete a follow-up with outcome notes, and optionally chain the next follow-up.
     */
    public function completeFollowUp(FollowUp $followUp, array $outcomeData, ?User $actor = null): FollowUp
    {
        return DB::transaction(function () use ($followUp, $outcomeData, $actor) {
            $followUp->status = 'done';
            $followUp->outcome = $outcomeData['outcome'] ?? 'Completed follow-up discussion.';
            $followUp->completed_at = now();

            // Chained next follow-up creation if requested
            if (! empty($outcomeData['next_scheduled_at']) && ! empty($outcomeData['next_type'])) {
                $nextFollowUp = FollowUp::create([
                    'lead_id'      => $followUp->lead_id,
                    'agent_id'     => $outcomeData['next_agent_id'] ?? $followUp->agent_id,
                    'type'         => $outcomeData['next_type'],
                    'scheduled_at' => $outcomeData['next_scheduled_at'],
                    'status'       => 'pending',
                ]);

                $followUp->next_follow_up_id = $nextFollowUp->id;
            }

            $followUp->save();

            // Update lead and log activity
            $lead = $followUp->lead;
            if ($lead) {
                $lead->last_activity_at = now();
                $lead->saveQuietly();

                LeadActivity::create([
                    'lead_id'    => $lead->id,
                    'user_id'    => $actor?->id,
                    'type'       => 'follow_up_done',
                    'payload'    => [
                        'type'              => $followUp->type,
                        'outcome'           => $followUp->outcome,
                        'has_next_chained'  => ! empty($followUp->next_follow_up_id),
                    ],
                    'created_at' => now(),
                ]);

                // Recalculate score (+5 for completed follow-up)
                app(LeadService::class)->recalculateScore($lead);
            }

            return $followUp->fresh(['lead', 'agent', 'nextFollowUp']);
        });
    }

    /**
     * Get summary counts for follow-ups.
     */
    public function getSummary(?User $user = null): array
    {
        $baseQuery = FollowUp::query();
        if ($user && ! $user->hasRole('super_admin') && ! $user->can('followups.view_all')) {
            $baseQuery->where('agent_id', $user->id);
        }

        $now = now();
        $todayStart = today()->startOfDay();
        $todayEnd = today()->endOfDay();

        $overdueCount = (clone $baseQuery)
            ->where('status', 'pending')
            ->where('scheduled_at', '<', $now)
            ->count();

        $todayCount = (clone $baseQuery)
            ->where('status', 'pending')
            ->whereBetween('scheduled_at', [$todayStart, $todayEnd])
            ->count();

        $upcomingCount = (clone $baseQuery)
            ->where('status', 'pending')
            ->where('scheduled_at', '>', $todayEnd)
            ->count();

        $completedTodayCount = (clone $baseQuery)
            ->whereIn('status', ['done', 'completed'])
            ->whereBetween('completed_at', [$todayStart, $todayEnd])
            ->count();

        return [
            'overdue'          => $overdueCount,
            'today'            => $todayCount,
            'upcoming'         => $upcomingCount,
            'completed_today'  => $completedTodayCount,
        ];
    }
}
