<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCourseRequest;
use App\Http\Requests\Admin\UpdateCourseRequest;
use App\Models\Course;
use App\Services\MasterAcademicService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function __construct(
        private readonly MasterAcademicService $masterService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $courses = Course::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('course_code', 'like', "%{$search}%")
                        ->orWhere('course_name', 'like', "%{$search}%");
                });
            })
            ->orderBy('course_code')
            ->get();

        return ApiResponse::success($courses, 'Daftar mata kuliah berhasil dimuat.');
    }

    public function store(StoreCourseRequest $request): JsonResponse
    {
        $course = $this->masterService->createCourse($request->validated());

        return ApiResponse::success($course, 'Mata kuliah berhasil ditambahkan.', 201);
    }

    public function update(UpdateCourseRequest $request, int $courseId): JsonResponse
    {
        $course = Course::findOrFail($courseId);
        $updated = $this->masterService->updateCourse($course, $request->validated());

        return ApiResponse::success($updated, 'Mata kuliah berhasil diperbarui.');
    }
}
