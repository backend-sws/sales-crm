<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientBranding extends Model
{
    protected $table = 'client_branding';

    protected $fillable = [
        'client_id',
        'logo_url',
        'primary_color',
        'subdomain',
        'custom_domain',
        'hide_vendor_branding',
        'enabled_features',
    ];

    protected function casts(): array
    {
        return [
            'hide_vendor_branding' => 'boolean',
            'enabled_features'     => 'array',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
