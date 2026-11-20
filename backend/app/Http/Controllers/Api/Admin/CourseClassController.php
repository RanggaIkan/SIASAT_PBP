<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCourseClassRequest;
use App\Http\Requests\Admin\UpdateCourseClassRequest;
use App\Models\CourseClass;
use App\Services\MasterAcademicService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseClassController extends Controller
{
    public function __construct(
        private readonly MasterAcademicService $masterService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $semesterId = $request->query('semester_id');

        $classes = CourseClass::with([
            'semester',
            'course',
            'lecturer.user:id,username,name,is_active',
        ])
            ->when($semesterId, fn ($q) => $q->where('semester_id', (int) $semesterId))
            ->orderBy('semester_id', 'desc')
            ->orderBy('course_id')
            ->orderBy('class_code')
            ->get();

        return ApiResponse::success($classes, 'Daftar kelas paralel berhasil dimuat.');
    }

    public function store(StoreCourseClassRequest $request): JsonResponse
    {
        $courseClass = $this->masterService->createCourseClass($request->validated());

        return ApiResponse::success($courseClass, 'Kelas paralel berhasil ditambahkan.', 201);
    }

    public function update(UpdateCourseClassRequest $request, int $classId): JsonResponse
    {
        $courseClass = CourseClass::findOrFail($classId);
        $updated = $this->masterService->updateCourseClass($courseClass, $request->validated());

        return ApiResponse::success($updated, 'Kelas paralel berhasil diperbarui.');
    }
}
