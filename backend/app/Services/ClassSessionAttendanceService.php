<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AuditLog;
use App\Models\ClassSession;
use App\Models\CourseClass;
use App\Models\StudyPlanItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ClassSessionAttendanceService
{
    private const STATUS_LABELS = [
        'present' => 'Hadir',
        'excused' => 'Izin',
        'sick' => 'Sakit',
        'absent' => 'Alpa',
    ];

    /**
     * List classes taught by the authenticated lecturer.
     */
    public function getLecturerClasses(User $user, ?int $semesterId = null): array
    {
        $lecturer = $user->lecturer;
        if ($lecturer === null) {
            $this->abortError('FORBIDDEN_CLASS_ACCESS', 'Akses ditolak. Profil dosen tidak ditemukan.', 403);
        }

        return CourseClass::query()
            ->with(['course', 'semester', 'lecturer.user'])
            ->withCount('classSessions')
            ->where('lecturer_id', $lecturer->id)
            ->when($semesterId !== null, fn ($query) => $query->where('semester_id', $semesterId))
            ->orderByDesc('semester_id')
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get()
            ->toArray();
    }

    /**
     * List confirmed participants of a class owned by the lecturer.
     */
    public function getClassParticipants(User $user, int $classId): array
    {
        $courseClass = $this->findClassAndAuthorizeLecturer($user, $classId);

        $items = StudyPlanItem::query()
            ->with(['studyPlan.student.user'])
            ->where('course_class_id', $courseClass->id)
            ->whereHas('studyPlan', fn ($query) => $query->where('status', 'confirmed'))
            ->get()
            ->sortBy(fn (StudyPlanItem $item) => $item->studyPlan->student->student_number)
            ->values();

        $participants = $items->map(function (StudyPlanItem $item) {
            $student = $item->studyPlan->student;

            return [
                'study_plan_item_id' => $item->id,
                'student_id' => $student->id,
                'student_number' => $student->student_number,
                'name' => $student->user->name,
                'study_program' => $student->study_program,
                'cohort_year' => $student->cohort_year,
                'study_plan_status' => $item->studyPlan->status,
            ];
        })->all();

        return [
            'course_class' => $courseClass,
            'participants' => $participants,
        ];
    }

    /**
     * List class sessions ordered by session_number ascending.
     */
    public function getClassSessions(User $user, int $classId): array
    {
        $courseClass = $this->findClassAndAuthorizeLecturer($user, $classId);

        $sessions = ClassSession::query()
            ->where('course_class_id', $courseClass->id)
            ->orderBy('session_number')
            ->get()
            ->map(fn (ClassSession $session) => $this->formatSession($session))
            ->all();

        return [
            'course_class' => $courseClass,
            'sessions' => $sessions,
        ];
    }

    /**
     * Create a new class session with atomic sequential session_number.
     */
    public function createSession(User $user, int $classId, array $data): array
    {
        $this->findClassAndAuthorizeLecturer($user, $classId);

        $session = DB::transaction(function () use ($classId, $data) {
            CourseClass::query()->where('id', $classId)->lockForUpdate()->firstOrFail();

            $nextNumber = (int) ClassSession::query()
                ->where('course_class_id', $classId)
                ->max('session_number') + 1;

            return ClassSession::query()->create([
                'course_class_id' => $classId,
                'session_number' => $nextNumber,
                'session_date' => $data['session_date'],
                'topic' => $data['topic'],
                'attendance_status' => 'not_opened',
                'opened_at' => null,
                'closed_at' => null,
            ]);
        });

        return $this->formatSession($session);
    }

    /**
     * Update session_date and topic of an existing session (BR-20).
     */
    public function updateSession(User $user, int $sessionId, array $data): array
    {
        $session = $this->findSessionAndAuthorizeLecturer($user, $sessionId);

        $session->update([
            'session_date' => $data['session_date'],
            'topic' => $data['topic'],
        ]);

        return $this->formatSession($session->fresh());
    }

    /**
     * Delete a session only when not_opened and without attendance rows, then re-sequence subsequent sessions.
     */
    public function deleteSession(User $user, int $sessionId): void
    {
        $session = $this->findSessionAndAuthorizeLecturer($user, $sessionId);
        $classId = $session->course_class_id;

        DB::transaction(function () use ($classId, $sessionId) {
            CourseClass::query()->where('id', $classId)->lockForUpdate()->firstOrFail();

            $lockedSession = ClassSession::query()
                ->where('id', $sessionId)
                ->lockForUpdate()
                ->first();

            if ($lockedSession === null) {
                $this->abortError('RESOURCE_NOT_FOUND', 'Data pertemuan yang diminta tidak ditemukan.', 404);
            }

            if ($lockedSession->attendance_status !== 'not_opened' || $lockedSession->attendances()->exists()) {
                $this->abortError(
                    'SESSION_CANNOT_BE_DELETED',
                    'Pertemuan tidak dapat dihapus karena status presensi sudah dibuka atau sudah memiliki data kehadiran.',
                    409
                );
            }

            $deletedNumber = $lockedSession->session_number;
            $lockedSession->delete();

            $subsequent = ClassSession::query()
                ->where('course_class_id', $classId)
                ->where('session_number', '>', $deletedNumber)
                ->orderBy('session_number')
                ->get();

            foreach ($subsequent as $row) {
                $row->update(['session_number' => $row->session_number - 1]);
            }
        });
    }

    /**
     * Transition session attendance status (not_opened -> open -> closed, or closed -> open with reason).
     */
    public function updateAttendanceStatus(User $user, int $sessionId, array $data): array
    {
        $this->findSessionAndAuthorizeLecturer($user, $sessionId);

        $targetStatus = $data['attendance_status'];
        $reason = isset($data['reason']) ? trim((string) $data['reason']) : null;

        $updatedSession = DB::transaction(function () use ($user, $sessionId, $targetStatus, $reason) {
            $locked = ClassSession::query()
                ->where('id', $sessionId)
                ->lockForUpdate()
                ->firstOrFail();

            $current = $locked->attendance_status;
            $now = now('UTC');

            if ($current === 'not_opened' && $targetStatus === 'open') {
                $locked->update([
                    'attendance_status' => 'open',
                    'opened_at' => $now,
                    'closed_at' => null,
                ]);
                $this->recordAudit($user->id, 'attendance_session_opened', $locked, [
                    'course_class_id' => $locked->course_class_id,
                    'session_number' => $locked->session_number,
                    'previous_status' => $current,
                    'new_status' => 'open',
                ]);
            } elseif ($current === 'open' && $targetStatus === 'closed') {
                $locked->update([
                    'attendance_status' => 'closed',
                    'closed_at' => $now,
                ]);
                $this->recordAudit($user->id, 'attendance_session_closed', $locked, [
                    'course_class_id' => $locked->course_class_id,
                    'session_number' => $locked->session_number,
                    'previous_status' => $current,
                    'new_status' => 'closed',
                ]);
            } elseif ($current === 'closed' && $targetStatus === 'open') {
                if ($reason === null || mb_strlen($reason) < 5) {
                    $this->abortError(
                        'VALIDATION_ERROR',
                        'Alasan pembukaan ulang presensi wajib diisi minimal 5 karakter.',
                        422,
                        ['reason' => ['Alasan pembukaan ulang presensi wajib diisi minimal 5 karakter.']]
                    );
                }

                $locked->update([
                    'attendance_status' => 'open',
                    'opened_at' => $locked->opened_at ?? $now,
                    'closed_at' => null,
                ]);
                $this->recordAudit($user->id, 'attendance_session_reopened', $locked, [
                    'course_class_id' => $locked->course_class_id,
                    'session_number' => $locked->session_number,
                    'previous_status' => $current,
                    'new_status' => 'open',
                    'reason' => $reason,
                ]);
            } else {
                $this->abortError(
                    'INVALID_STATUS_TRANSITION',
                    "Transisi status presensi dari '{$current}' ke '{$targetStatus}' tidak valid.",
                    409
                );
            }

            return $locked->fresh();
        });

        return $this->formatSession($updatedSession);
    }

    /**
     * Get attendance recap for a session using LEFT JOIN against confirmed participants.
     */
    public function getSessionAttendances(User $user, int $sessionId): array
    {
        $session = $this->findSessionAndAuthorizeLecturer($user, $sessionId);

        $rows = DB::table('study_plan_items as spi')
            ->join('study_plans as sp', function ($join) {
                $join->on('sp.id', '=', 'spi.study_plan_id')
                    ->where('sp.status', '=', 'confirmed');
            })
            ->join('students as st', 'st.id', '=', 'sp.student_id')
            ->join('users as u', 'u.id', '=', 'st.user_id')
            ->leftJoin('attendances as att', function ($join) use ($session) {
                $join->on('att.student_id', '=', 'st.id')
                    ->where('att.class_session_id', '=', $session->id);
            })
            ->where('spi.course_class_id', $session->course_class_id)
            ->orderBy('st.student_number')
            ->select([
                'st.id as student_id',
                'st.student_number',
                'u.name',
                'st.study_program',
                'att.status',
                'att.recorded_at',
                'att.notes',
            ])
            ->get();

        $summary = [
            'present' => 0,
            'excused' => 0,
            'sick' => 0,
            'absent' => 0,
            'unrecorded' => 0,
            'total' => $rows->count(),
        ];

        $participants = $rows->map(function ($row) use (&$summary) {
            if ($row->status === null) {
                $summary['unrecorded']++;
            } elseif (isset($summary[$row->status])) {
                $summary[$row->status]++;
            }

            return [
                'student_id' => (int) $row->student_id,
                'student_number' => $row->student_number,
                'name' => $row->name,
                'study_program' => $row->study_program,
                'status' => $row->status,
                'display_status' => $this->statusLabel($row->status),
                'recorded_at' => $this->toIsoUtc($row->recorded_at),
                'notes' => $row->notes,
            ];
        })->all();

        return [
            'session' => $this->formatSession($session),
            'summary' => $summary,
            'participants' => $participants,
        ];
    }

    /**
     * Upsert a student's attendance status manually by the lecturer.
     */
    public function updateStudentAttendance(User $user, int $sessionId, int $studentId, array $data): array
    {
        $session = $this->findSessionAndAuthorizeLecturer($user, $sessionId);

        $isParticipant = StudyPlanItem::query()
            ->where('course_class_id', $session->course_class_id)
            ->whereHas('studyPlan', function ($query) use ($studentId) {
                $query->where('student_id', $studentId)
                    ->where('status', 'confirmed');
            })
            ->exists();

        if (!$isParticipant) {
            $this->abortError('RESOURCE_NOT_FOUND', 'Mahasiswa bukan peserta terdaftar pada kelas ini.', 404);
        }

        $attendance = DB::transaction(function () use ($user, $session, $studentId, $data) {
            $existing = Attendance::query()
                ->where('class_session_id', $session->id)
                ->where('student_id', $studentId)
                ->lockForUpdate()
                ->first();

            $oldStatus = $existing?->status;
            $hasNotesKey = array_key_exists('notes', $data);
            $notes = $hasNotesKey ? $data['notes'] : $existing?->notes;

            if ($existing !== null) {
                $existing->update([
                    'status' => $data['status'],
                    'recorded_at' => $existing->recorded_at ?? now('UTC'),
                    'notes' => $notes,
                    'updated_by' => $user->id,
                ]);
                $record = $existing->fresh();
            } else {
                $record = Attendance::query()->create([
                    'class_session_id' => $session->id,
                    'student_id' => $studentId,
                    'status' => $data['status'],
                    'recorded_at' => now('UTC'),
                    'notes' => $notes,
                    'updated_by' => $user->id,
                ]);
            }

            AuditLog::query()->create([
                'user_id' => $user->id,
                'action' => 'attendance_updated_by_lecturer',
                'entity' => 'attendances',
                'entity_id' => $record->id,
                'details' => [
                    'class_session_id' => $session->id,
                    'course_class_id' => $session->course_class_id,
                    'student_id' => $studentId,
                    'old_status' => $oldStatus,
                    'new_status' => $record->status,
                    'notes' => $record->notes,
                ],
                'created_at' => now('UTC'),
            ]);

            return $record;
        });

        return [
            'id' => $attendance->id,
            'class_session_id' => $attendance->class_session_id,
            'student_id' => $attendance->student_id,
            'status' => $attendance->status,
            'display_status' => $this->statusLabel($attendance->status),
            'recorded_at' => $this->toIsoUtc($attendance->recorded_at),
            'notes' => $attendance->notes,
        ];
    }

    /**
     * Get class sessions and personal attendance history for an enrolled student.
     */
    public function getStudentClassSessions(User $user, int $classId): array
    {
        $student = $user->student;
        if ($student === null) {
            $this->abortError('FORBIDDEN_CLASS_ACCESS', 'Akses ditolak. Profil mahasiswa tidak ditemukan.', 403);
        }

        $courseClass = CourseClass::query()
            ->with(['course', 'semester', 'lecturer.user'])
            ->find($classId);

        if ($courseClass === null) {
            $this->abortError('RESOURCE_NOT_FOUND', 'Data kelas yang diminta tidak ditemukan.', 404);
        }

        $auth = Gate::forUser($user)->inspect('viewAsStudent', $courseClass);
        if ($auth->denied()) {
            $this->abortError('FORBIDDEN_CLASS_ACCESS', $auth->message(), 403);
        }

        $sessions = ClassSession::query()
            ->with(['attendances' => fn ($query) => $query->where('student_id', $student->id)])
            ->where('course_class_id', $courseClass->id)
            ->orderBy('session_number')
            ->get()
            ->map(function (ClassSession $session) {
                $att = $session->attendances->first();

                return array_merge($this->formatSession($session), [
                    'my_attendance' => $att !== null ? [
                        'id' => $att->id,
                        'status' => $att->status,
                        'status_label' => $this->statusLabel($att->status),
                        'recorded_at' => $this->toIsoUtc($att->recorded_at),
                        'notes' => $att->notes,
                    ] : null,
                ]);
            })
            ->all();

        return [
            'course_class' => $courseClass,
            'sessions' => $sessions,
        ];
    }

    /**
     * Idempotent self-check-in attendance submission for an enrolled student when session is open.
     *
     * @return array{data: array, created: bool}
     */
    public function submitStudentAttendance(User $user, int $sessionId): array
    {
        $student = $user->student;
        if ($student === null) {
            $this->abortError('FORBIDDEN_CLASS_ACCESS', 'Akses ditolak. Profil mahasiswa tidak ditemukan.', 403);
        }

        $session = ClassSession::query()
            ->with('courseClass.course')
            ->find($sessionId);

        if ($session === null) {
            $this->abortError('RESOURCE_NOT_FOUND', 'Data pertemuan yang diminta tidak ditemukan.', 404);
        }

        $auth = Gate::forUser($user)->inspect('viewAsStudent', $session);
        if ($auth->denied()) {
            $this->abortError('FORBIDDEN_CLASS_ACCESS', $auth->message(), 403);
        }

        return DB::transaction(function () use ($user, $student, $session) {
            $lockedSession = ClassSession::query()
                ->where('id', $session->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedSession->attendance_status !== 'open') {
                $this->abortError(
                    'ATTENDANCE_SESSION_NOT_OPEN',
                    'Presensi gagal. Sesi presensi pertemuan ini belum dibuka atau telah ditutup.',
                    409
                );
            }

            $existing = Attendance::query()
                ->where('class_session_id', $lockedSession->id)
                ->where('student_id', $student->id)
                ->first();

            if ($existing !== null) {
                return [
                    'data' => $this->formatStudentAttendancePayload($existing, $lockedSession),
                    'created' => false,
                ];
            }

            try {
                $created = Attendance::query()->create([
                    'class_session_id' => $lockedSession->id,
                    'student_id' => $student->id,
                    'status' => 'present',
                    'recorded_at' => now('UTC'),
                    'notes' => null,
                    'updated_by' => $user->id,
                ]);

                return [
                    'data' => $this->formatStudentAttendancePayload($created, $lockedSession),
                    'created' => true,
                ];
            } catch (UniqueConstraintViolationException|QueryException $e) {
                $sqlState = $e->errorInfo[0] ?? null;
                if ($e instanceof UniqueConstraintViolationException || $sqlState === '23000' || $sqlState === '23505') {
                    $existingAfterRace = Attendance::query()
                        ->where('class_session_id', $lockedSession->id)
                        ->where('student_id', $student->id)
                        ->firstOrFail();

                    return [
                        'data' => $this->formatStudentAttendancePayload($existingAfterRace, $lockedSession),
                        'created' => false,
                    ];
                }

                throw $e;
            }
        });
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

    private function findSessionAndAuthorizeLecturer(User $user, int $sessionId): ClassSession
    {
        $session = ClassSession::query()
            ->with('courseClass.course')
            ->find($sessionId);

        if ($session === null) {
            $this->abortError('RESOURCE_NOT_FOUND', 'Data pertemuan yang diminta tidak ditemukan.', 404);
        }

        $auth = Gate::forUser($user)->inspect('manage', $session);
        if ($auth->denied()) {
            $this->abortError('FORBIDDEN_CLASS_ACCESS', $auth->message(), 403);
        }

        return $session;
    }

    private function formatSession(ClassSession $session): array
    {
        return [
            'id' => $session->id,
            'course_class_id' => $session->course_class_id,
            'session_number' => $session->session_number,
            'session_date' => $session->session_date instanceof Carbon
                ? $session->session_date->format('Y-m-d')
                : (string) $session->session_date,
            'topic' => $session->topic,
            'attendance_status' => $session->attendance_status,
            'opened_at' => $this->toIsoUtc($session->opened_at),
            'closed_at' => $this->toIsoUtc($session->closed_at),
            'created_at' => $this->toIsoUtc($session->created_at),
            'updated_at' => $this->toIsoUtc($session->updated_at),
        ];
    }

    private function formatStudentAttendancePayload(Attendance $attendance, ClassSession $session): array
    {
        return [
            'id' => $attendance->id,
            'class_session_id' => $attendance->class_session_id,
            'session_number' => $session->session_number,
            'student_id' => $attendance->student_id,
            'status' => $attendance->status,
            'status_label' => $this->statusLabel($attendance->status),
            'recorded_at' => $this->toIsoUtc($attendance->recorded_at),
            'notes' => $attendance->notes,
        ];
    }

    private function statusLabel(?string $status): string
    {
        return $status === null
            ? 'Belum mengisi'
            : (self::STATUS_LABELS[$status] ?? $status);
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

    private function recordAudit(int $userId, string $action, ClassSession $session, array $details): void
    {
        AuditLog::query()->create([
            'user_id' => $userId,
            'action' => $action,
            'entity' => 'class_sessions',
            'entity_id' => $session->id,
            'details' => $details,
            'created_at' => now('UTC'),
        ]);
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
