<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectChannel extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'is_internal',
        'topic',
    ];

    protected $casts = [
        'is_internal' => 'boolean',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ProjectMessage::class, 'channel_id');
    }
}
