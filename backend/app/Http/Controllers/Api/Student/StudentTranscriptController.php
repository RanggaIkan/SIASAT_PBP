<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Services\GradeTranscriptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentTranscriptController extends Controller
{
    public function __construct(
        private readonly GradeTranscriptService $gradeService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $semesterId = $request->query('semester_id');
        $transcript = $this->gradeService->getStudentTranscript(
            $request->user(),
            $semesterId !== null && $semesterId !== '' ? (int) $semesterId : null
        );

        return response()->json([
            'success' => true,
            'message' => 'Data Kartu Hasil Studi berhasil dimuat.',
            'data' => $transcript,
        ]);
    }
}
