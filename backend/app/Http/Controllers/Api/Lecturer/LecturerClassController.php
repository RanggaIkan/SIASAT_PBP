<?php

namespace App\Http\Controllers\Api\Lecturer;

use App\Http\Controllers\Controller;
use App\Services\ClassSessionAttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LecturerClassController extends Controller
{
    public function __construct(
        private readonly ClassSessionAttendanceService $attendanceService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $semesterId = $request->query('semester_id');
        $classes = $this->attendanceService->getLecturerClasses(
            $request->user(),
            $semesterId !== null ? (int) $semesterId : null
        );

        return response()->json([
            'success' => true,
            'message' => 'Daftar kelas yang diampu berhasil dimuat.',
            'data' => $classes,
        ]);
    }

    public function participants(Request $request, int $classId): JsonResponse
    {
        $result = $this->attendanceService->getClassParticipants($request->user(), $classId);

        return response()->json([
            'success' => true,
            'message' => 'Daftar peserta kelas berhasil dimuat.',
            'data' => $result,
        ]);
    }
}
