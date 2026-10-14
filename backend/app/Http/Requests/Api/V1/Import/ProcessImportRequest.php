<?php

namespace App\Http\Requests\Api\V1\Import;

use Illuminate\Foundation\Http\FormRequest;

class ProcessImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'rows'               => ['required', 'array', 'min:1'],
            'column_mapping'     => ['required', 'array'],
            'duplicate_strategy' => ['nullable', 'string', 'in:skip,update,add'],
            'assigned_agent_id'  => ['nullable', 'exists:users,id'],
        ];
    }
}
