<?php

namespace App\Http\Requests\Api\V1\Lead;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'         => ['sometimes', 'required', 'string', 'max:255'],
            'email'        => ['nullable', 'email', 'max:255'],
            'phone'        => ['nullable', 'string', 'max:50'],
            'alt_phone'    => ['nullable', 'string', 'max:50'],
            'company'      => ['nullable', 'string', 'max:255'],
            'city'         => ['nullable', 'string', 'max:100'],
            'source'       => ['nullable', 'string', 'max:100'],
            'source_id'    => ['nullable', 'exists:lead_sources,id'],
            'priority'     => ['nullable', 'in:hot,warm,cold'],
            'status'       => ['nullable', 'in:new,contacted,interested,demo_meeting,proposal,negotiation,won,lost'],
            'budget'       => ['nullable', 'numeric', 'min:0'],
            'value'        => ['nullable', 'numeric', 'min:0'],
            'notes'        => ['nullable', 'string'],
            'lost_reason'  => ['nullable', 'string', 'max:255'],
            'lost_notes'   => ['nullable', 'string'],
            'assigned_to'  => ['nullable', 'exists:users,id'],
            'product_ids'  => ['nullable', 'array'],
            'product_ids.*'=> ['exists:products,id'],
        ];
    }
}
