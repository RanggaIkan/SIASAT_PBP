<?php

namespace App\Support;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;

class ApiResponse
{
    public static function success(mixed $data = null, string $message = 'OK', int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    public static function error(string $errorCode, string $message, int $status = 400, mixed $errors = null): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error_code' => $errorCode,
            'message' => $message,
            'errors' => $errors,
        ], $status);
    }

    public static function throwError(string $errorCode, string $message, int $status = 400, mixed $errors = null): never
    {
        throw new HttpResponseException(self::error($errorCode, $message, $status, $errors));
    }
}
