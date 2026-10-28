<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GithubPullRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'repo_id',
        'pr_number',
        'title',
        'author',
        'state',
        'merged_at',
    ];

    protected $casts = [
        'pr_number' => 'integer',
        'merged_at' => 'datetime',
    ];

    public function repo(): BelongsTo
    {
        return $this->belongsTo(GithubRepo::class, 'repo_id');
    }
}
