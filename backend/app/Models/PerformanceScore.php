<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerformanceScore extends Model
{
    use HasFactory;

    protected $fillable = [
        'developer_id',
        'period',
        'final_score',
        'client_score',
        'ontime_score',
        'rework_score',
        'pm_score',
        'estimate_score',
        'sample_size',
        'breakdown_json',
    ];

    protected $casts = [
        'final_score'    => 'float',
        'client_score'   => 'float',
        'ontime_score'   => 'float',
        'rework_score'   => 'float',
        'pm_score'       => 'float',
        'estimate_score' => 'float',
        'sample_size'    => 'integer',
        'breakdown_json' => 'array',
    ];

    public function developer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'developer_id');
    }
}
