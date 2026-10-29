<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasRoles, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'avatar',
        'is_active',
        'client_id',
        'hourly_rate',
        'last_seen_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'is_active'         => 'boolean',
            'hourly_rate'       => 'decimal:2',
            'last_seen_at'      => 'datetime',
        ];
    }

    /**
     * Determine if the user is currently online (active within past 90 seconds).
     */
    public function getIsOnlineAttribute(): bool
    {
        return $this->last_seen_at && $this->last_seen_at->gt(now()->subSeconds(90));
    }

    /**
     * Override guard for spatie/laravel-permission.
     * We use Sanctum (api guard) — not the web session guard.
     */
    public function guardName(): string
    {
        return 'api';
    }

    public function assignedLeads(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Lead::class, 'assigned_to');
    }

    public function followUps(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(FollowUp::class, 'agent_id');
    }

    public function client(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function managedProjects(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Project::class, 'pm_id');
    }

    public function assignedTasks(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Task::class, 'assignee_id');
    }

    public function timeEntries(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(TimeEntry::class, 'user_id');
    }

    public function feedbackResponses(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(FeedbackResponse::class, 'developer_id');
    }

    public function performanceScores(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PerformanceScore::class, 'developer_id');
    }
}

