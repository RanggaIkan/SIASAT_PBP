<?php

namespace App\Http\Controllers\Api\Lecturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lecturer\StoreClassSessionRequest;
use App\Http\Requests\Lecturer\UpdateClassSessionRequest;
use App\Services\ClassSessionAttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassSessionController extends Controller
{
    public function __construct(
        private readonly ClassSessionAttendanceService $attendanceService
    ) {}

    public function index(Request $request, int $classId): JsonResponse
    {
        $result = $this->attendanceService->getClassSessions($request->user(), $classId);

        return response()->json([
            'success' => true,
            'message' => 'Daftar sesi pertemuan kelas berhasil dimuat.',
            'data' => $result,
        ]);
    }

    public function store(StoreClassSessionRequest $request, int $classId): JsonResponse
    {
        $session = $this->attendanceService->createSession(
            $request->user(),
            $classId,
            $request->validated()
        );

        return response()->json([
            'success' => true,
            'message' => 'Sesi pertemuan berhasil dibuat.',
            'data' => $session,
        ], 201);
    }

    public function update(UpdateClassSessionRequest $request, int $sessionId): JsonResponse
    {
        $session = $this->attendanceService->updateSession(
            $request->user(),
            $sessionId,
            $request->validated()
        );

        return response()->json([
            'success' => true,
            'message' => 'Sesi pertemuan berhasil diperbarui.',
            'data' => $session,
        ]);
    }

    public function destroy(Request $request, int $sessionId): JsonResponse
    {
        $this->attendanceService->deleteSession($request->user(), $sessionId);

        return response()->json([
            'success' => true,
            'message' => 'Sesi pertemuan berhasil dihapus.',
            'data' => null,
        ]);
    }
}
