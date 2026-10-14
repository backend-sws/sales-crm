<?php

namespace App\Contracts\Services;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface LeadServiceInterface
{
    /**
     * Get paginated leads with filters and role-scoped visibility.
     */
    public function getPaginatedLeads(array $filters = [], int $perPage = 15, ?User $user = null): LengthAwarePaginator;

    /**
     * Get all leads grouped for Kanban board.
     */
    public function getKanbanLeads(array $filters = [], ?User $user = null): array;

    /**
     * Find a lead by ID with role check.
     */
    public function findLeadById(int $id, ?User $user = null): ?Lead;

    /**
     * Create a new lead.
     */
    public function createLead(array $data, ?User $creator = null): Lead;

    /**
     * Update an existing lead.
     */
    public function updateLead(Lead $lead, array $data, ?User $actor = null): Lead;

    /**
     * Soft delete a lead.
     */
    public function deleteLead(Lead $lead, ?User $actor = null): bool;

    /**
     * Update lead pipeline status with mandatory lost reason handling and intelligence score recalculation.
     */
    public function updateStatus(Lead $lead, string $status, ?string $lostReason = null, ?string $lostNotes = null, ?User $actor = null): Lead;

    /**
     * Assign or reassign lead to a sales agent.
     */
    public function assignLead(Lead $lead, int $agentId, ?User $actor = null): Lead;

    /**
     * Bulk reassign multiple leads to an agent.
     */
    public function bulkAssign(array $leadIds, int $agentId, ?User $actor = null): int;

    /**
     * Bulk update stage/status for multiple leads.
     */
    public function bulkUpdateStatus(array $leadIds, string $status, ?User $actor = null): int;

    /**
     * Merge duplicate lead into master lead, combining activity logs.
     */
    public function mergeLeads(Lead $masterLead, Lead $duplicateLead, ?User $actor = null): Lead;

    /**
     * Get chronological activity timeline feed for a lead.
     */
    public function getTimeline(Lead $lead): Collection;

    /**
     * Recalculate lead intelligence score (0–100).
     */
    public function recalculateScore(Lead $lead): int;

    /**
     * Get detailed factors breakdown for a lead's intelligence score.
     */
    public function getScoreBreakdown(Lead $lead): array;

    /**
     * Detect duplicate candidate leads by phone, email, or company.
     */
    public function findDuplicates(Lead $lead): array;

    /**
     * Get anti-loss, velocity, and pipeline conversion analytics.
     */
    public function getAnalytics(?User $user = null): array;
}
