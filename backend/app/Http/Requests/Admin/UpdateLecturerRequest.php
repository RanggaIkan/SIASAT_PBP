<?php

namespace App\Http\Requests\Admin;

use App\Models\Lecturer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLecturerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $lecturer = Lecturer::findOrFail($this->route('lecturerId'));

        return [
            'username' => ['required', 'string', 'max:50', Rule::unique('users', 'username')->ignore($lecturer->user_id)],
            'name' => ['required', 'string', 'max:120'],
            'password' => ['nullable', 'string', 'min:6', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'lecturer_number' => ['required', 'string', 'max:30', Rule::unique('lecturers', 'lecturer_number')->ignore($lecturer->id)],
            'faculty' => ['required', 'string', 'max:100'],
        ];
    }
}
