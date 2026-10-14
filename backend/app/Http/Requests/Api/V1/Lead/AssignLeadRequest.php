<?php

namespace App\Http\Requests\Api\V1\Lead;

use Illuminate\Foundation\Http\FormRequest;

class AssignLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'agent_id' => ['required', 'exists:users,id'],
        ];
    }
}
