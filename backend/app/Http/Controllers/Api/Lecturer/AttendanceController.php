<?php

namespace App\Http\Controllers\Api\Lecturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lecturer\UpdateSessionAttendanceStatusRequest;
use App\Http\Requests\Lecturer\UpdateStudentAttendanceRequest;
use App\Services\ClassSessionAttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly ClassSessionAttendanceService $attendanceService
    ) {}

    public function updateStatus(UpdateSessionAttendanceStatusRequest $request, int $sessionId): JsonResponse
    {
        $session = $this->attendanceService->updateAttendanceStatus(
            $request->user(),
            $sessionId,
            $request->validated()
        );

        return response()->json([
            'success' => true,
            'message' => 'Status presensi pertemuan berhasil diperbarui.',
            'data' => $session,
        ]);
    }

    public function index(Request $request, int $sessionId): JsonResponse
    {
        $recap = $this->attendanceService->getSessionAttendances($request->user(), $sessionId);

        return response()->json([
            'success' => true,
            'message' => 'Rekap presensi pertemuan berhasil dimuat.',
            'data' => $recap,
        ]);
    }

    public function updateStudent(
        UpdateStudentAttendanceRequest $request,
        int $sessionId,
        int $studentId
    ): JsonResponse {
        $attendance = $this->attendanceService->updateStudentAttendance(
            $request->user(),
            $sessionId,
            $studentId,
            $request->validated()
        );

        return response()->json([
            'success' => true,
            'message' => 'Status kehadiran mahasiswa berhasil diperbarui.',
            'data' => $attendance,
        ]);
    }
}
