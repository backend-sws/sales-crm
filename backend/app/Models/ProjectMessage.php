<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'channel_id',
        'user_id',
        'parent_id',
        'content',
        'code_snippet',
        'code_language',
        'is_internal',
    ];

    protected $casts = [
        'is_internal' => 'boolean',
    ];

    public function channel(): BelongsTo
    {
        return $this->belongsTo(ProjectChannel::class, 'channel_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ProjectMessage::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(ProjectMessage::class, 'parent_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(MessageAttachment::class, 'message_id');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(MessageReaction::class, 'message_id');
    }
}
