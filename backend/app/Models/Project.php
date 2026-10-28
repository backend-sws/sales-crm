<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'client_id',
        'client_service_id',
        'name',
        'description',
        'status',
        'pm_id',
        'start_date',
        'target_end_date',
        'total_value',
        'total_budget',
        'sprint_duration_days',
    ];

    protected $casts = [
        'start_date'           => 'date',
        'target_end_date'      => 'date',
        'total_value'          => 'float',
        'total_budget'         => 'float',
        'sprint_duration_days' => 'integer',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(ClientService::class, 'client_service_id');
    }

    public function projectManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pm_id');
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(ProjectMilestone::class);
    }

    public function sprints(): HasMany
    {
        return $this->hasMany(Sprint::class)->orderBy('start_date');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function scopeVersions(): HasMany
    {
        return $this->hasMany(ScopeVersion::class)->orderBy('version_number', 'desc');
    }

    public function baselineScope(): BelongsTo
    {
        return $this->belongsTo(ScopeVersion::class, 'id', 'project_id')->where('is_baseline', true);
    }

    public function changeRequests(): HasMany
    {
        return $this->hasMany(ChangeRequest::class)->latest();
    }

    public function meetings(): HasMany
    {
        return $this->hasMany(ProjectMeeting::class)->orderBy('scheduled_at', 'desc');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function githubRepos(): HasMany
    {
        return $this->hasMany(GithubRepo::class);
    }

    public function githubRepo(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(GithubRepo::class)->latestOfMany();
    }

    public function channels(): HasMany
    {
        return $this->hasMany(ProjectChannel::class);
    }

    public function feedbackResponses(): HasMany
    {
        return $this->hasMany(FeedbackResponse::class);
    }
}
