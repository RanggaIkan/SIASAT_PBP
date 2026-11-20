<?php

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class SaveDraftStudyPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'course_class_ids' => ['present', 'array'],
            'course_class_ids.*' => ['integer', 'exists:course_classes,id'],
        ];
    }
}
