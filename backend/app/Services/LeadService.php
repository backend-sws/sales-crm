<?php

namespace App\Services;

use App\Contracts\Services\AutoAssignmentServiceInterface;
use App\Contracts\Services\LeadServiceInterface;
use App\Contracts\Services\NotificationChannelServiceInterface;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadMergeLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class LeadService implements LeadServiceInterface
{
    public function __construct(
        protected ?AutoAssignmentServiceInterface $autoAssignmentService = null,
        protected ?NotificationChannelServiceInterface $notificationService = null
    ) {
        $this->autoAssignmentService = $autoAssignmentService ?? app(AutoAssignmentServiceInterface::class);
        $this->notificationService = $notificationService ?? app(NotificationChannelServiceInterface::class);
    }

    /**
     * Get paginated leads with filters and role-scoped visibility.
     */
    public function getPaginatedLeads(array $filters = [], int $perPage = 15, ?User $user = null): LengthAwarePaginator
    {
        $query = Lead::query()
            ->with(['assignedUser', 'leadSource', 'products', 'pendingFollowUps'])
            ->whereNull('master_lead_id'); // Hide merged duplicates

        // Role-based scoping: Agents only see their assigned leads unless they have permission to view all
        if ($user && ! $user->hasRole('super_admin') && ! $user->can('leads.view_all')) {
            $query->where('assigned_to', $user->id);
        } elseif (! empty($filters['assigned_to'])) {
            $query->where('assigned_to', $filters['assigned_to']);
        }

        // Full-text search
        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('company', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        // Pipeline stage / status filter
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Priority filter (hot, warm, cold)
        if (! empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        // Source filter
        if (! empty($filters['source_id'])) {
            $query->where('source_id', $filters['source_id']);
        } elseif (! empty($filters['source'])) {
            $query->where('source', $filters['source']);
        }

        // City filter
        if (! empty($filters['city'])) {
            $query->where('city', 'like', "%{$filters['city']}%");
        }

        // Date range filters
        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }
        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        // Smart Segments for High-Velocity Triage
        if (! empty($filters['segment'])) {
            switch ($filters['segment']) {
                case 'unassigned':
                    $query->whereNull('assigned_to');
                    break;
                case 'hot':
                    $query->where('score', '>=', 70)->where('value', '>=', 100000);
                    break;
                case 'stale':
                    $query->whereNotIn('status', ['won', 'lost'])
                          ->where(function ($q) {
                              $q->where('last_activity_at', '<=', now()->subHours(72))
                                ->orWhereNull('last_activity_at');
                          });
                    break;
                case 'my_leads':
                    if ($user) {
                        $query->where('assigned_to', $user->id);
                    }
                    break;
                case 'active':
                    $query->whereNotIn('status', ['won', 'lost']);
                    break;
            }
        }

        // Direct boolean unassigned filter
        if (isset($filters['is_unassigned']) && filter_var($filters['is_unassigned'], FILTER_VALIDATE_BOOLEAN)) {
            $query->whereNull('assigned_to');
        }

        // Follow-up status filter (overdue, today, none, scheduled)
        if (! empty($filters['followup_status'])) {
            switch ($filters['followup_status']) {
                case 'overdue':
                    $query->whereHas('pendingFollowUps', function ($q) {
                        $q->where('scheduled_at', '<', now());
                    });
                    break;
                case 'today':
                    $query->whereHas('pendingFollowUps', function ($q) {
                        $q->whereDate('scheduled_at', today());
                    });
                    break;
                case 'none':
                    $query->whereNotIn('status', ['won', 'lost'])->whereDoesntHave('pendingFollowUps');
                    break;
                case 'scheduled':
                    $query->whereHas('pendingFollowUps');
                    break;
            }
        }

        // Score range
        if (isset($filters['score_min']) && is_numeric($filters['score_min'])) {
            $query->where('score', '>=', (int) $filters['score_min']);
        }
        if (isset($filters['score_max']) && is_numeric($filters['score_max'])) {
            $query->where('score', '<=', (int) $filters['score_max']);
        }

        // Value range
        if (isset($filters['value_min']) && is_numeric($filters['value_min'])) {
            $query->where('value', '>=', (float) $filters['value_min']);
        }
        if (isset($filters['value_max']) && is_numeric($filters['value_max'])) {
            $query->where('value', '<=', (float) $filters['value_max']);
        }

        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortOrder = strtolower($filters['sort_order'] ?? 'desc');
        if (! in_array($sortOrder, ['asc', 'desc'])) {
            $sortOrder = 'desc';
        }

        return $query->orderBy($sortBy, $sortOrder)->paginate($perPage);
    }

    /**
     * Get all leads grouped for Kanban board.
     */
    public function getKanbanLeads(array $filters = [], ?User $user = null): array
    {
        $query = Lead::query()
            ->with(['assignedUser', 'leadSource', 'products', 'pendingFollowUps'])
            ->whereNull('master_lead_id');

        if ($user && ! $user->hasRole('super_admin') && ! $user->can('leads.view_all')) {
            $query->where('assigned_to', $user->id);
        }

        if (! empty($filters['assigned_to'])) {
            $query->where('assigned_to', $filters['assigned_to']);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $leads = $query->orderBy('score', 'desc')->get();

        $stages = [
            'new'          => [],
            'contacted'    => [],
            'interested'   => [],
            'demo_meeting' => [],
            'proposal'     => [],
            'negotiation'  => [],
            'won'          => [],
            'lost'         => [],
        ];

        foreach ($leads as $lead) {
            $status = $lead->status ?? 'new';
            if (isset($stages[$status])) {
                $stages[$status][] = $lead;
            } else {
                $stages['new'][] = $lead;
            }
        }

        return $stages;
    }

    /**
     * Find a lead by ID with role check.
     */
    public function findLeadById(int $id, ?User $user = null): ?Lead
    {
        $query = Lead::with(['assignedUser', 'creator', 'leadSource', 'products', 'followUps.agent', 'activities.user']);

        if ($user && ! $user->hasRole('super_admin') && ! $user->can('leads.view_all')) {
            $query->where('assigned_to', $user->id);
        }

        return $query->find($id);
    }

    /**
     * Create a new lead.
     */
    public function createLead(array $data, ?User $creator = null): Lead
    {
        return DB::transaction(function () use ($data, $creator) {
            $productIds = $data['product_ids'] ?? [];
            unset($data['product_ids']);

            if ($creator) {
                $data['created_by'] = $creator->id;
                // If no agent assigned, default to creator if they are an agent
                if (empty($data['assigned_to']) && $creator->hasRole('sales_agent')) {
                    $data['assigned_to'] = $creator->id;
                }
            }

            if (empty($data['value']) && ! empty($data['budget'])) {
                $data['value'] = $data['budget'];
            }
            if (empty($data['budget']) && ! empty($data['value'])) {
                $data['budget'] = $data['value'];
            }

            $data['last_activity_at'] = now();
            $lead = Lead::create($data);

            if (! empty($productIds)) {
                $lead->products()->sync($productIds);
            }

            // Calculate initial intelligence score
            $this->recalculateScore($lead);

            // Auto-assign lead if unassigned and requested (or default for incoming leads)
            $shouldAutoAssign = empty($lead->assigned_to) && (! isset($data['auto_assign']) || filter_var($data['auto_assign'], FILTER_VALIDATE_BOOLEAN));
            if ($shouldAutoAssign) {
                $strategy = $data['assignment_strategy'] ?? 'load_balanced';
                $this->autoAssignmentService->assign($lead, $strategy);
            }

            // Log activity: created
            LeadActivity::create([
                'lead_id'    => $lead->id,
                'user_id'    => $creator?->id,
                'type'       => 'created',
                'payload'    => [
                    'source'   => $lead->source ?? 'manual',
                    'priority' => $lead->priority ?? 'warm',
                    'budget'   => $lead->budget ?? 0,
                ],
                'created_at' => now(),
            ]);

            return $lead->fresh(['assignedUser', 'leadSource', 'products']);
        });
    }

    /**
     * Update an existing lead.
     */
    public function updateLead(Lead $lead, array $data, ?User $actor = null): Lead
    {
        return DB::transaction(function () use ($lead, $data, $actor) {
            $productIds = $data['product_ids'] ?? null;
            unset($data['product_ids']);

            $oldValues = $lead->only(array_keys($data));
            $lead->update($data);

            if ($productIds !== null) {
                $lead->products()->sync($productIds);
            }

            $lead->last_activity_at = now();
            $lead->save();

            // Log update activity
            LeadActivity::create([
                'lead_id'    => $lead->id,
                'user_id'    => $actor?->id,
                'type'       => 'updated',
                'payload'    => [
                    'updated_fields' => array_keys($data),
                ],
                'created_at' => now(),
            ]);

            return $lead->fresh(['assignedUser', 'leadSource', 'products']);
        });
    }

    /**
     * Soft delete a lead.
     */
    public function deleteLead(Lead $lead, ?User $actor = null): bool
    {
        return DB::transaction(function () use ($lead, $actor) {
            LeadActivity::create([
                'lead_id'    => $lead->id,
                'user_id'    => $actor?->id,
                'type'       => 'deleted',
                'payload'    => ['name' => $lead->name],
                'created_at' => now(),
            ]);

            return (bool) $lead->delete();
        });
    }

    /**
     * Update lead pipeline status.
     */
    public function updateStatus(Lead $lead, string $status, ?string $lostReason = null, ?string $lostNotes = null, ?User $actor = null): Lead
    {
        return DB::transaction(function () use ($lead, $status, $lostReason, $lostNotes, $actor) {
            $oldStatus = $lead->status;
            $lead->status = $status;

            if ($status === 'lost') {
                $lead->lost_reason = $lostReason;
                $lead->lost_notes = $lostNotes;
            } else {
                $lead->lost_reason = null;
                $lead->lost_notes = null;
            }

            $lead->last_activity_at = now();
            $lead->save();

            // Recalculate score on stage transition
            $this->recalculateScore($lead);

            // Auto log timeline activity
            LeadActivity::create([
                'lead_id'    => $lead->id,
                'user_id'    => $actor?->id,
                'type'       => 'status_change',
                'payload'    => [
                    'old_status'  => $oldStatus,
                    'new_status'  => $status,
                    'lost_reason' => $lostReason,
                    'lost_notes'  => $lostNotes,
                ],
                'created_at' => now(),
            ]);

            return $lead->fresh(['assignedUser', 'leadSource', 'products']);
        });
    }

    /**
     * Assign or reassign lead to a sales agent.
     */
    public function assignLead(Lead $lead, int $agentId, ?User $actor = null): Lead
    {
        return DB::transaction(function () use ($lead, $agentId, $actor) {
            $oldAssignee = $lead->assignedUser?->name ?? 'Unassigned';
            $lead->assigned_to = $agentId;
            $lead->last_activity_at = now();
            $lead->save();

            $newAssignee = User::find($agentId);

            LeadActivity::create([
                'lead_id'    => $lead->id,
                'user_id'    => $actor?->id,
                'type'       => 'assigned',
                'payload'    => [
                    'from' => $oldAssignee,
                    'to'   => $newAssignee?->name ?? "User #{$agentId}",
                ],
                'created_at' => now(),
            ]);

            if ($newAssignee) {
                $this->notificationService->notifyLeadAssigned($lead, $newAssignee);
            }

            return $lead->fresh(['assignedUser']);
        });
    }

    /**
     * Bulk reassign multiple leads to an agent.
     */
    public function bulkAssign(array $leadIds, int $agentId, ?User $actor = null): int
    {
        $targetUser = User::find($agentId);
        $count = 0;

        DB::transaction(function () use ($leadIds, $agentId, $targetUser, $actor, &$count) {
            $leads = Lead::whereIn('id', $leadIds)->get();
            foreach ($leads as $lead) {
                $oldName = $lead->assignedUser?->name ?? 'Unassigned';
                $lead->assigned_to = $agentId;
                $lead->last_activity_at = now();
                $lead->save();

                LeadActivity::create([
                    'lead_id'    => $lead->id,
                    'user_id'    => $actor?->id,
                    'type'       => 'assigned',
                    'payload'    => [
                        'from'       => $oldName,
                        'to'         => $targetUser?->name ?? "User #{$agentId}",
                        'is_bulk'    => true,
                    ],
                    'created_at' => now(),
                ]);

                $count++;
            }
        });

        return $count;
    }

    /**
     * Bulk update stage/status for multiple leads.
     */
    public function bulkUpdateStatus(array $leadIds, string $status, ?User $actor = null): int
    {
        $count = 0;

        DB::transaction(function () use ($leadIds, $status, $actor, &$count) {
            $leads = Lead::whereIn('id', $leadIds)->get();
            foreach ($leads as $lead) {
                $oldStatus = $lead->status;
                $lead->status = $status;
                $lead->last_activity_at = now();
                $lead->save();

                $this->recalculateScore($lead);

                LeadActivity::create([
                    'lead_id'    => $lead->id,
                    'user_id'    => $actor?->id,
                    'type'       => 'status_change',
                    'payload'    => [
                        'old_status' => $oldStatus,
                        'new_status' => $status,
                        'is_bulk'    => true,
                    ],
                    'created_at' => now(),
                ]);

                $count++;
            }
        });

        return $count;
    }

    /**
     * Merge duplicate lead into master lead, combining activity logs and follow-ups.
     */
    public function mergeLeads(Lead $masterLead, Lead $duplicateLead, ?User $actor = null): Lead
    {
        return DB::transaction(function () use ($masterLead, $duplicateLead, $actor) {
            // Snapshot duplicate lead data
            LeadMergeLog::create([
                'master_lead_id'       => $masterLead->id,
                'merged_lead_id'       => $duplicateLead->id,
                'merged_by'            => $actor?->id,
                'merged_data_snapshot' => $duplicateLead->toArray(),
            ]);

            // Re-point follow-ups to master
            $duplicateLead->followUps()->update(['lead_id' => $masterLead->id]);

            // Re-point activity logs to master
            $duplicateLead->activities()->update(['lead_id' => $masterLead->id]);

            // Mark duplicate as merged into master
            $duplicateLead->master_lead_id = $masterLead->id;
            $duplicateLead->save();
            $duplicateLead->delete(); // Soft delete duplicate

            // Log activity on master
            LeadActivity::create([
                'lead_id'    => $masterLead->id,
                'user_id'    => $actor?->id,
                'type'       => 'merged',
                'payload'    => [
                    'merged_lead_id'    => $duplicateLead->id,
                    'merged_lead_name'  => $duplicateLead->name,
                    'merged_lead_email' => $duplicateLead->email,
                ],
                'created_at' => now(),
            ]);

            $this->recalculateScore($masterLead);

            return $masterLead->fresh(['assignedUser', 'leadSource', 'products', 'followUps', 'activities']);
        });
    }

    /**
     * Get chronological activity timeline feed for a lead.
     */
    public function getTimeline(Lead $lead): Collection
    {
        return $lead->activities()->with('user')->orderBy('created_at', 'desc')->get();
    }

    /**
     * Recalculate lead intelligence score (0–100).
     */
    public function recalculateScore(Lead $lead): int
    {
        $breakdown = $this->getScoreBreakdown($lead);
        $finalScore = $breakdown['score'];

        $lead->score = $finalScore;
        $lead->saveQuietly();

        return $finalScore;
    }

    /**
     * Get detailed factors breakdown for a lead's intelligence score.
     */
    public function getScoreBreakdown(Lead $lead): array
    {
        $factors = [];
        $score = 0;

        // 1. Stage Base
        $statusPoints = [
            'new'          => 10,
            'contacted'    => 25,
            'interested'   => 45,
            'demo_meeting' => 65,
            'proposal'     => 75,
            'negotiation'  => 85,
            'won'          => 100,
            'lost'         => 0,
        ];
        $stagePts = $statusPoints[$lead->status] ?? 10;
        $score += $stagePts;
        $factors[] = [
            'label'  => 'Stage: ' . ucwords(str_replace('_', ' ', $lead->status)),
            'points' => $stagePts,
            'type'   => 'stage',
        ];

        // 2. Priority
        if ($lead->priority === 'hot') {
            $score += 15;
            $factors[] = ['label' => 'Hot Priority Intent', 'points' => 15, 'type' => 'priority'];
        } elseif ($lead->priority === 'warm') {
            $score += 5;
            $factors[] = ['label' => 'Warm Priority', 'points' => 5, 'type' => 'priority'];
        }

        // 3. Completed follow-ups
        $doneCount = $lead->followUps()->whereIn('status', ['done', 'completed'])->count();
        if ($doneCount > 0) {
            $donePts = min($doneCount * 5, 25);
            $score += $donePts;
            $factors[] = ['label' => "{$doneCount} Completed Touchpoint(s)", 'points' => $donePts, 'type' => 'engagement'];
        }

        // 4. Overdue follow-ups
        $overdueCount = $lead->followUps()->where('status', 'pending')->where('scheduled_at', '<', now())->count();
        if ($overdueCount > 0) {
            $overduePenalty = min($overdueCount * 10, 20);
            $score -= $overduePenalty;
            $factors[] = ['label' => "{$overdueCount} Overdue Follow-up(s) SLA Breach", 'points' => -$overduePenalty, 'type' => 'penalty'];
        }

        // 5. Missed follow-ups
        $missedCount = $lead->followUps()->where('status', 'missed')->count();
        if ($missedCount > 0) {
            $missedPenalty = min($missedCount * 5, 15);
            $score -= $missedPenalty;
            $factors[] = ['label' => "{$missedCount} Missed Discussion(s)", 'points' => -$missedPenalty, 'type' => 'penalty'];
        }

        // 6. Deal Value Bonus (>= 1,00,000)
        if ((float) $lead->budget >= 100000 || (float) $lead->value >= 100000) {
            $score += 10;
            $factors[] = ['label' => 'High Value Deal (≥ ₹1,00,000)', 'points' => 10, 'type' => 'value'];
        }

        // 7. Staleness Penalty
        $lastActive = $lead->last_activity_at ?? $lead->created_at;
        if ($lastActive && !in_array($lead->status, ['won', 'lost'])) {
            $staleDays = (int) now()->diffInDays($lastActive);
            if ($staleDays >= 7) {
                $stalePenalty = min($staleDays * 2, 30);
                $score -= $stalePenalty;
                $factors[] = ['label' => "Inactivity Decay ({$staleDays} days cold)", 'points' => -$stalePenalty, 'type' => 'decay'];
            }
        }

        $finalScore = max(0, min(100, $score));

        $grade = 'cool';
        if ($finalScore >= 80) $grade = 'hot';
        elseif ($finalScore >= 50) $grade = 'warm';
        elseif ($finalScore >= 25) $grade = 'cool';
        else $grade = 'cold';

        return [
            'lead_id' => $lead->id,
            'score'   => $finalScore,
            'grade'   => $grade,
            'factors' => $factors,
        ];
    }

    /**
     * Detect duplicate candidate leads by phone, email, or company.
     */
    public function findDuplicates(Lead $lead): array
    {
        $duplicates = [];
        $seenIds = [$lead->id];

        // 1. Phone match (exact raw string or normalized 10-digit match)
        if (!empty($lead->phone)) {
            $rawPhone = trim($lead->phone);
            $cleanPhone = preg_replace('/[^0-9]/', '', (string) $lead->phone);
            $last10 = strlen($cleanPhone) >= 10 ? substr($cleanPhone, -10) : $cleanPhone;

            $phoneMatches = Lead::query()
                ->whereNull('master_lead_id')
                ->where('id', '!=', $lead->id)
                ->where(function ($q) use ($rawPhone, $last10) {
                    $q->where('phone', $rawPhone)
                      ->orWhere('alt_phone', $rawPhone);
                    if (strlen($last10) >= 7) {
                        $q->orWhereRaw("REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', '') LIKE ?", ["%{$last10}%"])
                          ->orWhereRaw("REPLACE(REPLACE(REPLACE(REPLACE(alt_phone, ' ', ''), '-', ''), '+', ''), '(', '') LIKE ?", ["%{$last10}%"]);
                    }
                })
                ->with(['assignedUser'])
                ->get();

            foreach ($phoneMatches as $match) {
                if (!in_array($match->id, $seenIds)) {
                    $seenIds[] = $match->id;
                    $duplicates[] = [
                        'candidate'  => $match,
                        'match_type' => 'phone',
                        'confidence' => 100,
                        'reason'     => "Matching phone number ({$match->phone})",
                    ];
                }
            }
        }

        // 2. Email match (case-insensitive exact)
        if (!empty($lead->email)) {
            $emailMatches = Lead::query()
                ->whereNull('master_lead_id')
                ->where('id', '!=', $lead->id)
                ->whereRaw('LOWER(email) = ?', [strtolower(trim($lead->email))])
                ->with(['assignedUser'])
                ->get();

            foreach ($emailMatches as $match) {
                if (!in_array($match->id, $seenIds)) {
                    $seenIds[] = $match->id;
                    $duplicates[] = [
                        'candidate'  => $match,
                        'match_type' => 'email',
                        'confidence' => 95,
                        'reason'     => "Identical email address ({$match->email})",
                    ];
                }
            }
        }

        // 3. Company & Contact Name match
        if (!empty($lead->company) && !empty($lead->name)) {
            $companyMatches = Lead::query()
                ->whereNull('master_lead_id')
                ->where('id', '!=', $lead->id)
                ->whereRaw('LOWER(company) = ?', [strtolower(trim($lead->company))])
                ->whereRaw('LOWER(name) = ?', [strtolower(trim($lead->name))])
                ->with(['assignedUser'])
                ->get();

            foreach ($companyMatches as $match) {
                if (!in_array($match->id, $seenIds)) {
                    $seenIds[] = $match->id;
                    $duplicates[] = [
                        'candidate'  => $match,
                        'match_type' => 'company_contact',
                        'confidence' => 80,
                        'reason'     => "Matching contact name and company ({$match->company})",
                    ];
                }
            }
        }

        return $duplicates;
    }

    /**
     * Get anti-loss, velocity, and pipeline conversion analytics.
     */
    public function getAnalytics(?User $user = null): array
    {
        $baseQuery = Lead::query()->whereNull('master_lead_id');

        if ($user && ! $user->hasRole('super_admin') && ! $user->can('leads.view_all')) {
            $baseQuery->where('assigned_to', $user->id);
        }

        $now = now();
        $staleThreshold = now()->subHours(72);

        // Core Anti-Loss & Leakage Radar
        $totalLeads = (clone $baseQuery)->count();
        $activeLeads = (clone $baseQuery)->whereNotIn('status', ['won', 'lost'])->count();
        $wonLeads = (clone $baseQuery)->where('status', 'won')->count();
        $lostLeads = (clone $baseQuery)->where('status', 'lost')->count();
        $wonValue = (float) (clone $baseQuery)->where('status', 'won')->sum('value');
        $pipelineValue = (float) (clone $baseQuery)->whereNotIn('status', ['won', 'lost'])->sum('value');

        // Leakage Counts
        $unassignedLeads = (clone $baseQuery)->whereNull('assigned_to')->count();
        $staleLeads = (clone $baseQuery)
            ->whereNotIn('status', ['won', 'lost'])
            ->where(function ($q) use ($staleThreshold) {
                $q->where('last_activity_at', '<=', $staleThreshold)
                  ->orWhereNull('last_activity_at');
            })
            ->count();

        $leadsWithoutFollowUp = (clone $baseQuery)
            ->whereNotIn('status', ['won', 'lost'])
            ->whereDoesntHave('pendingFollowUps')
            ->count();

        // 8-Stage Funnel Distribution
        $stages = ['new', 'contacted', 'interested', 'demo_meeting', 'proposal', 'negotiation', 'won', 'lost'];
        $stageDistribution = [];
        $rawStageCounts = (clone $baseQuery)
            ->select('status', DB::raw('count(*) as count'), DB::raw('coalesce(sum(value), 0) as total_value'))
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        foreach ($stages as $stageKey) {
            $item = $rawStageCounts->get($stageKey);
            $stageCount = $item ? (int) $item->count : 0;
            $stageVal = $item ? (float) $item->total_value : 0.0;
            $conversionPct = $totalLeads > 0 ? round(($stageCount / $totalLeads) * 100, 1) : 0;

            $stageDistribution[] = [
                'stage'           => $stageKey,
                'count'           => $stageCount,
                'total_value'     => $stageVal,
                'conversion_rate' => $conversionPct,
            ];
        }

        // Lost Reasons Breakdown
        $lostReasons = (clone $baseQuery)
            ->where('status', 'lost')
            ->whereNotNull('lost_reason')
            ->select('lost_reason', DB::raw('count(*) as count'), DB::raw('coalesce(sum(value), 0) as total_value'))
            ->groupBy('lost_reason')
            ->orderByDesc('count')
            ->get();

        // Agent Accountability & Leakage Scoreboard
        $agents = User::whereHas('roles', function ($q) {
            $q->whereIn('name', ['sales_agent', 'sales_manager', 'super_admin']);
        })->get();

        $agentScoreboard = [];
        foreach ($agents as $agent) {
            $agentLeads = Lead::where('assigned_to', $agent->id)->whereNull('master_lead_id');
            $assignedTotal = (clone $agentLeads)->count();
            if ($assignedTotal === 0) {
                continue;
            }

            $agentActive = (clone $agentLeads)->whereNotIn('status', ['won', 'lost'])->count();
            $agentWon = (clone $agentLeads)->where('status', 'won')->count();
            $agentWonVal = (float) (clone $agentLeads)->where('status', 'won')->sum('value');
            $agentLost = (clone $agentLeads)->where('status', 'lost')->count();
            $agentOverdue = FollowUp::where('agent_id', $agent->id)->where('status', 'pending')->where('scheduled_at', '<', $now)->count();
            $agentDoneToday = FollowUp::where('agent_id', $agent->id)->whereIn('status', ['done', 'completed'])->whereDate('completed_at', today())->count();
            $agentStale = (clone $agentLeads)->whereNotIn('status', ['won', 'lost'])
                ->where(function ($q) use ($staleThreshold) {
                    $q->where('last_activity_at', '<=', $staleThreshold)->orWhereNull('last_activity_at');
                })->count();

            $winRate = ($agentWon + $agentLost) > 0 ? round(($agentWon / ($agentWon + $agentLost)) * 100, 1) : 0;

            $agentScoreboard[] = [
                'agent_id'         => $agent->id,
                'name'             => $agent->name,
                'email'            => $agent->email,
                'assigned_total'   => $assignedTotal,
                'active_count'     => $agentActive,
                'won_count'        => $agentWon,
                'won_value'        => $agentWonVal,
                'overdue_count'    => $agentOverdue,
                'done_today_count' => $agentDoneToday,
                'stale_count'      => $agentStale,
                'win_rate'         => $winRate,
            ];
        }

        // First Response Time (FRT) SLA estimates based on lead creation vs first activity
        $recentLeads = (clone $baseQuery)
            ->whereNotNull('last_activity_at')
            ->where('created_at', '>=', now()->subDays(30))
            ->limit(100)
            ->get(['created_at', 'last_activity_at']);

        $slaUnder15m = 0;
        $slaUnder1h = 0;
        $slaUnder24h = 0;
        $slaBreached = 0;

        foreach ($recentLeads as $rl) {
            $diffMinutes = $rl->created_at->diffInMinutes($rl->last_activity_at);
            if ($diffMinutes <= 15) {
                $slaUnder15m++;
            } elseif ($diffMinutes <= 60) {
                $slaUnder1h++;
            } elseif ($diffMinutes <= 1440) {
                $slaUnder24h++;
            } else {
                $slaBreached++;
            }
        }

        return [
            'overview' => [
                'total_leads'            => $totalLeads,
                'active_leads'           => $activeLeads,
                'won_leads'              => $wonLeads,
                'lost_leads'             => $lostLeads,
                'won_value'              => $wonValue,
                'pipeline_value'         => $pipelineValue,
                'unassigned_leads'       => $unassignedLeads,
                'stale_leads'            => $staleLeads,
                'leads_without_followup' => $leadsWithoutFollowUp,
            ],
            'funnel'          => $stageDistribution,
            'lost_reasons'    => $lostReasons,
            'agent_matrix'    => $agentScoreboard,
            'sla_compliance'  => [
                'under_15m' => $slaUnder15m,
                'under_1h'  => $slaUnder1h,
                'under_24h' => $slaUnder24h,
                'breached'  => $slaBreached,
            ],
        ];
    }
}
