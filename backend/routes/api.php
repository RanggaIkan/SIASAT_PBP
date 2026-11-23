<?php

use App\Http\Controllers\Api\Admin\AuditLogController;
use App\Http\Controllers\Api\Admin\CourseClassController;
use App\Http\Controllers\Api\Admin\CourseController;
use App\Http\Controllers\Api\Admin\LecturerController;
use App\Http\Controllers\Api\Admin\MonitoringController;
use App\Http\Controllers\Api\Admin\SemesterController;
use App\Http\Controllers\Api\Admin\StudentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Lecturer\AttendanceController;
use App\Http\Controllers\Api\Lecturer\ClassSessionController;
use App\Http\Controllers\Api\Lecturer\GradeController;
use App\Http\Controllers\Api\Lecturer\LecturerClassController;
use App\Http\Controllers\Api\Student\CatalogController;
use App\Http\Controllers\Api\Student\ScheduleController;
use App\Http\Controllers\Api\Student\StudentSessionAttendanceController;
use App\Http\Controllers\Api\Student\StudentProfilePhotoController;
use App\Http\Controllers\Api\Student\StudentTranscriptController;
use App\Http\Controllers\Api\Student\StudyPlanController;
use App\Support\ApiResponse;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

RateLimiter::for('login', function (Request $request) {
    $username = strtolower(trim((string) $request->input('username', '')));

    return Limit::perMinute(5)
        ->by($username.'|'.$request->ip())
        ->response(function (Request $request, array $headers) {
            return ApiResponse::error(
                'TOO_MANY_REQUESTS',
                'Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit.',
                429
            )->withHeaders($headers);
        });
});

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/students', [StudentController::class, 'index']);
        Route::post('/students', [StudentController::class, 'store']);
        Route::put('/students/{studentId}', [StudentController::class, 'update']);

        Route::get('/lecturers', [LecturerController::class, 'index']);
        Route::post('/lecturers', [LecturerController::class, 'store']);
        Route::put('/lecturers/{lecturerId}', [LecturerController::class, 'update']);

        Route::get('/courses', [CourseController::class, 'index']);
        Route::post('/courses', [CourseController::class, 'store']);
        Route::put('/courses/{courseId}', [CourseController::class, 'update']);

        Route::get('/semesters', [SemesterController::class, 'index']);
        Route::post('/semesters', [SemesterController::class, 'store']);
        Route::put('/semesters/{semesterId}', [SemesterController::class, 'update']);

        Route::get('/classes', [CourseClassController::class, 'index']);
        Route::post('/classes', [CourseClassController::class, 'store']);
        Route::put('/classes/{classId}', [CourseClassController::class, 'update']);

        Route::get('/classes/{classId}/participants', [MonitoringController::class, 'participants']);
        Route::get('/classes/{classId}/sessions', [MonitoringController::class, 'sessions']);
        Route::get('/sessions/{sessionId}/attendances', [MonitoringController::class, 'sessionAttendances']);
        Route::get('/students/{studentId}/transcript', [MonitoringController::class, 'studentTranscript']);

        Route::get('/audit-logs', [AuditLogController::class, 'index']);
    });

    Route::prefix('student')->middleware('role:student')->group(function () {
        Route::post('/profile/photo', [StudentProfilePhotoController::class, 'store']);
        Route::get('/semesters', [CatalogController::class, 'semesters']);
        Route::get('/classes', [CatalogController::class, 'classes']);

        Route::get('/study-plan', [StudyPlanController::class, 'show']);
        Route::put('/study-plan/draft', [StudyPlanController::class, 'saveDraft']);
        Route::post('/study-plan/confirm', [StudyPlanController::class, 'confirm']);

        Route::get('/schedule', [ScheduleController::class, 'index']);

        Route::get('/classes/{classId}/sessions', [StudentSessionAttendanceController::class, 'sessions']);
        Route::post('/sessions/{sessionId}/attendances', [StudentSessionAttendanceController::class, 'store']);
        Route::get('/transcript', [StudentTranscriptController::class, 'index']);
    });

    Route::prefix('lecturer')->middleware('role:lecturer')->group(function () {
        Route::get('/classes', [LecturerClassController::class, 'index']);
        Route::get('/classes/{classId}/participants', [LecturerClassController::class, 'participants']);

        Route::get('/classes/{classId}/sessions', [ClassSessionController::class, 'index']);
        Route::post('/classes/{classId}/sessions', [ClassSessionController::class, 'store']);
        Route::put('/sessions/{sessionId}', [ClassSessionController::class, 'update']);
        Route::delete('/sessions/{sessionId}', [ClassSessionController::class, 'destroy']);

        Route::patch('/sessions/{sessionId}/attendance-status', [AttendanceController::class, 'updateStatus']);
        Route::get('/sessions/{sessionId}/attendances', [AttendanceController::class, 'index']);
        Route::put('/sessions/{sessionId}/attendances/{studentId}', [AttendanceController::class, 'updateStudent']);

        Route::get('/classes/{classId}/grades', [GradeController::class, 'index']);
        Route::put('/classes/{classId}/grades', [GradeController::class, 'update']);
        Route::post('/classes/{classId}/grades/publish', [GradeController::class, 'publish']);
    });
});
