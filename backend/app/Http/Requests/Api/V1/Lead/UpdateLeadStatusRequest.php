<?php

namespace App\Http\Requests\Api\V1\Lead;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLeadStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status'      => ['required', 'string', 'in:new,contacted,interested,demo_meeting,proposal,negotiation,won,lost'],
            'lost_reason' => ['required_if:status,lost', 'nullable', 'string', 'max:255'],
            'lost_notes'  => ['nullable', 'string'],
        ];
    }
}
