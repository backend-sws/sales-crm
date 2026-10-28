<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeedbackResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'milestone_id',
        'project_id',
        'developer_id',
        'client_user_id',
        'rating',
        'quality',
        'communication',
        'timeliness',
        'understanding',
        'would_work_again',
        'comment',
        'is_excluded',
        'exclusion_reason',
    ];

    protected $casts = [
        'rating'           => 'float',
        'quality'          => 'integer',
        'communication'    => 'integer',
        'timeliness'       => 'integer',
        'understanding'    => 'integer',
        'would_work_again' => 'boolean',
        'is_excluded'      => 'boolean',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(ProjectMilestone::class, 'milestone_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function developer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'developer_id');
    }

    public function clientUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_user_id');
    }
}
