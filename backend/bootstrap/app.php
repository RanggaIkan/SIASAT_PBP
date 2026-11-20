<?php

use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\RoleMiddleware;
use App\Support\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectGuestsTo(fn (Request $request) => $request->is('api/*') ? null : '/');

        $middleware->alias([
            'active' => EnsureUserIsActive::class,
            'role' => RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    'UNAUTHENTICATED',
                    'Sesi Anda telah berakhir atau token tidak valid. Silakan login kembali.',
                    401
                );
            }
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $errorCode = is_string($e->code()) && $e->code() !== '' ? $e->code() : 'FORBIDDEN';

                return ApiResponse::error(
                    $errorCode,
                    $e->getMessage() ?: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
                    403
                );
            }
        });

        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $previous = $e->getPrevious();
                $errorCode = ($previous instanceof AuthorizationException && is_string($previous->code()) && $previous->code() !== '')
                    ? $previous->code()
                    : 'FORBIDDEN';

                return ApiResponse::error(
                    $errorCode,
                    $e->getMessage() ?: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
                    403
                );
            }
        });

        $exceptions->render(function (ModelNotFoundException|NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    'RESOURCE_NOT_FOUND',
                    'Data yang diminta tidak ditemukan.',
                    404
                );
            }
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    'VALIDATION_ERROR',
                    $e->getMessage() ?: 'Data yang dikirimkan tidak valid.',
                    422,
                    $e->errors()
                );
            }
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    'TOO_MANY_REQUESTS',
                    'Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi.',
                    429
                )->withHeaders($e->getHeaders());
            }
        });

        $exceptions->render(function (ConflictHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    'CONFLICT',
                    $e->getMessage() ?: 'Terjadi konflik dengan aturan bisnis atau status data.',
                    409
                );
            }
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error(
                    'HTTP_ERROR',
                    $e->getMessage() ?: 'Permintaan gagal diproses.',
                    $e->getStatusCode()
                );
            }
        });
    })->create();
