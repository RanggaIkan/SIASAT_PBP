<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        $user = User::where('username', $credentials['username'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return ApiResponse::error(
                'INVALID_CREDENTIALS',
                'Username atau kata sandi salah.',
                401
            );
        }

        if (! $user->is_active) {
            return ApiResponse::error(
                'ACCOUNT_INACTIVE',
                'Akun Anda telah dinonaktifkan oleh Admin Akademik.',
                403
            );
        }

        $this->loadRoleProfile($user);
        $token = $user->createToken('siasat-api')->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'user' => $user,
        ], 'Login berhasil.');
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();

        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return ApiResponse::success(null, 'Logout berhasil.');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->loadRoleProfile($user);

        return ApiResponse::success([
            'user' => $user,
        ], 'Profil pengguna berhasil dimuat.');
    }

    private function loadRoleProfile(User $user): void
    {
        if ($user->role === 'student') {
            $user->loadMissing('student');
        } elseif ($user->role === 'lecturer') {
            $user->loadMissing('lecturer');
        }
    }
}
