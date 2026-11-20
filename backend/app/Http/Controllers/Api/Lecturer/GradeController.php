<?php

namespace App\Http\Controllers\Api\Lecturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Lecturer\UpsertClassGradesRequest;
use App\Services\GradeTranscriptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function __construct(
        private readonly GradeTranscriptService $gradeService
    ) {}

    public function index(Request $request, int $classId): JsonResponse
    {
        $grades = $this->gradeService->getClassGrades($request->user(), $classId);

        return response()->json([
            'success' => true,
            'message' => 'Daftar nilai kelas berhasil dimuat.',
            'data' => $grades,
        ]);
    }

    public function update(UpsertClassGradesRequest $request, int $classId): JsonResponse
    {
        $grades = $this->gradeService->saveClassGrades(
            $request->user(),
            $classId,
            $request->validated('grades')
        );

        return response()->json([
            'success' => true,
            'message' => 'Nilai peserta kelas berhasil disimpan.',
            'data' => $grades,
        ]);
    }

    public function publish(Request $request, int $classId): JsonResponse
    {
        $grades = $this->gradeService->publishClassGrades($request->user(), $classId);

        return response()->json([
            'success' => true,
            'message' => 'Nilai kelas berhasil dipublikasikan ke KHS mahasiswa.',
            'data' => $grades,
        ]);
    }
}
