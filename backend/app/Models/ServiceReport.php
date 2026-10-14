<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceReport extends Model
{
    protected $fillable = [
        'client_service_id',
        'client_id',
        'title',
        'period',
        'file_url',
        'metrics',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'metrics' => 'array',
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

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
