<?php

namespace App\Services;

use App\Models\CourseClass;
use App\Models\Semester;
use App\Models\Student;
use App\Models\StudyPlan;
use App\Models\StudyPlanItem;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class StudyPlanService
{
    public function getStudyPlanForSemester(Student $student, ?int $semesterId = null): array
    {
        $semester = $semesterId
            ? Semester::findOrFail($semesterId)
            : Semester::where('is_active', true)->first();

        if (! $semester) {
            return [
                'semester' => null,
                'max_credits' => $student->max_credits,
                'study_plan' => null,
            ];
        }

        $studyPlan = StudyPlan::with([
            'items.courseClass.course',
            'items.courseClass.lecturer.user:id,username,name',
        ])
            ->where('student_id', $student->id)
            ->where('semester_id', $semester->id)
            ->first();

        return [
            'semester' => $semester,
            'max_credits' => $student->max_credits,
            'study_plan' => $studyPlan,
        ];
    }

    public function saveDraft(Student $student, array $classIds): StudyPlan
    {
        $activeSemester = $this->requireActiveSemesterInKrsWindow();
        $normalizedIds = array_values(array_unique(array_map('intval', $classIds)));

        return DB::transaction(function () use ($student, $activeSemester, $normalizedIds) {
            $studyPlan = StudyPlan::where('student_id', $student->id)
                ->where('semester_id', $activeSemester->id)
                ->lockForUpdate()
                ->first();

            if ($studyPlan && $studyPlan->status === 'confirmed') {
                ApiResponse::throwError(
                    'STUDY_PLAN_ALREADY_CONFIRMED',
                    'KRS Anda sudah dikonfirmasi (final) dan tidak dapat diubah lagi.',
                    409
                );
            }

            $classes = $this->loadAndValidateClasses($normalizedIds, $activeSemester->id, false);
            $this->validateBusinessRules($student, $classes);

            $totalCredits = $classes->sum(fn (CourseClass $c) => (int) $c->course->credits);

            if (! $studyPlan) {
                $studyPlan = StudyPlan::create([
                    'student_id' => $student->id,
                    'semester_id' => $activeSemester->id,
                    'status' => 'draft',
                    'total_credits' => $totalCredits,
                    'confirmed_at' => null,
                ]);
            } else {
                $studyPlan->update([
                    'status' => 'draft',
                    'total_credits' => $totalCredits,
                    'confirmed_at' => null,
                ]);
            }

            $this->syncStudyPlanItems($studyPlan, $classes);

            return $studyPlan->fresh([
                'items.courseClass.course',
                'items.courseClass.lecturer.user:id,username,name',
            ]);
        });
    }

    public function confirm(Student $student, ?array $classIds = null): StudyPlan
    {
        $activeSemester = $this->requireActiveSemesterInKrsWindow();

        return DB::transaction(function () use ($student, $activeSemester, $classIds) {
            $studyPlan = StudyPlan::where('student_id', $student->id)
                ->where('semester_id', $activeSemester->id)
                ->lockForUpdate()
                ->first();

            if ($studyPlan && $studyPlan->status === 'confirmed') {
                ApiResponse::throwError(
                    'STUDY_PLAN_ALREADY_CONFIRMED',
                    'KRS Anda sudah dikonfirmasi (final) sebelumnya.',
                    409
                );
            }

            $targetIds = $classIds !== null
                ? $classIds
                : ($studyPlan ? $studyPlan->items()->pluck('course_class_id')->all() : []);

            $normalizedIds = array_values(array_unique(array_map('intval', $targetIds)));

            if (empty($normalizedIds)) {
                ApiResponse::throwError(
                    'VALIDATION_ERROR',
                    'Pilih minimal satu kelas sebelum melakukan konfirmasi KRS Final.',
                    422,
                    ['course_class_ids' => ['Minimal 1 kelas wajib dipilih untuk konfirmasi KRS.']]
                );
            }

            sort($normalizedIds);

            $classes = $this->loadAndValidateClasses($normalizedIds, $activeSemester->id, true);
            $this->validateBusinessRules($student, $classes);
            $this->validateQuotaAvailability($classes);

            $totalCredits = $classes->sum(fn (CourseClass $c) => (int) $c->course->credits);
            $confirmedAt = CarbonImmutable::now('UTC');

            if (! $studyPlan) {
                $studyPlan = StudyPlan::create([
                    'student_id' => $student->id,
                    'semester_id' => $activeSemester->id,
                    'status' => 'confirmed',
                    'total_credits' => $totalCredits,
                    'confirmed_at' => $confirmedAt,
                ]);
            } else {
                $studyPlan->update([
                    'status' => 'confirmed',
                    'total_credits' => $totalCredits,
                    'confirmed_at' => $confirmedAt,
                ]);
            }

            $this->syncStudyPlanItems($studyPlan, $classes);

            foreach ($classes as $courseClass) {
                $courseClass->increment('enrolled_count');
            }

            AuditLogService::log(
                $student->user_id,
                'study_plan_confirmed',
                'study_plans',
                $studyPlan->id,
                [
                    'student_id' => $student->id,
                    'semester_id' => $activeSemester->id,
                    'total_credits' => $totalCredits,
                    'course_class_ids' => $normalizedIds,
                ]
            );

            return $studyPlan->fresh([
                'items.courseClass.course',
                'items.courseClass.lecturer.user:id,username,name',
            ]);
        });
    }

    private function requireActiveSemesterInKrsWindow(): Semester
    {
        $activeSemester = Semester::where('is_active', true)->first();

        if (! $activeSemester) {
            ApiResponse::throwError(
                'KRS_PERIOD_CLOSED',
                'Tidak ada semester aktif saat ini. Periode pengisian KRS ditutup.',
                409
            );
        }

        $nowWib = CarbonImmutable::now('Asia/Jakarta');
        $startWib = $activeSemester->enrollment_start_at->copy()->timezone('Asia/Jakarta');
        $endWib = $activeSemester->enrollment_end_at->copy()->timezone('Asia/Jakarta');

        if ($nowWib->lt($startWib) || $nowWib->gt($endWib)) {
            ApiResponse::throwError(
                'KRS_PERIOD_CLOSED',
                'Saat ini berada di luar rentang periode pengisian KRS aktif.',
                409
            );
        }

        return $activeSemester;
    }

    private function loadAndValidateClasses(array $classIds, int $activeSemesterId, bool $lockForUpdate): Collection
    {
        if (empty($classIds)) {
            return collect();
        }

        $query = CourseClass::with(['course', 'lecturer.user:id,username,name'])
            ->whereIn('id', $classIds)
            ->where('semester_id', $activeSemesterId)
            ->orderBy('id');

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        $classes = $query->get();

        if ($classes->count() !== count($classIds)) {
            ApiResponse::throwError(
                'VALIDATION_ERROR',
                'Sebagian kelas yang dipilih tidak ditemukan atau tidak dibuka pada semester aktif.',
                422,
                ['course_class_ids' => ['Pastikan seluruh kelas yang dipilih berasal dari semester aktif.']]
            );
        }

        $inactiveCourse = $classes->first(fn (CourseClass $c) => ! $c->course->is_active);
        if ($inactiveCourse) {
            ApiResponse::throwError(
                'COURSE_INACTIVE',
                "Mata kuliah {$inactiveCourse->course->course_name} sedang tidak aktif.",
                422
            );
        }

        return $classes;
    }

    private function validateBusinessRules(Student $student, Collection $classes): void
    {
        // BR-06: Tidak boleh mengambil 2 kelas paralel dari course_id yang sama
        $groupedByCourse = $classes->groupBy('course_id');
        $duplicateConflicts = [];

        foreach ($groupedByCourse as $group) {
            if ($group->count() > 1) {
                $courseName = $group->first()->course->course_name;
                foreach ($group as $courseClass) {
                    $duplicateConflicts[] = $this->formatConflictClass(
                        $courseClass,
                        "Tidak boleh memilih lebih dari satu kelas paralel untuk mata kuliah {$courseName}."
                    );
                }
            }
        }

        if (! empty($duplicateConflicts)) {
            ApiResponse::throwError(
                'DUPLICATE_COURSE',
                'Terdapat mata kuliah yang dipilih lebih dari satu kelas paralel.',
                409,
                ['conflicting_classes' => $duplicateConflicts]
            );
        }

        // BR-05: Tidak boleh bentrok jadwal pada hari yang sama
        $scheduleConflicts = [];
        $classList = $classes->values();
        $count = $classList->count();

        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                $first = $classList[$i];
                $second = $classList[$j];

                if ($first->day_of_week !== $second->day_of_week) {
                    continue;
                }

                $firstStart = substr((string) $first->start_time, 0, 5);
                $firstEnd = substr((string) $first->end_time, 0, 5);
                $secondStart = substr((string) $second->start_time, 0, 5);
                $secondEnd = substr((string) $second->end_time, 0, 5);

                if ($firstStart < $secondEnd && $firstEnd > $secondStart) {
                    $scheduleConflicts[$first->id] = $this->formatConflictClass(
                        $first,
                        "Jadwal {$first->course->course_name} {$first->class_code} ({$first->day_of_week} {$firstStart}-{$firstEnd}) bentrok dengan {$second->course->course_name} {$second->class_code} ({$secondStart}-{$secondEnd})."
                    );
                    $scheduleConflicts[$second->id] = $this->formatConflictClass(
                        $second,
                        "Jadwal {$second->course->course_name} {$second->class_code} ({$second->day_of_week} {$secondStart}-{$secondEnd}) bentrok dengan {$first->course->course_name} {$first->class_code} ({$firstStart}-{$firstEnd})."
                    );
                }
            }
        }

        if (! empty($scheduleConflicts)) {
            ApiResponse::throwError(
                'SCHEDULE_CONFLICT',
                'Terdapat bentrok jadwal kuliah pada kelas yang dipilih.',
                409,
                ['conflicting_classes' => array_values($scheduleConflicts)]
            );
        }

        // BR-07: Batas maksimal SKS
        $totalCredits = $classes->sum(fn (CourseClass $c) => (int) $c->course->credits);

        if ($totalCredits > $student->max_credits) {
            ApiResponse::throwError(
                'MAX_CREDITS_EXCEEDED',
                "Total SKS pilihan ({$totalCredits} SKS) melebihi batas maksimal SKS Anda ({$student->max_credits} SKS).",
                422,
                ['total_credits' => ["Total SKS ({$totalCredits}) melebihi batas maksimal ({$student->max_credits} SKS)."]]
            );
        }
    }

    private function validateQuotaAvailability(Collection $classes): void
    {
        $fullClasses = [];

        foreach ($classes as $courseClass) {
            if ($courseClass->enrolled_count >= $courseClass->quota) {
                $fullClasses[] = $this->formatConflictClass(
                    $courseClass,
                    "Kuota kelas {$courseClass->course->course_name} {$courseClass->class_code} telah penuh ({$courseClass->enrolled_count}/{$courseClass->quota})."
                );
            }
        }

        if (! empty($fullClasses)) {
            ApiResponse::throwError(
                'CLASS_QUOTA_FULL',
                'Konfirmasi KRS gagal karena kuota kelas telah penuh.',
                409,
                ['conflicting_classes' => $fullClasses]
            );
        }
    }

    private function syncStudyPlanItems(StudyPlan $studyPlan, Collection $classes): void
    {
        $studyPlan->items()->delete();

        foreach ($classes as $courseClass) {
            StudyPlanItem::create([
                'study_plan_id' => $studyPlan->id,
                'course_class_id' => $courseClass->id,
                'course_id' => $courseClass->course_id,
            ]);
        }
    }

    private function formatConflictClass(CourseClass $courseClass, string $reason): array
    {
        return [
            'course_class_id' => $courseClass->id,
            'course_code' => $courseClass->course->course_code,
            'course_name' => $courseClass->course->course_name,
            'class_code' => $courseClass->class_code,
            'quota' => $courseClass->quota,
            'enrolled_count' => $courseClass->enrolled_count,
            'reason' => $reason,
        ];
    }
}
