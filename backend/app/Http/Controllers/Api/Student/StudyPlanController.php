<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\ConfirmStudyPlanRequest;
use App\Http\Requests\Student\SaveDraftStudyPlanRequest;
use App\Models\Student;
use App\Services\StudyPlanService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class StudyPlanController extends Controller
{
    public function __construct(
        private readonly StudyPlanService $studyPlanService
    ) {}

    public function show(Request $request): JsonResponse
    {
        $student = $this->resolveStudent($request);
        $semesterId = $request->query('semester_id');

        $payload = $this->studyPlanService->getStudyPlanForSemester(
            $student,
            $semesterId ? (int) $semesterId : null
        );

        if ($payload['study_plan']) {
            Gate::authorize('view', $payload['study_plan']);
        }

        return ApiResponse::success($payload, 'Data Kartu Rencana Studi berhasil dimuat.');
    }

    public function saveDraft(SaveDraftStudyPlanRequest $request): JsonResponse
    {
        $student = $this->resolveStudent($request);
        $studyPlan = $this->studyPlanService->saveDraft(
            $student,
            $request->validated('course_class_ids')
        );

        return ApiResponse::success([
            'study_plan' => $studyPlan,
        ], 'Draft KRS berhasil disimpan.');
    }

    public function confirm(ConfirmStudyPlanRequest $request): JsonResponse
    {
        $student = $this->resolveStudent($request);
        $validated = $request->validated();
        $classIds = array_key_exists('course_class_ids', $validated)
            ? $validated['course_class_ids']
            : null;

        $studyPlan = $this->studyPlanService->confirm($student, $classIds);

        return ApiResponse::success([
            'study_plan' => $studyPlan,
        ], 'KRS berhasil dikonfirmasi secara final.');
    }

    private function resolveStudent(Request $request): Student
    {
        $student = $request->user()->student;

        if (! $student) {
            ApiResponse::throwError('FORBIDDEN_ROLE', 'Profil mahasiswa tidak ditemukan.', 403);
        }

        return $student;
    }
}
