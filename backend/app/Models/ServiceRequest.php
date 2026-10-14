<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceRequest extends Model
{
    protected $fillable = [
        'client_service_id',
        'client_id',
        'ticket_number',
        'title',
        'description',
        'priority',
        'status',
        'added_by',
        'added_by_type',
        'assigned_to',
        'sla_deadline',
        'completed_at',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'sla_deadline' => 'datetime',
            'completed_at' => 'datetime',
            'confirmed_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(ClientService::class, 'client_service_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
