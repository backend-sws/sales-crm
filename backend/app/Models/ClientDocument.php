<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientDocument extends Model
{
    protected $fillable = [
        'client_id',
        'type',
        'title',
        'file_url',
        'signed_file_url',
        'status',
        'signed_at',
        'signer_ip',
        'signer_name',
        'signature_data_url',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'signed_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
