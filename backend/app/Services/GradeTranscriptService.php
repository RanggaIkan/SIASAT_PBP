<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\CourseClass;
use App\Models\Grade;
use App\Models\Semester;
use App\Models\Student;
use App\Models\StudyPlan;
use App\Models\StudyPlanItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class GradeTranscriptService
{
    public const GRADE_POINTS = [
        'A' => 4.00,
        'AB' => 3.50,
        'B' => 3.00,
        'BC' => 2.50,
        'C' => 2.00,
        'D' => 1.00,
        'E' => 0.00,
    ];

    /**
     * Convert numeric score (0-100) to [grade_letter, grade_point] per BR-13.
     *
     * @return array{0: string, 1: float}
     */
    public function convertScoreToGrade(float $score): array
    {
        return match (true) {
            $score >= 85.0 => ['A', 4.00],
            $score >= 80.0 => ['AB', 3.50],
            $score >= 70.0 => ['B', 3.00],
            $score >= 65.0 => ['BC', 2.50],
            $score >= 55.0 => ['C', 2.00],
            $score >= 40.0 => ['D', 1.00],
            default => ['E', 0.00],
        };
    }

    /**
     * List all confirmed class participants and their draft/published grades.
     */
    public function getClassGrades(User $user, int $classId): array
    {
        $courseClass = $this->findClassAndAuthorizeLecturer($user, $classId);

        $items = StudyPlanItem::query()
            ->with(['studyPlan.student.user', 'grade'])
            ->where('course_class_id', $courseClass->id)
            ->whereHas('studyPlan', fn ($query) => $query->where('status', 'confirmed'))
            ->get()
            ->sortBy(fn (StudyPlanItem $item) => $item->studyPlan->student->student_number)
            ->values();

        $allPublished = $items->isNotEmpty() && $items->every(
            fn (StudyPlanItem $item) => $item->grade !== null && $item->grade->is_published
        );

        $participants = $items->map(function (StudyPlanItem $item) {
            $student = $item->studyPlan->student;
            $grade = $item->grade;

            return [
                'study_plan_item_id' => $item->id,
                'student_id' => $student->id,
                'student_number' => $student->student_number,
                'name' => $student->user->name,
                'study_program' => $student->study_program,
                'grade' => $grade !== null ? [
                    'id' => $grade->id,
                    'score' => $grade->score !== null ? round((float) $grade->score, 2) : null,
                    'grade_letter' => $grade->grade_letter,
                    'grade_point' => round((float) $grade->grade_point, 2),
                    'is_published' => (bool) $grade->is_published,
                    'published_at' => $this->toIsoUtc($grade->published_at),
                ] : null,
            ];
        })->all();

        return [
            'course_class' => $courseClass,
            'all_published' => $allPublished,
            'participants' => $participants,
        ];
    }

    /**
     * Save draft grades or revise published grades with mandatory audit reason.
     */
    public function saveClassGrades(User $user, int $classId, array $gradesPayload): array
    {
        $this->findClassAndAuthorizeLecturer($user, $classId);

        DB::transaction(function () use ($user, $classId, $gradesPayload) {
            CourseClass::query()->where('id', $classId)->lockForUpdate()->firstOrFail();

            $itemsByStudent = StudyPlanItem::query()
                ->with(['studyPlan', 'grade'])
                ->where('course_class_id', $classId)
                ->whereHas('studyPlan', fn ($query) => $query->where('status', 'confirmed'))
                ->get()
                ->keyBy(fn (StudyPlanItem $item) => (int) $item->studyPlan->student_id);

            foreach ($gradesPayload as $index => $entry) {
                $studentId = (int) $entry['student_id'];
                /** @var StudyPlanItem|null $item */
                $item = $itemsByStudent->get($studentId);

                if ($item === null) {
                    $this->abortError(
                        'VALIDATION_ERROR',
                        "Mahasiswa dengan ID {$studentId} bukan peserta terdaftar pada kelas ini.",
                        422,
                        ["grades.{$index}.student_id" => ['Mahasiswa bukan peserta terdaftar pada kelas ini.']]
                    );
                }

                [$score, $gradeLetter, $gradePoint] = $this->resolveGradeValues($entry, $index);

                $existing = Grade::query()
                    ->where('study_plan_item_id', $item->id)
                    ->lockForUpdate()
                    ->first();

                if ($existing !== null && $existing->is_published) {
                    $reason = isset($entry['revision_reason']) ? trim((string) $entry['revision_reason']) : '';
                    if (mb_strlen($reason) < 10) {
                        $this->abortError(
                            'REVISION_REASON_REQUIRED',
                            'Revisi nilai yang sudah terpublikasi wajib menyertakan alasan minimal 10 karakter.',
                            422,
                            [
                                'revision_reason' => ['Alasan revisi minimal 10 karakter.'],
                                "grades.{$index}.revision_reason" => ['Alasan revisi minimal 10 karakter.'],
                            ]
                        );
                    }

                    $oldValues = [
                        'score' => $existing->score !== null ? round((float) $existing->score, 2) : null,
                        'grade_letter' => $existing->grade_letter,
                        'grade_point' => round((float) $existing->grade_point, 2),
                    ];

                    $existing->update([
                        'score' => $score,
                        'grade_letter' => $gradeLetter,
                        'grade_point' => $gradePoint,
                        'is_published' => true,
                        'published_at' => $existing->published_at ?? now('UTC'),
                        'updated_by' => $user->id,
                    ]);

                    AuditLog::query()->create([
                        'user_id' => $user->id,
                        'action' => 'published_grade_revised',
                        'entity' => 'grades',
                        'entity_id' => $existing->id,
                        'details' => [
                            'course_class_id' => $classId,
                            'student_id' => $studentId,
                            'old' => $oldValues,
                            'new' => [
                                'score' => $score,
                                'grade_letter' => $gradeLetter,
                                'grade_point' => $gradePoint,
                            ],
                            'revision_reason' => $reason,
                        ],
                        'created_at' => now('UTC'),
                    ]);
                } else {
                    Grade::query()->updateOrCreate(
                        ['study_plan_item_id' => $item->id],
                        [
                            'score' => $score,
                            'grade_letter' => $gradeLetter,
                            'grade_point' => $gradePoint,
                            'is_published' => false,
                            'published_at' => null,
                            'updated_by' => $user->id,
                        ]
                    );
                }
            }
        });

        return $this->getClassGrades($user, $classId);
    }

    /**
     * Publish all grades for a class after verifying every confirmed participant has a grade row.
     */
    public function publishClassGrades(User $user, int $classId): array
    {
        $this->findClassAndAuthorizeLecturer($user, $classId);

        DB::transaction(function () use ($user, $classId) {
            CourseClass::query()->where('id', $classId)->lockForUpdate()->firstOrFail();

            $items = StudyPlanItem::query()
                ->with(['studyPlan.student.user', 'grade'])
                ->where('course_class_id', $classId)
                ->whereHas('studyPlan', fn ($query) => $query->where('status', 'confirmed'))
                ->get()
                ->sortBy(fn (StudyPlanItem $item) => $item->studyPlan->student->student_number)
                ->values();

            if ($items->isEmpty()) {
                $this->abortError(
                    'VALIDATION_ERROR',
                    'Tidak ada peserta terdaftar pada kelas ini untuk dipublikasikan.',
                    422
                );
            }

            $ungradedStudents = $items
                ->filter(fn (StudyPlanItem $item) => $item->grade === null)
                ->map(fn (StudyPlanItem $item) => [
                    'student_id' => $item->studyPlan->student->id,
                    'student_number' => $item->studyPlan->student->student_number,
                    'name' => $item->studyPlan->student->user->name,
                ])
                ->values()
                ->all();

            if (!empty($ungradedStudents)) {
                $count = count($ungradedStudents);
                $this->abortError(
                    'INCOMPLETE_CLASS_GRADES',
                    "Publikasi nilai gagal. Masih terdapat {$count} peserta kelas yang belum memiliki nilai.",
                    422,
                    ['ungraded_students' => $ungradedStudents]
                );
            }

            $now = now('UTC');
            $itemIds = $items->pluck('id')->all();

            $publishedCount = Grade::query()
                ->whereIn('study_plan_item_id', $itemIds)
                ->where('is_published', false)
                ->update([
                    'is_published' => true,
                    'published_at' => $now,
                    'updated_by' => $user->id,
                    'updated_at' => $now,
                ]);

            AuditLog::query()->create([
                'user_id' => $user->id,
                'action' => 'grades_published',
                'entity' => 'course_classes',
                'entity_id' => $classId,
                'details' => [
                    'course_class_id' => $classId,
                    'newly_published_count' => $publishedCount,
                    'total_participants' => $items->count(),
                ],
                'created_at' => $now,
            ]);
        });

        return $this->getClassGrades($user, $classId);
    }

    /**
     * Compile semester transcript (KHS) for the authenticated student.
     */
    public function getStudentTranscript(User $user, ?int $semesterId = null): array
    {
        $student = $user->student;
        if ($student === null) {
            $this->abortError('FORBIDDEN_CLASS_ACCESS', 'Akses ditolak. Profil mahasiswa tidak ditemukan.', 403);
        }

        $student->loadMissing('user');
        $semester = $this->resolveSemester($semesterId);

        return $this->compileTranscriptForStudent($student, $semester);
    }

    /**
     * Compile semester transcript (KHS) for a given student and semester, censoring unpublished grades (NFR-06).
     */
    public function compileTranscriptForStudent(Student $student, Semester $semester): array
    {
        $student->loadMissing('user');

        $studyPlan = StudyPlan::query()
            ->with(['items.courseClass.course', 'items.grade'])
            ->where('student_id', $student->id)
            ->where('semester_id', $semester->id)
            ->where('status', 'confirmed')
            ->first();

        $totalEnrolledCredits = 0;
        $totalPublishedCredits = 0;
        $sumQualityPoints = 0.0;
        $formattedItems = [];

        if ($studyPlan !== null) {
            $sortedItems = $studyPlan->items
                ->sortBy(fn (StudyPlanItem $item) => $item->courseClass->course->course_code)
                ->values();

            foreach ($sortedItems as $item) {
                $course = $item->courseClass->course;
                $credits = (int) $course->credits;
                $totalEnrolledCredits += $credits;

                $grade = $item->grade;
                $isPublished = $grade !== null && (bool) $grade->is_published;

                if ($isPublished) {
                    $gradePoint = round((float) $grade->grade_point, 2);
                    $qualityPoints = round($credits * $gradePoint, 2);
                    $totalPublishedCredits += $credits;
                    $sumQualityPoints += $qualityPoints;

                    $formattedItems[] = [
                        'study_plan_item_id' => $item->id,
                        'course_code' => $course->course_code,
                        'course_name' => $course->course_name,
                        'class_code' => $item->courseClass->class_code,
                        'credits' => $credits,
                        'is_published' => true,
                        'score' => $grade->score !== null ? round((float) $grade->score, 2) : null,
                        'grade_letter' => $grade->grade_letter,
                        'grade_point' => $gradePoint,
                        'quality_points' => $qualityPoints,
                        'published_at' => $this->toIsoUtc($grade->published_at),
                    ];
                } else {
                    // NFR-06: strictly censor draft grades at server serializer level.
                    $formattedItems[] = [
                        'study_plan_item_id' => $item->id,
                        'course_code' => $course->course_code,
                        'course_name' => $course->course_name,
                        'class_code' => $item->courseClass->class_code,
                        'credits' => $credits,
                        'is_published' => false,
                        'score' => null,
                        'grade_letter' => null,
                        'grade_point' => null,
                        'quality_points' => null,
                        'published_at' => null,
                    ];
                }
            }
        }

        $gpa = $totalPublishedCredits > 0
            ? round($sumQualityPoints / $totalPublishedCredits, 2)
            : 0.00;

        return [
            'semester' => [
                'id' => $semester->id,
                'code' => $semester->code,
                'name' => $semester->name,
            ],
            'student' => [
                'id' => $student->id,
                'student_number' => $student->student_number,
                'name' => $student->user->name,
                'study_program' => $student->study_program,
                'cohort_year' => $student->cohort_year,
            ],
            'items' => $formattedItems,
            'summary' => [
                'total_enrolled_credits' => $totalEnrolledCredits,
                'total_published_credits' => $totalPublishedCredits,
                'gpa' => $gpa,
            ],
        ];
    }

    /**
     * Resolve score (authoritative per BR-13) or grade_letter into [score, grade_letter, grade_point].
     *
     * @return array{0: float|null, 1: string, 2: float}
     */
    private function resolveGradeValues(array $entry, int $index): array
    {
        $hasScore = array_key_exists('score', $entry) && $entry['score'] !== null && $entry['score'] !== '';
        $hasLetter = array_key_exists('grade_letter', $entry) && $entry['grade_letter'] !== null && $entry['grade_letter'] !== '';

        if ($hasScore) {
            if (!is_numeric($entry['score']) || (float) $entry['score'] < 0 || (float) $entry['score'] > 100) {
                $this->abortError(
                    'VALIDATION_ERROR',
                    'Nilai angka harus berada pada rentang 0 hingga 100.',
                    422,
                    ["grades.{$index}.score" => ['Nilai angka harus antara 0 dan 100.']]
                );
            }

            $score = round((float) $entry['score'], 2);
            [$letter, $point] = $this->convertScoreToGrade($score);

            return [$score, $letter, $point];
        }

        if ($hasLetter) {
            $letter = strtoupper(trim((string) $entry['grade_letter']));
            if (!array_key_exists($letter, self::GRADE_POINTS)) {
                $this->abortError(
                    'VALIDATION_ERROR',
                    'Nilai huruf tidak valid.',
                    422,
                    ["grades.{$index}.grade_letter" => ['Nilai huruf harus salah satu dari A, AB, B, BC, C, D, E.']]
                );
            }

            return [null, $letter, self::GRADE_POINTS[$letter]];
        }

        $this->abortError(
            'VALIDATION_ERROR',
            'Setiap entri nilai wajib mengisi nilai angka (score) atau huruf (grade_letter).',
            422,
            ["grades.{$index}" => ['Nilai angka atau nilai huruf wajib diisi.']]
        );
    }

    private function findClassAndAuthorizeLecturer(User $user, int $classId): CourseClass
    {
        $courseClass = CourseClass::query()
            ->with(['course', 'semester', 'lecturer.user'])
            ->find($classId);

        if ($courseClass === null) {
            $this->abortError('RESOURCE_NOT_FOUND', 'Data kelas yang diminta tidak ditemukan.', 404);
        }

        $auth = Gate::forUser($user)->inspect('manage', $courseClass);
        if ($auth->denied()) {
            $this->abortError('FORBIDDEN_CLASS_ACCESS', $auth->message(), 403);
        }

        return $courseClass;
    }

    private function resolveSemester(?int $semesterId): Semester
    {
        if ($semesterId !== null) {
            $semester = Semester::query()->find($semesterId);
            if ($semester === null) {
                $this->abortError('RESOURCE_NOT_FOUND', 'Data semester yang diminta tidak ditemukan.', 404);
            }

            return $semester;
        }

        $semester = Semester::query()->where('is_active', true)->first()
            ?? Semester::query()->orderByDesc('id')->first();

        if ($semester === null) {
            $this->abortError('RESOURCE_NOT_FOUND', 'Belum ada data semester yang tersedia.', 404);
        }

        return $semester;
    }

    private function toIsoUtc(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if ($value instanceof Carbon) {
            return $value->copy()->utc()->toIso8601ZuluString();
        }

        return Carbon::parse((string) $value, 'UTC')->utc()->toIso8601ZuluString();
    }

    private function abortError(string $errorCode, string $message, int $status, mixed $errors = null): never
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'error_code' => $errorCode,
            'message' => $message,
            'errors' => $errors,
        ], $status));
    }
}
