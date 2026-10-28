<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GithubCommit extends Model
{
    use HasFactory;

    protected $fillable = [
        'repo_id',
        'task_id',
        'user_id',
        'sha',
        'author_github',
        'author_name',
        'message',
        'additions',
        'deletions',
        'committed_at',
    ];

    protected $casts = [
        'additions'    => 'integer',
        'deletions'    => 'integer',
        'committed_at' => 'datetime',
    ];

    public function repo(): BelongsTo
    {
        return $this->belongsTo(GithubRepo::class, 'repo_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
