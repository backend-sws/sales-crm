<?php

namespace App\Http\Requests\Api\V1\Import;

use Illuminate\Foundation\Http\FormRequest;

class PreviewImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:10240'],
        ];
    }
}
