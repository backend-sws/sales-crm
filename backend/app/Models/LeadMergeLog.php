<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadMergeLog extends Model
{
    protected $fillable = [
        'master_lead_id',
        'merged_lead_id',
        'merged_by',
        'merged_data_snapshot',
    ];

    protected function casts(): array
    {
        return [
            'merged_data_snapshot' => 'array',
        ];
    }

    public function masterLead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'master_lead_id');
    }

    public function mergedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merged_by');
    }
}
