<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_id',
        'sprint_id',
        'milestone_id',
        'source_type',
        'source_id',
        'title',
        'description',
        'assignee_id',
        'status',
        'priority',
        'complexity',
        'story_points',
        'estimated_hours',
        'due_date',
        'completed_at',
        'rework_count',
        'is_proof_attached',
        'client_rating',
        'client_feedback',
    ];

    protected $casts = [
        'story_points'      => 'integer',
        'estimated_hours'   => 'float',
        'due_date'          => 'date',
        'completed_at'      => 'datetime',
        'rework_count'      => 'integer',
        'is_proof_attached' => 'boolean',
        'client_rating'     => 'integer',
    ];

    protected $appends = [
        'actual_hours',
        'is_blocked',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function sprint(): BelongsTo
    {
        return $this->belongsTo(Sprint::class);
    }

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(ProjectMilestone::class, 'milestone_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function dependsOn(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'task_id', 'depends_on_task_id');
    }

    public function blocking(): BelongsToMany
    {
        return $this->belongsToMany(Task::class, 'task_dependencies', 'depends_on_task_id', 'task_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class);
    }

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function getActualHoursAttribute(): float
    {
        $minutes = $this->timeEntries()->sum('duration_minutes');
        return round($minutes / 60, 2);
    }

    public function getIsBlockedAttribute(): bool
    {
        return $this->dependsOn()->where('status', '!=', 'done')->exists();
    }
}
