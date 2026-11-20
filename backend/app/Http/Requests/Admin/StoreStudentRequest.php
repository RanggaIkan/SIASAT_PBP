<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'max:50', 'unique:users,username'],
            'name' => ['required', 'string', 'max:120'],
            'password' => ['required', 'string', 'min:6', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'student_number' => ['required', 'string', 'max:30', 'unique:students,student_number'],
            'study_program' => ['required', 'string', 'max:100'],
            'cohort_year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'max_credits' => ['sometimes', 'integer', 'min:12', 'max:24'],
        ];
    }
}
