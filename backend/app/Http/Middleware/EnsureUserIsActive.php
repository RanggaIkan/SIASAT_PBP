<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return ApiResponse::error(
                'UNAUTHENTICATED',
                'Sesi Anda telah berakhir atau token tidak valid. Silakan login kembali.',
                401
            );
        }

        if (! $user->is_active) {
            $user->tokens()->delete();

            return ApiResponse::error(
                'ACCOUNT_INACTIVE',
                'Akun Anda telah dinonaktifkan oleh Admin Akademik.',
                403
            );
        }

        return $next($request);
    }
}
