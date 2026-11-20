<?php

namespace App\Http\Requests\Lecturer;

class UpdateSessionAttendanceStatusRequest extends BaseLecturerRequest
{
    public function rules(): array
    {
        return [
            'attendance_status' => ['required', 'string', 'in:not_opened,open,closed'],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'attendance_status.required' => 'Status presensi tujuan wajib diisi.',
            'attendance_status.in' => 'Status presensi tidak valid (harus not_opened, open, atau closed).',
        ];
    }
}
