<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $courseId = (int) $this->route('courseId');

        return [
            'course_code' => ['required', 'string', 'max:20', Rule::unique('courses', 'course_code')->ignore($courseId)],
            'course_name' => ['required', 'string', 'max:120'],
            'credits' => ['required', 'integer', 'min:1', 'max:6'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
