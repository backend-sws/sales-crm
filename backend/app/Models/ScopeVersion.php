<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ScopeVersion extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'version_number',
        'document_body',
        'pdf_snapshot_url',
        'diff_from_version_id',
        'is_baseline',
        'status',
        'created_by',
    ];

    protected $casts = [
        'version_number' => 'integer',
        'is_baseline'    => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function diffFromVersion(): BelongsTo
    {
        return $this->belongsTo(ScopeVersion::class, 'diff_from_version_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approval(): HasOne
    {
        return $this->hasOne(ScopeApproval::class);
    }
}
