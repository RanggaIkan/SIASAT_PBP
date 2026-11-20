<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreLecturerRequest extends FormRequest
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
            'lecturer_number' => ['required', 'string', 'max:30', 'unique:lecturers,lecturer_number'],
            'faculty' => ['required', 'string', 'max:100'],
        ];
    }
}
