<?php

namespace App\Http\Requests\Api\V1\FollowUp;

use Illuminate\Foundation\Http\FormRequest;

class CompleteFollowUpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'outcome'           => ['required', 'string', 'max:1000'],
            'next_type'         => ['nullable', 'string', 'in:call,whatsapp,email,meeting'],
            'next_scheduled_at' => ['nullable', 'required_with:next_type', 'date', 'after:now'],
            'next_agent_id'     => ['nullable', 'exists:users,id'],
        ];
    }
}
