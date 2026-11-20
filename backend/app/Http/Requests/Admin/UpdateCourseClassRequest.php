<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateCourseClassRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'semester_id' => ['required', 'integer', 'exists:semesters,id'],
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'lecturer_id' => ['required', 'integer', 'exists:lecturers,id'],
            'class_code' => ['required', 'string', 'max:10'],
            'day_of_week' => ['required', 'in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday'],
            'start_time' => ['required', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'end_time' => ['required', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'room' => ['required', 'string', 'max:50'],
            'quota' => ['required', 'integer', 'min:1', 'max:500'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $start = substr((string) $this->input('start_time', ''), 0, 5);
            $end = substr((string) $this->input('end_time', ''), 0, 5);

            if ($start !== '' && $end !== '' && $end <= $start) {
                $validator->errors()->add('end_time', 'Jam selesai harus lebih besar dari jam mulai.');
            }
        });
    }
}
