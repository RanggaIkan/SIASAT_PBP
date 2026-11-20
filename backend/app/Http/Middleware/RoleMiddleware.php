<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return ApiResponse::error(
                'UNAUTHENTICATED',
                'Sesi Anda telah berakhir atau token tidak valid. Silakan login kembali.',
                401
            );
        }

        if (! in_array($user->role, $roles, true)) {
            return ApiResponse::error(
                'FORBIDDEN_ROLE',
                'Akses ditolak. Peran akun Anda tidak diizinkan untuk mengakses endpoint ini.',
                403
            );
        }

        return $next($request);
    }
}
