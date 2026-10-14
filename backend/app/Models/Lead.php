<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lead extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'alt_phone',
        'company',
        'city',
        'source',
        'source_id',
        'priority',
        'status',
        'score',
        'value',
        'budget',
        'lost_reason',
        'lost_notes',
        'assigned_to',
        'converted_client_id',
        'import_id',
        'master_lead_id',
        'last_activity_at',
        'created_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'budget' => 'decimal:2',
            'score' => 'integer',
            'last_activity_at' => 'datetime',
        ];
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function leadSource(): BelongsTo
    {
        return $this->belongsTo(LeadSource::class, 'source_id');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'lead_products')->withTimestamps();
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(FollowUp::class)->orderBy('scheduled_at', 'desc');
    }

    public function pendingFollowUps(): HasMany
    {
        return $this->hasMany(FollowUp::class)->where('status', 'pending')->orderBy('scheduled_at', 'asc');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(LeadActivity::class)->orderBy('created_at', 'desc');
    }

    public function masterLead(): BelongsTo
    {
        return $this->belongsTo(self::class, 'master_lead_id');
    }

    public function mergedLeads(): HasMany
    {
        return $this->hasMany(self::class, 'master_lead_id');
    }

    public function import(): BelongsTo
    {
        return $this->belongsTo(LeadImport::class, 'import_id');
    }

    public function convertedClient(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'converted_client_id');
    }
}
