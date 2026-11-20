<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Services\ClassSessionAttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentSessionAttendanceController extends Controller
{
    public function __construct(
        private readonly ClassSessionAttendanceService $attendanceService
    ) {}

    public function sessions(Request $request, int $classId): JsonResponse
    {
        $result = $this->attendanceService->getStudentClassSessions($request->user(), $classId);

        return response()->json([
            'success' => true,
            'message' => 'Daftar pertemuan dan riwayat kehadiran berhasil dimuat.',
            'data' => $result,
        ]);
    }

    public function store(Request $request, int $sessionId): JsonResponse
    {
        $result = $this->attendanceService->submitStudentAttendance($request->user(), $sessionId);

        return response()->json([
            'success' => true,
            'message' => $result['created']
                ? 'Presensi berhasil dicatat.'
                : 'Presensi Anda sudah tercatat sebelumnya.',
            'data' => $result['data'],
        ], $result['created'] ? 201 : 200);
    }
}
