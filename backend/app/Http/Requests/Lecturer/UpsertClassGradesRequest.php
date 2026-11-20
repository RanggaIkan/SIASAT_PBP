<?php

namespace App\Http\Requests\Lecturer;

class UpsertClassGradesRequest extends BaseLecturerRequest
{
    public function rules(): array
    {
        return [
            'grades' => ['required', 'array', 'min:1'],
            'grades.*.student_id' => ['required', 'integer'],
            'grades.*.score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'grades.*.grade_letter' => ['nullable', 'string', 'in:A,AB,B,BC,C,D,E,a,ab,b,bc,c,d,e'],
            'grades.*.revision_reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'grades.required' => 'Daftar nilai mahasiswa wajib diisi.',
            'grades.array' => 'Format daftar nilai tidak valid.',
            'grades.min' => 'Minimal harus terdapat satu data nilai.',
            'grades.*.student_id.required' => 'ID mahasiswa wajib diisi.',
            'grades.*.student_id.integer' => 'ID mahasiswa harus berupa angka.',
            'grades.*.score.numeric' => 'Nilai angka harus berupa numerik.',
            'grades.*.score.min' => 'Nilai angka minimal 0.',
            'grades.*.score.max' => 'Nilai angka maksimal 100.',
            'grades.*.grade_letter.in' => 'Nilai huruf harus salah satu dari A, AB, B, BC, C, D, atau E.',
        ];
    }
}
