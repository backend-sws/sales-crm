<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'company',
        'email',
        'phone',
        'gst_number',
        'billing_address',
        'billing_state',
        'source_lead_id',
        'account_manager_id',
        'onboarding_completed',
        'onboarding_steps',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'onboarding_completed' => 'boolean',
            'onboarding_steps'     => 'array',
        ];
    }

    public function sourceLead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'source_lead_id');
    }

    public function accountManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'account_manager_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'client_id');
    }

    public function branding(): HasOne
    {
        return $this->hasOne(ClientBranding::class, 'client_id');
    }

    public function services(): HasMany
    {
        return $this->hasMany(ClientService::class, 'client_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ClientDocument::class, 'client_id');
    }

    public function serviceRequests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class, 'client_id');
    }

    public function serviceReports(): HasMany
    {
        return $this->hasMany(ServiceReport::class, 'client_id');
    }

    public function healthScore(): HasOne
    {
        return $this->hasOne(ClientHealthScore::class, 'client_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'client_id');
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'client_id');
    }
}
