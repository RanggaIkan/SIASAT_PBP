<?php

namespace App\Http\Requests\Lecturer;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

abstract class BaseLecturerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->role === 'lecturer';
    }

    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'error_code' => 'FORBIDDEN_CLASS_ACCESS',
            'message' => 'Akses ditolak. Hanya dosen yang diizinkan mengakses endpoint ini.',
            'errors' => null,
        ], 403));
    }

    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'error_code' => 'VALIDATION_ERROR',
            'message' => $validator->errors()->first() ?: 'Validasi input gagal.',
            'errors' => $validator->errors()->toArray(),
        ], 422));
    }
}
