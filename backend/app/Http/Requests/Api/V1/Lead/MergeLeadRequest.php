<?php

namespace App\Http\Requests\Api\V1\Lead;

use Illuminate\Foundation\Http\FormRequest;

class MergeLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'duplicate_lead_id' => ['required', 'exists:leads,id', 'different:id'],
        ];
    }
}
