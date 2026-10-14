<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChangeRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'requested_by',
        'title',
        'description',
        'estimated_hours',
        'additional_cost',
        'timeline_delay_days',
        'status',
        'decision_notes',
        'decided_by',
        'client_decision_at',
    ];

    protected $casts = [
        'estimated_hours'     => 'float',
        'additional_cost'     => 'float',
        'timeline_delay_days' => 'integer',
        'client_decision_at'  => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
