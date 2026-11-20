<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Models\Semester;
use App\Models\StudyPlan;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    private const DAY_ORDER = [
        'Monday' => 1,
        'Tuesday' => 2,
        'Wednesday' => 3,
        'Thursday' => 4,
        'Friday' => 5,
        'Saturday' => 6,
    ];

    public function index(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            return ApiResponse::error('FORBIDDEN_ROLE', 'Profil mahasiswa tidak ditemukan.', 403);
        }

        $semesterId = $request->query('semester_id');
        $semester = $semesterId
            ? Semester::findOrFail((int) $semesterId)
            : Semester::where('is_active', true)->first();

        if (! $semester) {
            return ApiResponse::success([
                'semester' => null,
                'items' => [],
            ], 'Jadwal kuliah berhasil dimuat.');
        }

        $studyPlan = StudyPlan::with([
            'items.courseClass.course',
            'items.courseClass.lecturer.user:id,username,name',
        ])
            ->where('student_id', $student->id)
            ->where('semester_id', $semester->id)
            ->where('status', 'confirmed')
            ->first();

        $items = $studyPlan
            ? $studyPlan->items
                ->sortBy(function ($item) {
                    $dayRank = self::DAY_ORDER[$item->courseClass->day_of_week] ?? 99;

                    return sprintf('%02d-%s', $dayRank, $item->courseClass->start_time);
                })
                ->values()
            : collect();

        return ApiResponse::success([
            'semester' => $semester,
            'items' => $items,
        ], 'Jadwal kuliah berhasil dimuat.');
    }
}
