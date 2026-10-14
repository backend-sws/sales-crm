<?php

namespace App\Http\Requests\Api\V1\Lead;

use Illuminate\Foundation\Http\FormRequest;

class BulkAssignLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lead_ids'   => ['required', 'array', 'min:1'],
            'lead_ids.*' => ['exists:leads,id'],
            'agent_id'   => ['required', 'exists:users,id'],
        ];
    }
}
