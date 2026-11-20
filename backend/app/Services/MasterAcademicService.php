<?php

namespace App\Services;

use App\Models\Course;
use App\Models\CourseClass;
use App\Models\Lecturer;
use App\Models\Semester;
use App\Models\Student;
use App\Models\User;
use App\Support\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MasterAcademicService
{
    public function createStudent(array $data): Student
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'username' => $data['username'],
                'name' => $data['name'],
                'password' => Hash::make($data['password']),
                'role' => 'student',
                'is_active' => $data['is_active'] ?? true,
            ]);

            $student = Student::create([
                'user_id' => $user->id,
                'student_number' => $data['student_number'],
                'study_program' => $data['study_program'],
                'cohort_year' => (int) $data['cohort_year'],
                'max_credits' => (int) ($data['max_credits'] ?? 24),
            ]);

            return $student->load('user');
        });
    }

    public function updateStudent(Student $student, array $data, int $actorId): Student
    {
        return DB::transaction(function () use ($student, $data, $actorId) {
            $student->load('user');
            $user = $student->user;
            $wasActive = (bool) $user->is_active;

            $userPayload = [
                'username' => $data['username'],
                'name' => $data['name'],
                'is_active' => (bool) ($data['is_active'] ?? $user->is_active),
            ];

            if (! empty($data['password'])) {
                $userPayload['password'] = Hash::make($data['password']);
            }

            $user->update($userPayload);

            $student->update([
                'student_number' => $data['student_number'],
                'study_program' => $data['study_program'],
                'cohort_year' => (int) $data['cohort_year'],
                'max_credits' => (int) ($data['max_credits'] ?? $student->max_credits),
            ]);

            if ($wasActive && ! $user->is_active) {
                $user->tokens()->delete();

                AuditLogService::log(
                    $actorId,
                    'user_deactivated',
                    'users',
                    $user->id,
                    [
                        'username' => $user->username,
                        'role' => $user->role,
                        'student_id' => $student->id,
                        'student_number' => $student->student_number,
                    ]
                );
            }

            return $student->fresh(['user']);
        });
    }

    public function createLecturer(array $data): Lecturer
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'username' => $data['username'],
                'name' => $data['name'],
                'password' => Hash::make($data['password']),
                'role' => 'lecturer',
                'is_active' => $data['is_active'] ?? true,
            ]);

            $lecturer = Lecturer::create([
                'user_id' => $user->id,
                'lecturer_number' => $data['lecturer_number'],
                'faculty' => $data['faculty'],
            ]);

            return $lecturer->load('user');
        });
    }

    public function updateLecturer(Lecturer $lecturer, array $data, int $actorId): Lecturer
    {
        return DB::transaction(function () use ($lecturer, $data, $actorId) {
            $lecturer->load('user');
            $user = $lecturer->user;
            $wasActive = (bool) $user->is_active;

            $userPayload = [
                'username' => $data['username'],
                'name' => $data['name'],
                'is_active' => (bool) ($data['is_active'] ?? $user->is_active),
            ];

            if (! empty($data['password'])) {
                $userPayload['password'] = Hash::make($data['password']);
            }

            $user->update($userPayload);

            $lecturer->update([
                'lecturer_number' => $data['lecturer_number'],
                'faculty' => $data['faculty'],
            ]);

            if ($wasActive && ! $user->is_active) {
                $user->tokens()->delete();

                AuditLogService::log(
                    $actorId,
                    'user_deactivated',
                    'users',
                    $user->id,
                    [
                        'username' => $user->username,
                        'role' => $user->role,
                        'lecturer_id' => $lecturer->id,
                        'lecturer_number' => $lecturer->lecturer_number,
                    ]
                );
            }

            return $lecturer->fresh(['user']);
        });
    }

    public function createCourse(array $data): Course
    {
        return Course::create([
            'course_code' => strtoupper(trim($data['course_code'])),
            'course_name' => trim($data['course_name']),
            'credits' => (int) $data['credits'],
            'is_active' => (bool) ($data['is_active'] ?? true),
        ]);
    }

    public function updateCourse(Course $course, array $data): Course
    {
        $course->update([
            'course_code' => strtoupper(trim($data['course_code'])),
            'course_name' => trim($data['course_name']),
            'credits' => (int) $data['credits'],
            'is_active' => (bool) ($data['is_active'] ?? $course->is_active),
        ]);

        return $course->fresh();
    }

    public function createSemester(array $data, int $actorId): Semester
    {
        return DB::transaction(function () use ($data, $actorId) {
            $isActive = (bool) ($data['is_active'] ?? false);
            $startUtc = $this->parseToUtc($data['enrollment_start_at']);
            $endUtc = $this->parseToUtc($data['enrollment_end_at']);

            if ($isActive) {
                Semester::where('is_active', true)->update(['is_active' => false]);
            }

            $semester = Semester::create([
                'code' => trim($data['code']),
                'name' => trim($data['name']),
                'is_active' => $isActive,
                'enrollment_start_at' => $startUtc,
                'enrollment_end_at' => $endUtc,
            ]);

            if ($isActive) {
                AuditLogService::log($actorId, 'semester_activated', 'semesters', $semester->id, [
                    'code' => $semester->code,
                    'name' => $semester->name,
                ]);
            }

            AuditLogService::log($actorId, 'krs_period_updated', 'semesters', $semester->id, [
                'code' => $semester->code,
                'enrollment_start_at' => $startUtc->toIso8601ZuluString(),
                'enrollment_end_at' => $endUtc->toIso8601ZuluString(),
            ]);

            return $semester;
        });
    }

    public function updateSemester(Semester $semester, array $data, int $actorId): Semester
    {
        return DB::transaction(function () use ($semester, $data, $actorId) {
            $wasActive = (bool) $semester->is_active;
            $oldStart = $semester->enrollment_start_at?->toIso8601ZuluString();
            $oldEnd = $semester->enrollment_end_at?->toIso8601ZuluString();

            $isActive = array_key_exists('is_active', $data) ? (bool) $data['is_active'] : $wasActive;
            $startUtc = $this->parseToUtc($data['enrollment_start_at']);
            $endUtc = $this->parseToUtc($data['enrollment_end_at']);

            if ($isActive) {
                Semester::where('id', '!=', $semester->id)
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }

            $semester->update([
                'code' => trim($data['code']),
                'name' => trim($data['name']),
                'is_active' => $isActive,
                'enrollment_start_at' => $startUtc,
                'enrollment_end_at' => $endUtc,
            ]);

            if (! $wasActive && $isActive) {
                AuditLogService::log($actorId, 'semester_activated', 'semesters', $semester->id, [
                    'code' => $semester->code,
                    'name' => $semester->name,
                ]);
            }

            $newStart = $startUtc->toIso8601ZuluString();
            $newEnd = $endUtc->toIso8601ZuluString();

            if ($oldStart !== $newStart || $oldEnd !== $newEnd) {
                AuditLogService::log($actorId, 'krs_period_updated', 'semesters', $semester->id, [
                    'code' => $semester->code,
                    'old_enrollment_start_at' => $oldStart,
                    'old_enrollment_end_at' => $oldEnd,
                    'enrollment_start_at' => $newStart,
                    'enrollment_end_at' => $newEnd,
                ]);
            }

            return $semester->fresh();
        });
    }

    public function createCourseClass(array $data): CourseClass
    {
        return DB::transaction(function () use ($data) {
            $this->ensureUniqueClassCode(
                (int) $data['semester_id'],
                (int) $data['course_id'],
                $data['class_code']
            );

            $this->ensureNoScheduleConflict($data);

            $courseClass = CourseClass::create([
                'semester_id' => (int) $data['semester_id'],
                'course_id' => (int) $data['course_id'],
                'lecturer_id' => (int) $data['lecturer_id'],
                'class_code' => strtoupper(trim($data['class_code'])),
                'day_of_week' => $data['day_of_week'],
                'start_time' => $this->normalizeTimeToSql($data['start_time']),
                'end_time' => $this->normalizeTimeToSql($data['end_time']),
                'room' => trim($data['room']),
                'quota' => (int) $data['quota'],
                'enrolled_count' => 0,
            ]);

            return $courseClass->load(['semester', 'course', 'lecturer.user:id,username,name,is_active']);
        });
    }

    public function updateCourseClass(CourseClass $courseClass, array $data): CourseClass
    {
        return DB::transaction(function () use ($courseClass, $data) {
            $locked = CourseClass::where('id', $courseClass->id)->lockForUpdate()->firstOrFail();

            if ((int) $data['quota'] < $locked->enrolled_count) {
                ApiResponse::throwError(
                    'QUOTA_BELOW_ENROLLED',
                    "Kuota kelas tidak boleh lebih kecil dari jumlah peserta terdaftar ({$locked->enrolled_count}).",
                    409
                );
            }

            if ($locked->enrolled_count > 0) {
                $changedProtected =
                    (int) $data['course_id'] !== (int) $locked->course_id ||
                    (int) $data['semester_id'] !== (int) $locked->semester_id ||
                    $data['day_of_week'] !== $locked->day_of_week ||
                    $this->normalizeTimeShort($data['start_time']) !== $this->normalizeTimeShort($locked->start_time) ||
                    $this->normalizeTimeShort($data['end_time']) !== $this->normalizeTimeShort($locked->end_time);

                if ($changedProtected) {
                    ApiResponse::throwError(
                        'ACTIVE_CLASS_LOCKED',
                        'Mata kuliah, semester, dan jadwal tidak dapat diubah karena kelas sudah memiliki peserta KRS Final.',
                        409
                    );
                }
            }

            $this->ensureUniqueClassCode(
                (int) $data['semester_id'],
                (int) $data['course_id'],
                $data['class_code'],
                $locked->id
            );

            $this->ensureNoScheduleConflict($data, $locked->id);

            $locked->update([
                'semester_id' => (int) $data['semester_id'],
                'course_id' => (int) $data['course_id'],
                'lecturer_id' => (int) $data['lecturer_id'],
                'class_code' => strtoupper(trim($data['class_code'])),
                'day_of_week' => $data['day_of_week'],
                'start_time' => $this->normalizeTimeToSql($data['start_time']),
                'end_time' => $this->normalizeTimeToSql($data['end_time']),
                'room' => trim($data['room']),
                'quota' => (int) $data['quota'],
            ]);

            return $locked->fresh(['semester', 'course', 'lecturer.user:id,username,name,is_active']);
        });
    }

    private function ensureUniqueClassCode(int $semesterId, int $courseId, string $classCode, ?int $ignoreId = null): void
    {
        $normalizedCode = strtoupper(trim($classCode));

        $exists = CourseClass::query()
            ->where('semester_id', $semesterId)
            ->where('course_id', $courseId)
            ->where('class_code', $normalizedCode)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists();

        if ($exists) {
            ApiResponse::throwError(
                'DUPLICATE_CLASS_CODE',
                "Kelas paralel {$normalizedCode} untuk mata kuliah dan semester ini sudah ada.",
                409
            );
        }
    }

    private function ensureNoScheduleConflict(array $data, ?int $ignoreId = null): void
    {
        $startTime = $this->normalizeTimeToSql($data['start_time']);
        $endTime = $this->normalizeTimeToSql($data['end_time']);
        $roomNormalized = strtolower(trim((string) $data['room']));
        $lecturerId = (int) $data['lecturer_id'];

        $candidates = CourseClass::with(['course', 'lecturer.user:id,name'])
            ->where('semester_id', (int) $data['semester_id'])
            ->where('day_of_week', $data['day_of_week'])
            ->where('start_time', '<', $endTime)
            ->where('end_time', '>', $startTime)
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->get();

        $conflicts = [];

        foreach ($candidates as $existing) {
            $lecturerClash = (int) $existing->lecturer_id === $lecturerId;
            $roomClash = strtolower(trim((string) $existing->room)) === $roomNormalized;

            if (! $lecturerClash && ! $roomClash) {
                continue;
            }

            $reasons = [];
            if ($lecturerClash) {
                $lecturerName = $existing->lecturer?->user?->name ?? 'Dosen';
                $reasons[] = "Bentrok jadwal dosen ({$lecturerName})";
            }
            if ($roomClash) {
                $reasons[] = "Bentrok penggunaan ruangan ({$existing->room})";
            }

            $conflicts[] = [
                'course_class_id' => $existing->id,
                'course_code' => $existing->course?->course_code,
                'course_name' => $existing->course?->course_name,
                'class_code' => $existing->class_code,
                'day_of_week' => $existing->day_of_week,
                'start_time' => $this->normalizeTimeShort($existing->start_time),
                'end_time' => $this->normalizeTimeShort($existing->end_time),
                'room' => $existing->room,
                'quota' => $existing->quota,
                'enrolled_count' => $existing->enrolled_count,
                'reason' => implode(' dan ', $reasons).' pada '.$existing->day_of_week.' '.$this->normalizeTimeShort($existing->start_time).'-'.$this->normalizeTimeShort($existing->end_time).'.',
            ];
        }

        if (! empty($conflicts)) {
            ApiResponse::throwError(
                'SCHEDULE_CONFLICT',
                'Jadwal kelas bentrok dengan kelas lain pada semester dan hari yang sama.',
                409,
                ['conflicting_classes' => $conflicts]
            );
        }
    }

    private function parseToUtc(string $value): CarbonImmutable
    {
        return CarbonImmutable::parse($value, 'Asia/Jakarta')->utc();
    }

    private function normalizeTimeToSql(string $time): string
    {
        return $this->normalizeTimeShort($time).':00';
    }

    private function normalizeTimeShort(string $time): string
    {
        return substr(trim($time), 0, 5);
    }
}
