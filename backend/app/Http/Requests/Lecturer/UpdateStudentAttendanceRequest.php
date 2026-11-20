<?php

namespace App\Http\Requests\Lecturer;

class UpdateStudentAttendanceRequest extends BaseLecturerRequest
{
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', 'in:present,excused,sick,absent'],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.required' => 'Status kehadiran wajib diisi.',
            'status.in' => 'Status kehadiran harus salah satu dari present, excused, sick, atau absent.',
            'notes.max' => 'Catatan maksimal 255 karakter.',
        ];
    }
}
