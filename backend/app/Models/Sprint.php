<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sprint extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'goal',
        'start_date',
        'end_date',
        'velocity_target',
        'velocity_achieved',
        'retrospective_notes',
        'status',
    ];

    protected $casts = [
        'start_date'        => 'date:Y-m-d',
        'end_date'          => 'date:Y-m-d',
        'velocity_target'   => 'float',
        'velocity_achieved' => 'float',
    ];

    protected $appends = [
        'total_story_points',
        'completed_story_points',
        'tasks_count',
        'completed_tasks_count',
    ];

    public function getTotalStoryPointsAttribute(): float
    {
        if ($this->relationLoaded('tasks')) {
            return (float) $this->tasks->sum(fn($t) => $t->story_points ?: $t->estimated_hours ?: 5);
        }
        return (float) ($this->tasks()->sum('story_points') ?: $this->tasks()->sum('estimated_hours') ?: ($this->tasks()->count() * 5));
    }

    public function getCompletedStoryPointsAttribute(): float
    {
        if ($this->relationLoaded('tasks')) {
            return (float) $this->tasks->where('status', 'done')->sum(fn($t) => $t->story_points ?: $t->estimated_hours ?: 5);
        }
        return (float) ($this->tasks()->where('status', 'done')->sum('story_points') ?: $this->tasks()->where('status', 'done')->sum('estimated_hours') ?: ($this->tasks()->where('status', 'done')->count() * 5));
    }

    public function getTasksCountAttribute(): int
    {
        if ($this->relationLoaded('tasks')) {
            return $this->tasks->count();
        }
        return $this->tasks()->count();
    }

    public function getCompletedTasksCountAttribute(): int
    {
        if ($this->relationLoaded('tasks')) {
            return $this->tasks->where('status', 'done')->count();
        }
        return $this->tasks()->where('status', 'done')->count();
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
