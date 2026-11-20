<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSemesterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $semesterId = (int) $this->route('semesterId');

        return [
            'code' => ['required', 'string', 'max:20', Rule::unique('semesters', 'code')->ignore($semesterId)],
            'name' => ['required', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
            'enrollment_start_at' => ['required', 'date'],
            'enrollment_end_at' => ['required', 'date', 'after:enrollment_start_at'],
        ];
    }
}
