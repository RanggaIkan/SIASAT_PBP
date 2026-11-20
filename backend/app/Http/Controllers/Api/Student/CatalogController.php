<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\CourseClass;
use App\Models\Semester;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function semesters(): JsonResponse
    {
        $semesters = Semester::orderByDesc('is_active')
            ->orderByDesc('code')
            ->get();

        return ApiResponse::success($semesters, 'Daftar semester berhasil dimuat.');
    }

    public function classes(Request $request): JsonResponse
    {
        $semesterId = $request->query('semester_id');

        $semester = $semesterId
            ? Semester::findOrFail((int) $semesterId)
            : Semester::where('is_active', true)->first();

        if (! $semester) {
            return ApiResponse::success([], 'Tidak ada semester aktif saat ini.');
        }

        $classes = CourseClass::with([
            'course',
            'lecturer.user:id,username,name',
            'semester',
        ])
            ->where('semester_id', $semester->id)
            ->whereHas('course', fn ($q) => $q->where('is_active', true))
            ->orderBy('course_id')
            ->orderBy('class_code')
            ->get();

        return ApiResponse::success($classes, 'Katalog kelas berhasil dimuat.');
    }
}
