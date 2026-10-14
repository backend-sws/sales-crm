<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScopeApproval extends Model
{
    use HasFactory;

    protected $fillable = [
        'scope_version_id',
        'user_id',
        'signer_name',
        'signature_data',
        'signature_type',
        'ip_address',
        'user_agent',
        'approved_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
    ];

    public function scopeVersion(): BelongsTo
    {
        return $this->belongsTo(ScopeVersion::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
