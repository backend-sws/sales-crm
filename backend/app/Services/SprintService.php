<?php

namespace App\Services;

use App\Contracts\Services\SprintServiceInterface;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use Carbon\Carbon;

class SprintService implements SprintServiceInterface
{
    public function listSprints(Project $project): array
    {
        return $project->sprints()
            ->withCount([
                'tasks',
                'tasks as completed_tasks_count' => fn($q) => $q->where('status', 'done'),
            ])
            ->orderBy('start_date', 'desc')
            ->get()
            ->map(function ($sprint) {
                $totalPoints = (float) $sprint->tasks()->sum('story_points');
                $completedPoints = (float) $sprint->tasks()->where('status', 'done')->sum('story_points');

                return [
                    'id'                     => $sprint->id,
                    'name'                   => $sprint->name,
                    'goal'                   => $sprint->goal,
                    'start_date'             => $sprint->start_date->toDateString(),
                    'end_date'               => $sprint->end_date->toDateString(),
                    'status'                 => $sprint->status,
                    'velocity_target'        => (float) $sprint->velocity_target,
                    'velocity_achieved'      => (float) $sprint->velocity_achieved,
                    'tasks_count'            => $sprint->tasks_count,
                    'completed_tasks_count'  => $sprint->completed_tasks_count,
                    'total_story_points'     => $totalPoints,
                    'completed_story_points' => $completedPoints,
                    'retrospective_notes'    => $sprint->retrospective_notes,
                ];
            })
            ->toArray();
    }

    public function createSprint(Project $project, array $data): Sprint
    {
        $startDate = !empty($data['start_date']) ? Carbon::parse($data['start_date']) : now();
        $days = (int) ($project->sprint_duration_days ?: 14);
        $endDate = !empty($data['end_date']) ? Carbon::parse($data['end_date']) : (clone $startDate)->addDays($days);

        // If setting this sprint to active, set any other active sprint to planned
        if (($data['status'] ?? 'planned') === 'active') {
            $project->sprints()->where('status', 'active')->update(['status' => 'planned']);
        }

        return $project->sprints()->create([
            'name'            => $data['name'],
            'goal'            => $data['goal'] ?? null,
            'start_date'      => $startDate->toDateString(),
            'end_date'        => $endDate->toDateString(),
            'velocity_target' => $data['velocity_target'] ?? null,
            'status'          => $data['status'] ?? 'planned',
        ]);
    }

    public function assignTasksToSprint(Sprint $sprint, array $taskIds): int
    {
        return Task::whereIn('id', $taskIds)
            ->where('project_id', $sprint->project_id)
            ->update(['sprint_id' => $sprint->id]);
    }

    public function getBurndownData(Sprint $sprint): array
    {
        $tasks = $sprint->tasks()->get();
        $totalScope = (float) ($tasks->sum('story_points') ?: $tasks->sum('estimated_hours') ?: ($tasks->count() * 5));

        // If tasks have 0 total points or sprint has no tasks yet, baseline to velocity_target so chart is not empty/flat
        if ($totalScope <= 0) {
            $totalScope = (float) ($sprint->velocity_target ?: 40);
        }

        $startDate = Carbon::parse($sprint->start_date)->startOfDay();
        $endDate = Carbon::parse($sprint->end_date)->endOfDay();
        $totalDays = max(1, (int) $startDate->diffInDays($endDate) + 1);

        $dataPoints = [];
        $currentDate = clone $startDate;
        $dayIndex = 1;

        while ($currentDate->lte($endDate)) {
            $dateString = $currentDate->toDateString();

            // Ideal burndown decreases linearly to 0 on last day
            $idealRemaining = round($totalScope - (($totalScope / ($totalDays - 1 ?: 1)) * ($dayIndex - 1)), 1);
            $idealRemaining = max(0, $idealRemaining);

            // Actual remaining = totalScope - tasks completed on or before this day
            if ($currentDate->isFuture()) {
                $actualRemaining = null; // Do not plot future days
            } else {
                $completedPoints = (float) $tasks
                    ->filter(function($t) use ($currentDate) {
                        if ($t->status !== 'done') return false;
                        $doneDate = $t->completed_at ? Carbon::parse($t->completed_at) : Carbon::parse($t->updated_at);
                        return $doneDate->lte($currentDate->endOfDay());
                    })
                    ->sum(fn($t) => $t->story_points ?: $t->estimated_hours ?: 5);

                $actualRemaining = max(0, round($totalScope - $completedPoints, 1));
            }

            $dataPoints[] = [
                'day'              => "Day {$dayIndex}",
                'date'             => $dateString,
                'ideal_remaining'  => $idealRemaining,
                'actual_remaining' => $actualRemaining,
            ];

            $currentDate->addDay();
            $dayIndex++;
        }

        return [
            'sprint_id'       => $sprint->id,
            'sprint_name'     => $sprint->name,
            'total_scope'     => $totalScope,
            'total_days'      => $totalDays,
            'burndown_points' => $dataPoints,
        ];
    }

    public function updateSprint(Sprint $sprint, array $data): Sprint
    {
        if (!empty($data['start_date'])) {
            $data['start_date'] = Carbon::parse($data['start_date'])->toDateString();
        }
        if (!empty($data['end_date'])) {
            $data['end_date'] = Carbon::parse($data['end_date'])->toDateString();
        }

        // If activating this sprint, move other active sprints to planned
        if (($data['status'] ?? null) === 'active') {
            $sprint->project->sprints()->where('id', '!=', $sprint->id)->where('status', 'active')->update(['status' => 'planned']);
        }

        $sprint->update($data);

        return $sprint->fresh();
    }

    public function closeSprint(Sprint $sprint, ?string $retrospectiveNotes = null): Sprint
    {
        $completedVelocity = (float) $sprint->tasks()
            ->where('status', 'done')
            ->sum(fn($t) => $t->story_points ?: $t->estimated_hours ?: 1);

        $sprint->update([
            'status'              => 'completed',
            'velocity_achieved'   => $completedVelocity,
            'retrospective_notes' => $retrospectiveNotes ?? $sprint->retrospective_notes,
        ]);

        return $sprint->fresh();
    }
}
