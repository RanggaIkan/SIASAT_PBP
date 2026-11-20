<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\ClassSession;
use App\Models\CourseClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\StudyPlan;
use App\Models\StudyPlanItem;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MonitoringController extends Controller
{
    private const ATTENDANCE_LABELS = [
        'present' => 'Hadir',
        'excused' => 'Izin',
        'sick' => 'Sakit',
        'absent' => 'Alpa',
    ];

    public function participants(int $classId): JsonResponse
    {
        $courseClass = CourseClass::with(['course', 'semester', 'lecturer.user:id,username,name'])
            ->findOrFail($classId);

        $participants = StudyPlanItem::query()
            ->join('study_plans', 'study_plan_items.study_plan_id', '=', 'study_plans.id')
            ->join('students', 'study_plans.student_id', '=', 'students.id')
            ->join('users', 'students.user_id', '=', 'users.id')
            ->where('study_plan_items.course_class_id', $courseClass->id)
            ->where('study_plans.status', 'confirmed')
            ->orderBy('students.student_number')
            ->get([
                'students.id as student_id',
                'students.student_number',
                'users.name',
                'students.study_program',
                'study_plans.status as study_plan_status',
                'study_plans.confirmed_at',
            ]);

        return ApiResponse::success([
            'course_class' => $courseClass,
            'participants' => $participants,
        ], 'Daftar peserta kelas berhasil dimuat.');
    }

    public function sessions(int $classId): JsonResponse
    {
        $courseClass = CourseClass::with(['course', 'semester', 'lecturer.user:id,username,name'])
            ->findOrFail($classId);

        $sessions = ClassSession::where('course_class_id', $courseClass->id)
            ->orderBy('session_number')
            ->get();

        return ApiResponse::success([
            'course_class' => $courseClass,
            'sessions' => $sessions,
        ], 'Daftar pertemuan kelas berhasil dimuat.');
    }

    public function sessionAttendances(int $sessionId): JsonResponse
    {
        $session = ClassSession::with(['courseClass.course', 'courseClass.semester'])
            ->findOrFail($sessionId);

        $confirmedStudents = StudyPlanItem::query()
            ->join('study_plans', 'study_plan_items.study_plan_id', '=', 'study_plans.id')
            ->join('students', 'study_plans.student_id', '=', 'students.id')
            ->join('users', 'students.user_id', '=', 'users.id')
            ->where('study_plan_items.course_class_id', $session->course_class_id)
            ->where('study_plans.status', 'confirmed')
            ->orderBy('students.student_number')
            ->get([
                'students.id as student_id',
                'students.student_number',
                'users.name',
                'students.study_program',
            ]);

        $attendancesByStudent = Attendance::where('class_session_id', $session->id)
            ->get()
            ->keyBy('student_id');

        $summary = [
            'present' => 0,
            'excused' => 0,
            'sick' => 0,
            'absent' => 0,
            'unrecorded' => 0,
            'total' => $confirmedStudents->count(),
        ];

        $participants = $confirmedStudents->map(function ($student) use ($attendancesByStudent, &$summary) {
            $attendance = $attendancesByStudent->get($student->student_id);
            $status = $attendance?->status;

            if ($status && isset($summary[$status])) {
                $summary[$status]++;
            } else {
                $summary['unrecorded']++;
            }

            return [
                'student_id' => $student->student_id,
                'student_number' => $student->student_number,
                'name' => $student->name,
                'study_program' => $student->study_program,
                'status' => $status,
                'display_status' => $status ? (self::ATTENDANCE_LABELS[$status] ?? $status) : 'Belum mengisi',
                'recorded_at' => $attendance?->recorded_at?->toIso8601ZuluString(),
                'notes' => $attendance?->notes,
            ];
        })->values();

        return ApiResponse::success([
            'session' => $session,
            'summary' => $summary,
            'participants' => $participants,
        ], 'Rekapitulasi presensi pertemuan berhasil dimuat.');
    }

    public function studentTranscript(Request $request, int $studentId): JsonResponse
    {
        $student = Student::with('user:id,username,name,is_active')->findOrFail($studentId);
        $semesterId = $request->query('semester_id');

        $semester = $semesterId
            ? Semester::findOrFail((int) $semesterId)
            : Semester::where('is_active', true)->first();

        $studentInfo = [
            'id' => $student->id,
            'student_number' => $student->student_number,
            'name' => $student->user->name,
            'study_program' => $student->study_program,
        ];

        if (! $semester) {
            return ApiResponse::success([
                'semester' => null,
                'student' => $studentInfo,
                'items' => [],
                'summary' => [
                    'total_enrolled_credits' => 0,
                    'total_published_credits' => 0,
                    'gpa' => 0.00,
                ],
            ], 'Data Kartu Hasil Studi berhasil dimuat.');
        }

        $studyPlan = StudyPlan::with([
            'items.courseClass.course',
            'items.grade',
        ])
            ->where('student_id', $student->id)
            ->where('semester_id', $semester->id)
            ->where('status', 'confirmed')
            ->first();

        $totalEnrolledCredits = 0;
        $totalPublishedCredits = 0;
        $totalQualityPoints = 0.0;
        $items = [];

        if ($studyPlan) {
            $sortedItems = $studyPlan->items->sortBy(fn ($item) => $item->courseClass->course->course_code)->values();

            foreach ($sortedItems as $item) {
                $course = $item->courseClass->course;
                $credits = (int) $course->credits;
                $grade = $item->grade;
                $isPublished = (bool) ($grade?->is_published ?? false);

                $totalEnrolledCredits += $credits;

                $score = null;
                $gradeLetter = null;
                $gradePoint = null;
                $qualityPoints = null;
                $publishedAt = null;

                if ($isPublished && $grade) {
                    $score = $grade->score !== null ? (float) $grade->score : null;
                    $gradeLetter = $grade->grade_letter;
                    $gradePoint = (float) $grade->grade_point;
                    $qualityPoints = round($credits * $gradePoint, 2);
                    $publishedAt = $grade->published_at?->toIso8601ZuluString();

                    $totalPublishedCredits += $credits;
                    $totalQualityPoints += $qualityPoints;
                }

                $items[] = [
                    'study_plan_item_id' => $item->id,
                    'course_code' => $course->course_code,
                    'course_name' => $course->course_name,
                    'class_code' => $item->courseClass->class_code,
                    'credits' => $credits,
                    'is_published' => $isPublished,
                    'score' => $score,
                    'grade_letter' => $gradeLetter,
                    'grade_point' => $gradePoint,
                    'quality_points' => $qualityPoints,
                    'published_at' => $publishedAt,
                ];
            }
        }

        $gpa = $totalPublishedCredits > 0
            ? round($totalQualityPoints / $totalPublishedCredits, 2)
            : 0.00;

        return ApiResponse::success([
            'semester' => [
                'id' => $semester->id,
                'code' => $semester->code,
                'name' => $semester->name,
            ],
            'student' => $studentInfo,
            'items' => $items,
            'summary' => [
                'total_enrolled_credits' => $totalEnrolledCredits,
                'total_published_credits' => $totalPublishedCredits,
                'gpa' => $gpa,
            ],
        ], 'Data Kartu Hasil Studi berhasil dimuat.');
    }
}
