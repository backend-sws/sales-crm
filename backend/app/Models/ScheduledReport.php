<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduledReport extends Model
{
    protected $fillable = [
        'user_id',
        'report_type',
        'frequency',
        'last_generated_at',
        'file_url',
        'status',
        'parameters',
    ];

    protected function casts(): array
    {
        return [
            'last_generated_at' => 'datetime',
            'parameters'        => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
