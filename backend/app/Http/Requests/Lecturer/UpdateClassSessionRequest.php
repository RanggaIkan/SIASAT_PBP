<?php

namespace App\Http\Requests\Lecturer;

class UpdateClassSessionRequest extends BaseLecturerRequest
{
    public function rules(): array
    {
        return [
            'session_date' => ['required', 'date'],
            'topic' => ['required', 'string', 'min:3', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'session_date.required' => 'Tanggal pertemuan wajib diisi.',
            'session_date.date' => 'Format tanggal pertemuan tidak valid.',
            'topic.required' => 'Topik pertemuan wajib diisi.',
            'topic.min' => 'Topik pertemuan minimal 3 karakter.',
            'topic.max' => 'Topik pertemuan maksimal 255 karakter.',
        ];
    }
}
