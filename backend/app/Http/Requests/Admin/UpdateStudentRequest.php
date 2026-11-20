<?php

namespace App\Http\Requests\Admin;

use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $student = Student::findOrFail($this->route('studentId'));

        return [
            'username' => ['required', 'string', 'max:50', Rule::unique('users', 'username')->ignore($student->user_id)],
            'name' => ['required', 'string', 'max:120'],
            'password' => ['nullable', 'string', 'min:6', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'student_number' => ['required', 'string', 'max:30', Rule::unique('students', 'student_number')->ignore($student->id)],
            'study_program' => ['required', 'string', 'max:100'],
            'cohort_year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'max_credits' => ['sometimes', 'integer', 'min:12', 'max:24'],
        ];
    }
}
