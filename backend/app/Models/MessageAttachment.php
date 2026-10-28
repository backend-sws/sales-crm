<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessageAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'message_id',
        'file_name',
        'file_url',
        'file_type',
        'file_size_bytes',
    ];

    protected $casts = [
        'file_size_bytes' => 'integer',
    ];

    public function message(): BelongsTo
    {
        return $this->belongsTo(ProjectMessage::class, 'message_id');
    }
}
