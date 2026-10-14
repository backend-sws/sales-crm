<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientHealthScore extends Model
{
    protected $fillable = [
        'client_id',
        'score',
        'ticket_score',
        'payment_score',
        'engagement_score',
        'feedback_score',
        'response_score',
        'status',
        'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'score'            => 'float',
            'ticket_score'     => 'float',
            'payment_score'    => 'float',
            'engagement_score' => 'float',
            'feedback_score'   => 'float',
            'response_score'   => 'float',
            'calculated_at'    => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
