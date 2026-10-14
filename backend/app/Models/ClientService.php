<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientService extends Model
{
    protected $fillable = [
        'client_id',
        'product_id',
        'service_name',
        'service_type',
        'status',
        'start_date',
        'billing_cycle',
        'value',
        'next_invoice_date',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date'        => 'date',
            'next_invoice_date' => 'date',
            'value'             => 'float',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function requests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class, 'client_service_id');
    }

    public function reports(): HasMany
    {
        return $this->hasMany(ServiceReport::class, 'client_service_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'client_service_id');
    }
}
