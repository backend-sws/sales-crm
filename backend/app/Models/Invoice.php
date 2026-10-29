<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invoice extends Model
{
    protected $fillable = [
        'client_id',
        'client_service_id',
        'project_id',
        'milestone_id',
        'invoice_number',
        'issue_date',
        'due_date',
        'subtotal',
        'cgst_amount',
        'sgst_amount',
        'igst_amount',
        'total_amount',
        'paid_amount',
        'status',
        'paid_at',
        'line_items',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'issue_date'   => 'date',
            'due_date'     => 'date',
            'subtotal'     => 'float',
            'cgst_amount'  => 'float',
            'sgst_amount'  => 'float',
            'igst_amount'  => 'float',
            'total_amount' => 'float',
            'paid_amount'  => 'float',
            'paid_at'      => 'datetime',
            'line_items'   => 'array',
        ];
    }

    protected $appends = ['banking_details'];

    public function getBankingDetailsAttribute(): ?array
    {
        $bankName = AppSetting::get('bank_name');
        $bankAccountNo = AppSetting::get('bank_account_no');
        $bankIfsc = AppSetting::get('bank_ifsc');
        $bankBranch = AppSetting::get('bank_branch');
        $bankAccountName = AppSetting::get('bank_account_name');
        $bankUpiId = AppSetting::get('bank_upi_id');

        $hasBanking = !empty($bankName) || !empty($bankAccountNo) || !empty($bankIfsc) || !empty($bankUpiId);

        return $hasBanking ? [
            'bank_name'         => $bankName,
            'bank_branch'       => $bankBranch,
            'bank_account_name' => $bankAccountName,
            'bank_account_no'   => $bankAccountNo,
            'bank_ifsc'         => $bankIfsc,
            'bank_upi_id'       => $bankUpiId,
        ] : null;
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(ClientService::class, 'client_service_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(ProjectMilestone::class, 'milestone_id');
    }
}
