<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectMeeting extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'title',
        'agenda',
        'mom_body',
        'recording_url',
        'scheduled_at',
        'status',
        'is_auto_accepted',
        'is_disputed',
        'dispute_reason',
        'client_confirmed_at',
        'auto_accepted_at',
        'created_by',
    ];

    protected $casts = [
        'scheduled_at'        => 'datetime',
        'is_auto_accepted'    => 'boolean',
        'is_disputed'         => 'boolean',
        'client_confirmed_at' => 'datetime',
        'auto_accepted_at'    => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function actionItems(): HasMany
    {
        return $this->hasMany(MeetingActionItem::class, 'meeting_id');
    }
}
