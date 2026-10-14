<?php

namespace App\Http\Requests\Api\V1\FollowUp;

use Illuminate\Foundation\Http\FormRequest;

class StoreFollowUpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'lead_id'      => ['required', 'exists:leads,id'],
            'agent_id'     => ['nullable', 'exists:users,id'],
            'type'         => ['required', 'string', 'in:call,whatsapp,email,meeting'],
            'scheduled_at' => ['required', 'date'],
        ];
    }
}
