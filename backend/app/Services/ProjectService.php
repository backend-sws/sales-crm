<?php

namespace App\Services;

use App\Contracts\Services\ProjectServiceInterface;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectService implements ProjectServiceInterface
{
    public function listProjects(array $filters = [], ?User $user = null): array
    {
        $user = $user ?? auth()->user();

        $query = Project::with([
            'client:id,name,company,email',
            'projectManager:id,name,email,avatar',
            'sprints' => fn($q) => $q->where('status', 'active')->limit(1),
        ])->withCount([
            'tasks',
            'tasks as completed_tasks_count' => fn($q) => $q->where('status', 'done'),
        ]);

        // Scoping based on user role
        if ($user) {
            if ($user->hasRole('client')) {
                // Client only sees their own organization's projects
                $query->where('client_id', $user->client_id);
            } elseif ($user->hasRole('developer') && ! $user->hasAnyRole(['super_admin', 'project_manager'])) {
                // Developer only sees projects where they have assigned tasks or are PM
                $query->where(function ($q) use ($user) {
                    $q->whereHas('tasks', fn($t) => $t->where('assignee_id', $user->id))
                      ->orWhere('pm_id', $user->id);
                });
            }
        }

        if (!empty($filters['client_id'])) {
            $query->where('client_id', $filters['client_id']);
        }

        if (!empty($filters['pm_id'])) {
            $query->where('pm_id', $filters['pm_id']);
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhereHas('client', fn($cq) => $cq->where('company', 'like', "%{$search}%"));
            });
        }

        $projects = $query->latest()->get();

        return $projects->map(function ($project) use ($user) {
            $isInternalManager = ! $user || $user->hasAnyRole(['super_admin', 'project_manager']);
            $budget = $isInternalManager ? $this->getBudgetSnapshot($project) : null;
            $totalTasks = $project->tasks_count ?? 0;
            $completedTasks = $project->completed_tasks_count ?? 0;
            $progressPercent = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;

            return [
                'id'                      => $project->id,
                'name'                    => $project->name,
                'description'             => $project->description,
                'status'                  => $project->status,
                'client'                  => $project->client,
                'project_manager'         => $project->projectManager,
                'active_sprint'           => $project->sprints->first(),
                'start_date'              => $project->start_date?->toDateString(),
                'target_end_date'         => $project->target_end_date?->toDateString(),
                'total_value'             => $isInternalManager ? (float) $project->total_value : null,
                'total_budget'            => $isInternalManager ? (float) $project->total_budget : null,
                'tasks_count'             => $totalTasks,
                'completed_tasks_count'   => $completedTasks,
                'progress_percent'        => $progressPercent,
                'budget_snapshot'         => $budget,
                'created_at'              => $project->created_at?->toISOString(),
            ];
        })->toArray();
    }

    public function getProjectDetail(int $projectId, ?User $user = null): array
    {
        $user = $user ?? auth()->user();

        $project = Project::with([
            'client.branding',
            'service',
            'projectManager:id,name,email,avatar,phone',
            'milestones' => fn($q) => $q->orderBy('due_date'),
            'sprints' => fn($q) => $q->orderBy('start_date', 'desc'),
            'tasks.assignee:id,name,email,avatar,hourly_rate',
            'tasks.dependsOn:id,title,status',
            'tasks.attachments',
            'scopeVersions' => fn($q) => $q->orderBy('version_number', 'desc')->with('author:id,name', 'approval'),
            'changeRequests.requester:id,name',
            'changeRequests.decider:id,name',
            'meetings.creator:id,name',
            'meetings.actionItems.assignee:id,name',
            'invoices' => fn($q) => $q->latest(),
        ])->findOrFail($projectId);

        if ($user) {
            if ($user->hasRole('client') && $project->client_id !== $user->client_id) {
                throw new \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException("You are not authorized to view this project.");
            }
            if ($user->hasRole('developer') && ! $user->hasAnyRole(['super_admin', 'project_manager'])) {
                $hasTask = $project->tasks()->where('assignee_id', $user->id)->exists();
                if (! $hasTask && $project->pm_id !== $user->id) {
                    throw new \Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException("You are not assigned to this project.");
                }
            }
        }

        $isInternalManager = ! $user || $user->hasAnyRole(['super_admin', 'project_manager']);
        $budgetSnapshot = $isInternalManager ? $this->getBudgetSnapshot($project) : null;
        $capacityMatrix = $isInternalManager ? $this->getCapacityMatrix($project) : [];

        // Hide hourly_rate on assignees for non-managers
        if (! $isInternalManager) {
            $project->tasks->each(function ($t) {
                if ($t->assignee) {
                    $t->assignee->makeHidden(['hourly_rate']);
                }
            });
        }

        $totalTasks = $project->tasks->count();
        $completedTasks = $project->tasks->where('status', 'done')->count();
        $progressPercent = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;

        return [
            'id'                   => $project->id,
            'name'                 => $project->name,
            'description'          => $project->description,
            'status'               => $project->status,
            'client'               => $project->client,
            'service'              => $project->service,
            'project_manager'      => $project->projectManager,
            'start_date'           => $project->start_date?->toDateString(),
            'target_end_date'      => $project->target_end_date?->toDateString(),
            'total_value'          => $isInternalManager ? (float) $project->total_value : null,
            'total_budget'         => $isInternalManager ? (float) $project->total_budget : null,
            'sprint_duration_days' => $project->sprint_duration_days,
            'progress_percent'     => $progressPercent,
            'milestones'           => $project->milestones,
            'sprints'              => $project->sprints,
            'tasks'                => $project->tasks,
            'scope_versions'       => $project->scopeVersions,
            'change_requests'      => $project->changeRequests,
            'meetings'             => $project->meetings,
            'invoices'             => $project->invoices,
            'budget_snapshot'      => $budgetSnapshot,
            'capacity_matrix'      => $capacityMatrix,
            'created_at'           => $project->created_at?->toISOString(),
        ];
    }

    public function createProject(array $data, User $creator): Project
    {
        $pmId = $data['pm_id'] ?? $creator->id;

        return DB::transaction(function () use ($data, $pmId) {
            $project = Project::create([
                'client_id'            => $data['client_id'],
                'client_service_id'    => $data['client_service_id'] ?? null,
                'name'                 => $data['name'],
                'description'          => $data['description'] ?? null,
                'status'               => $data['status'] ?? 'draft',
                'pm_id'                => $pmId,
                'start_date'           => $data['start_date'] ?? now()->toDateString(),
                'target_end_date'      => $data['target_end_date'] ?? now()->addMonths(2)->toDateString(),
                'total_value'          => $data['total_value'] ?? 0,
                'total_budget'         => $data['total_budget'] ?? 0,
                'sprint_duration_days' => $data['sprint_duration_days'] ?? 14,
            ]);

            // If initial scope body provided, create Scope Version 1
            if (!empty($data['initial_scope'])) {
                $project->scopeVersions()->create([
                    'version_number' => 1,
                    'document_body'  => $data['initial_scope'],
                    'is_baseline'    => false,
                    'status'         => 'draft',
                    'created_by'     => $pmId,
                ]);
            }

            return $project;
        });
    }

    public function updateProject(Project $project, array $data): Project
    {
        $project->update(array_filter([
            'name'                 => $data['name'] ?? null,
            'description'          => $data['description'] ?? null,
            'status'               => $data['status'] ?? null,
            'pm_id'                => $data['pm_id'] ?? null,
            'start_date'           => $data['start_date'] ?? null,
            'target_end_date'      => $data['target_end_date'] ?? null,
            'total_value'          => $data['total_value'] ?? null,
            'total_budget'         => $data['total_budget'] ?? null,
            'sprint_duration_days' => $data['sprint_duration_days'] ?? null,
        ], fn($val) => !is_null($val)));

        return $project->fresh();
    }

    public function getBudgetSnapshot(Project $project): array
    {
        $totalBudget = (float) $project->total_budget;
        $totalValue  = (float) $project->total_value;

        // Estimated cost = sum(task.estimated_hours * user.hourly_rate)
        $estimatedCost = (float) DB::table('tasks')
            ->join('users', 'tasks.assignee_id', '=', 'users.id')
            ->where('tasks.project_id', $project->id)
            ->whereNull('tasks.deleted_at')
            ->sum(DB::raw('COALESCE(tasks.estimated_hours, 0) * COALESCE(users.hourly_rate, 0)'));

        // Actual cost = sum((duration_minutes / 60) * user.hourly_rate)
        $actualCost = (float) DB::table('time_entries')
            ->join('tasks', 'time_entries.task_id', '=', 'tasks.id')
            ->join('users', 'time_entries.user_id', '=', 'users.id')
            ->where('tasks.project_id', $project->id)
            ->where('time_entries.is_billable', true)
            ->sum(DB::raw('(COALESCE(time_entries.duration_minutes, 0) / 60.0) * COALESCE(users.hourly_rate, 0)'));

        $budgetConsumedPercent = $totalBudget > 0
            ? round(($actualCost / $totalBudget) * 100, 1)
            : 0;

        $grossMargin = round($totalValue - $actualCost, 2);
        $marginPercent = $totalValue > 0
            ? round(($grossMargin / $totalValue) * 100, 1)
            : 0;

        return [
            'total_budget'            => $totalBudget,
            'total_value'             => $totalValue,
            'estimated_cost'          => round($estimatedCost, 2),
            'actual_cost'             => round($actualCost, 2),
            'budget_consumed_percent' => $budgetConsumedPercent,
            'is_over_budget'          => $budgetConsumedPercent >= 100,
            'is_alert_threshold'      => $budgetConsumedPercent >= 80,
            'gross_margin'            => $grossMargin,
            'gross_margin_percent'    => $marginPercent,
        ];
    }

    public function getCapacityMatrix(Project $project, int $weeks = 2): array
    {
        // Get all developers / designers assigned to project tasks or in system
        $developers = User::role(['developer', 'project_manager'])
            ->where('is_active', true)
            ->select('id', 'name', 'email', 'avatar', 'hourly_rate')
            ->get();

        $matrix = [];
        $weeklyCapacityHours = 40.0; // Standard 40h workweek

        foreach ($developers as $dev) {
            $assignedTasks = $dev->assignedTasks()
                ->where('status', '!=', 'done')
                ->get();

            $totalEstimated = (float) $assignedTasks->sum('estimated_hours');
            $actualHours = (float) $dev->timeEntries()->whereIn('task_id', $assignedTasks->pluck('id'))->sum(DB::raw('duration_minutes / 60.0'));
            $remainingHours = max(0, $totalEstimated - $actualHours);

            $availableHoursWeek1 = max(0, $weeklyCapacityHours - ($remainingHours / 2));
            $availableHoursWeek2 = max(0, $weeklyCapacityHours - ($remainingHours / 4));

            $utilizationPercent = $weeklyCapacityHours > 0
                ? round((($weeklyCapacityHours - $availableHoursWeek1) / $weeklyCapacityHours) * 100)
                : 0;

            $matrix[] = [
                'developer'           => $dev,
                'open_tasks_count'    => $assignedTasks->count(),
                'remaining_hours'     => round($remainingHours, 1),
                'available_week_1'    => round($availableHoursWeek1, 1),
                'available_week_2'    => round($availableHoursWeek2, 1),
                'utilization_percent' => $utilizationPercent,
                'is_over_allocated'   => $utilizationPercent > 100,
            ];
        }

        return $matrix;
    }

    public function createMilestone(Project $project, array $data): ProjectMilestone
    {
        return $project->milestones()->create([
            'title'        => $data['title'],
            'description'  => $data['description'] ?? null,
            'amount'       => $data['amount'] ?? 0,
            'due_date'     => $data['due_date'] ?? null,
            'status'       => $data['status'] ?? 'pending',
            'completed_at' => ($data['status'] ?? null) === 'completed' ? now() : null,
        ]);
    }

    public function invoiceMilestone(ProjectMilestone $milestone): Invoice
    {
        if ($milestone->status === 'invoiced') {
            throw ValidationException::withMessages([
                'milestone' => ['This milestone has already been invoiced.'],
            ]);
        }

        $project = $milestone->project;
        $client = $project->client;

        return DB::transaction(function () use ($milestone, $project, $client) {
            $subtotal = (float) $milestone->amount;
            $isSameState = strtolower(trim($client->billing_state ?? '')) === 'maharashtra';

            if ($isSameState) {
                $cgst = round($subtotal * 0.09, 2);
                $sgst = round($subtotal * 0.09, 2);
                $igst = 0.0;
            } else {
                $cgst = 0.0;
                $sgst = 0.0;
                $igst = round($subtotal * 0.18, 2);
            }

            $total = round($subtotal + $cgst + $sgst + $igst, 2);
            $invoiceNumber = 'INV-' . date('Y') . '-' . str_pad((string) (Invoice::count() + 1), 4, '0', STR_PAD_LEFT);

            $invoice = Invoice::create([
                'client_id'         => $client->id,
                'project_id'        => $project->id,
                'milestone_id'      => $milestone->id,
                'invoice_number'    => $invoiceNumber,
                'issue_date'        => now()->toDateString(),
                'due_date'          => now()->addDays(14)->toDateString(),
                'subtotal'          => $subtotal,
                'cgst_amount'       => $cgst,
                'sgst_amount'       => $sgst,
                'igst_amount'       => $igst,
                'total_amount'      => $total,
                'paid_amount'       => 0,
                'status'            => 'sent',
                'line_items'        => [
                    [
                        'description' => "Project Milestone: {$milestone->title} ({$project->name})",
                        'amount'      => $subtotal,
                    ],
                ],
                'notes'             => "Milestone billing for {$project->name}",
            ]);

            $milestone->update(['status' => 'invoiced', 'completed_at' => now()]);

            return $invoice;
        });
    }
}
