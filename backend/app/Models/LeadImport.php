<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeadImport extends Model
{
    protected $fillable = [
        'user_id',
        'filename',
        'total_rows',
        'processed_rows',
        'imported_count',
        'duplicate_count',
        'error_count',
        'status',
        'error_log',
    ];

    protected function casts(): array
    {
        return [
            'error_log' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'import_id');
    }
}
