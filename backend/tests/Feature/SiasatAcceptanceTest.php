<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AuditLog;
use App\Models\ClassSession;
use App\Models\CourseClass;
use App\Models\Grade;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Database\Seeders\InitialSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class SiasatAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    private array $tokens = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->tokens = [];
        $this->seed(InitialSeeder::class);
        $this->seed(DemoSeeder::class);
    }

    // ---------- helpers ----------

    private function token(string $username): string
    {
        if (! isset($this->tokens[$username])) {
            $password = $username === 'admin' ? 'AdminSiasat123!' : 'password123';
            $this->app['auth']->forgetGuards();
            $res = $this->postJson('/api/auth/login', ['username' => $username, 'password' => $password]);
            $res->assertStatus(200);
            $this->tokens[$username] = $res->json('data.token');
        }

        return $this->tokens[$username];
    }

    private function api(string $method, string $uri, ?string $as = null, array $data = [], ?string $rawToken = null): TestResponse
    {
        $this->app['auth']->forgetGuards();
        $headers = [];
        if ($rawToken !== null) {
            $headers['Authorization'] = 'Bearer '.$rawToken;
        } elseif ($as !== null) {
            $headers['Authorization'] = 'Bearer '.$this->token($as);
        }

        return $this->json($method, $uri, $data, $headers);
    }

    private function cls(string $courseCode, string $classCode): CourseClass
    {
        return CourseClass::whereHas('course', fn ($q) => $q->where('course_code', $courseCode))
            ->where('class_code', $classCode)->firstOrFail();
    }

    private function studentOf(string $username): Student
    {
        return User::where('username', $username)->firstOrFail()->student;
    }

    private function confirmKrs(string $username, array $classIds): TestResponse
    {
        return $this->api('POST', '/api/student/study-plan/confirm', $username, ['course_class_ids' => $classIds]);
    }

    private function clearSessions(CourseClass ...$classes): void
    {
        foreach ($classes as $c) {
            ClassSession::where('course_class_id', $c->id)->delete();
        }
    }

    private function createSession(string $lecturer, CourseClass $c, string $topic = 'Topik Pertemuan'): TestResponse
    {
        return $this->api('POST', "/api/lecturer/classes/{$c->id}/sessions", $lecturer, [
            'session_date' => now()->toDateString(),
            'topic' => $topic,
        ]);
    }

    private function setStatus(string $lecturer, int $sessionId, string $status, ?string $reason = null): TestResponse
    {
        $body = ['attendance_status' => $status];
        if ($reason !== null) {
            $body['reason'] = $reason;
        }

        return $this->api('PATCH', "/api/lecturer/sessions/{$sessionId}/attendance-status", $lecturer, $body);
    }

    private function transcript(string $username): array
    {
        $res = $this->api('GET', '/api/student/transcript', $username)->assertStatus(200);

        return $res->json('data');
    }

    // ---------- AT-01 ----------

    public function test_at01_krs_draft_confirm_schedule_participants(): void
    {
        $bdA = $this->cls('IF201', 'A');
        $before = $bdA->enrolled_count;

        $this->api('PUT', '/api/student/study-plan/draft', 'student3', ['course_class_ids' => [$bdA->id]])
            ->assertStatus(200)->assertJsonPath('success', true);
        $this->assertSame($before, $bdA->fresh()->enrolled_count, 'Draft must not change enrolled_count');
        $this->assertDatabaseHas('study_plans', ['student_id' => $this->studentOf('student3')->id, 'status' => 'draft']);

        $this->api('POST', '/api/student/study-plan/confirm', 'student3')->assertStatus(200);
        $this->assertSame($before + 1, $bdA->fresh()->enrolled_count);

        $schedule = $this->api('GET', '/api/student/schedule', 'student3')->assertStatus(200)->json('data.items');
        $this->assertContains($bdA->id, array_column($schedule, 'course_class_id'));

        $participants = $this->api('GET', "/api/lecturer/classes/{$bdA->id}/participants", 'dosen1')
            ->assertStatus(200)->json('data.participants');
        $this->assertContains($this->studentOf('student3')->id, array_column($participants, 'student_id'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'study_plan_confirmed']);
    }

    public function test_at01_krs_rejections(): void
    {
        $bdA = $this->cls('IF201', 'A');
        $bdB = $this->cls('IF201', 'B');
        $pbpA = $this->cls('IF202', 'A');
        $pbpB = $this->cls('IF202', 'B');
        $jarA = $this->cls('IF203', 'A');

        // schedule clash BD A (Mon 08:00-10:30) vs PBP A (Mon 09:00-11:30)
        $this->confirmKrs('student4', [$bdA->id, $pbpA->id])->assertStatus(409)->assertJsonPath('error_code', 'SCHEDULE_CONFLICT');
        $this->api('PUT', '/api/student/study-plan/draft', 'student4', ['course_class_ids' => [$bdA->id, $pbpA->id]])
            ->assertStatus(409)->assertJsonPath('error_code', 'SCHEDULE_CONFLICT');

        // duplicate course (parallel class)
        $this->confirmKrs('student4', [$bdA->id, $bdB->id])->assertStatus(409)->assertJsonPath('error_code', 'DUPLICATE_COURSE');

        // max credits
        $this->studentOf('student4')->update(['max_credits' => 6]);
        $this->confirmKrs('student4', [$bdA->id, $pbpB->id])->assertStatus(422)->assertJsonPath('error_code', 'MAX_CREDITS_EXCEEDED');
        $this->studentOf('student4')->update(['max_credits' => 24]);

        // full quota
        $jarA->update(['enrolled_count' => $jarA->quota]);
        $this->confirmKrs('student4', [$jarA->id])->assertStatus(409)->assertJsonPath('error_code', 'CLASS_QUOTA_FULL');

        $this->assertSame(0, DB::table('study_plan_items')
            ->join('study_plans', 'study_plans.id', '=', 'study_plan_items.study_plan_id')
            ->where('study_plans.student_id', $this->studentOf('student4')->id)->count());
        $this->assertSame(1, $bdA->fresh()->enrolled_count);
    }

    // ---------- AT-02 ----------

    public function test_at02_parallel_class_session_sequencing(): void
    {
        $bdA = $this->cls('IF201', 'A');
        $bdB = $this->cls('IF201', 'B');
        $this->clearSessions($bdA, $bdB);

        $s1 = $this->createSession('dosen1', $bdA, 'Pertemuan Satu')->assertStatus(201);
        $s2 = $this->createSession('dosen1', $bdA, 'Pertemuan Dua')->assertStatus(201);
        $b1 = $this->createSession('dosen1', $bdB, 'Pertemuan Satu B')->assertStatus(201);

        $this->assertSame(1, $s1->json('data.session_number'));
        $this->assertSame(2, $s2->json('data.session_number'));
        $this->assertSame(1, $b1->json('data.session_number'));
        foreach ([$s1, $s2, $b1] as $r) {
            $this->assertSame('not_opened', $r->json('data.attendance_status'));
        }

        // lecturer of another class forbidden (NFR-01)
        $this->createSession('dosen2', $bdA)->assertStatus(403);
    }

    // ---------- AT-03 ----------

    public function test_at03_attendance_idempotent_cross_class_and_closed(): void
    {
        $bdA = $this->cls('IF201', 'A');
        $this->clearSessions($bdA);
        $sid = $this->createSession('dosen1', $bdA)->assertStatus(201)->json('data.id');
        $this->setStatus('dosen1', $sid, 'open')->assertStatus(200);

        $first = $this->api('POST', "/api/student/sessions/{$sid}/attendances", 'student1')->assertStatus(201);
        $recordedAt = Attendance::where('class_session_id', $sid)->firstOrFail()->recorded_at;
        $second = $this->api('POST', "/api/student/sessions/{$sid}/attendances", 'student1')->assertStatus(200);

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertSame(1, Attendance::where('class_session_id', $sid)->count());
        $this->assertEquals($recordedAt, Attendance::where('class_session_id', $sid)->first()->recorded_at);
        $this->assertSame('present', $first->json('data.status'));

        // non-enrolled student2 (enrolled in BD B only)
        $this->api('GET', "/api/student/classes/{$bdA->id}/sessions", 'student2')->assertStatus(403);
        $this->api('POST', "/api/student/sessions/{$sid}/attendances", 'student2')->assertStatus(403);
        $this->assertSame(1, Attendance::where('class_session_id', $sid)->count());

        // enrolled student1 can list
        $this->api('GET', "/api/student/classes/{$bdA->id}/sessions", 'student1')->assertStatus(200);

        // close, then another enrolled student (student3 after KRS) rejected
        $this->confirmKrs('student3', [$bdA->id])->assertStatus(200);
        $this->setStatus('dosen1', $sid, 'closed')->assertStatus(200);
        $this->api('POST', "/api/student/sessions/{$sid}/attendances", 'student3')
            ->assertStatus(409)->assertJsonPath('error_code', 'ATTENDANCE_SESSION_NOT_OPEN');
        $this->assertSame(1, Attendance::where('class_session_id', $sid)->count());
    }

    // ---------- AT-04 ----------

    public function test_at04_draft_grade_censoring_and_gpa(): void
    {
        $t = $this->transcript('student1');
        $byCode = collect($t['items'])->keyBy('course_code');

        $pbp = $byCode['IF202'];
        $this->assertFalse($pbp['is_published']);
        foreach (['score', 'grade_letter', 'grade_point', 'quality_points', 'published_at'] as $k) {
            $this->assertNull($pbp[$k], "Draft field {$k} must be null (NFR-06)");
        }
        $bd = $byCode['IF201'];
        $this->assertTrue($bd['is_published']);
        $this->assertSame('A', $bd['grade_letter']);
        $this->assertEqualsWithDelta(4.00, $bd['grade_point'], 0.001);
        $this->assertEqualsWithDelta(4.00, $t['summary']['gpa'], 0.001);
        $this->assertSame(3, $t['summary']['total_published_credits']);
        $this->assertSame(7, $t['summary']['total_enrolled_credits']);

        $pbpB = $this->cls('IF202', 'B');
        $this->api('POST', "/api/lecturer/classes/{$pbpB->id}/grades/publish", 'dosen2')->assertStatus(200);

        $t2 = $this->transcript('student1');
        $pbp2 = collect($t2['items'])->firstWhere('course_code', 'IF202');
        $this->assertTrue($pbp2['is_published']);
        $this->assertSame('B', $pbp2['grade_letter']);
        $this->assertEqualsWithDelta(12.0, $pbp2['quality_points'], 0.001);
        $this->assertEqualsWithDelta(3.43, $t2['summary']['gpa'], 0.001);
        $this->assertSame(7, $t2['summary']['total_published_credits']);
    }

    // ---------- AT-05 ----------

    public function test_at05_last_quota_seat(): void
    {
        $jarA = $this->cls('IF203', 'A');
        $this->assertSame(29, $jarA->enrolled_count);
        $this->assertSame(30, $jarA->quota);

        $this->confirmKrs('student3', [$jarA->id])->assertStatus(200);
        $this->assertSame(30, $jarA->fresh()->enrolled_count);

        $this->confirmKrs('student4', [$jarA->id])->assertStatus(409)->assertJsonPath('error_code', 'CLASS_QUOTA_FULL');
        $this->assertSame(30, $jarA->fresh()->enrolled_count);

        // repeated attempts never exceed quota
        for ($i = 0; $i < 3; $i++) {
            $this->confirmKrs('student4', [$jarA->id])->assertStatus(409);
        }
        $this->assertSame(30, $jarA->fresh()->enrolled_count);
        $this->assertSame(1, DB::table('study_plan_items')->where('course_class_id', $jarA->id)->count());
    }

    // ---------- AT-06 ----------

    public function test_at06_deactivated_user_token_revocation_and_login_block(): void
    {
        $token = $this->token('student5');
        $this->api('GET', '/api/student/schedule', null, [], $token)->assertStatus(200);

        $student = $this->studentOf('student5');
        $user = $student->user;
        $this->assertSame(1, DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->count());

        $this->api('PUT', "/api/admin/students/{$student->id}", 'admin', [
            'username' => $user->username,
            'name' => $user->name,
            'student_number' => $student->student_number,
            'study_program' => $student->study_program,
            'cohort_year' => $student->cohort_year,
            'is_active' => false,
        ])->assertStatus(200);

        $this->assertSame(0, DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'user_deactivated', 'entity_id' => $user->id]);

        $old = $this->api('GET', '/api/student/schedule', null, [], $token);
        $this->assertContains($old->getStatusCode(), [401, 403]);

        $this->postJson('/api/auth/login', ['username' => 'student5', 'password' => 'password123'])
            ->assertStatus(403)->assertJsonPath('error_code', 'ACCOUNT_INACTIVE');
    }

    public function test_at06_login_rate_limit(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->app['auth']->forgetGuards();
            $this->postJson('/api/auth/login', ['username' => 'student1', 'password' => 'salah-total'])->assertStatus(401);
        }
        $this->postJson('/api/auth/login', ['username' => 'student1', 'password' => 'salah-total'])
            ->assertStatus(429)->assertJsonPath('success', false)->assertJsonPath('error_code', 'TOO_MANY_REQUESTS');
    }

    // ---------- AT-07 ----------

    private function classPayload(CourseClass $c, array $override = []): array
    {
        return array_merge([
            'semester_id' => $c->semester_id,
            'course_id' => $c->course_id,
            'lecturer_id' => $c->lecturer_id,
            'class_code' => $c->class_code,
            'day_of_week' => $c->day_of_week,
            'start_time' => substr($c->start_time, 0, 5),
            'end_time' => substr($c->end_time, 0, 5),
            'room' => $c->room,
            'quota' => $c->quota,
        ], $override);
    }

    public function test_at07_quota_and_schedule_protection(): void
    {
        $bdA = $this->cls('IF201', 'A');
        $bdA->update(['enrolled_count' => 15]);

        $this->api('PUT', "/api/admin/classes/{$bdA->id}", 'admin', $this->classPayload($bdA, ['quota' => 10]))
            ->assertStatus(409)->assertJsonPath('error_code', 'QUOTA_BELOW_ENROLLED');
        $this->api('PUT', "/api/admin/classes/{$bdA->id}", 'admin', $this->classPayload($bdA, ['day_of_week' => 'Wednesday']))
            ->assertStatus(409)->assertJsonPath('error_code', 'ACTIVE_CLASS_LOCKED');
        $this->api('PUT', "/api/admin/classes/{$bdA->id}", 'admin', $this->classPayload($bdA, ['start_time' => '09:00']))
            ->assertStatus(409)->assertJsonPath('error_code', 'ACTIVE_CLASS_LOCKED');

        $fresh = $bdA->fresh();
        $this->assertSame(30, $fresh->quota);
        $this->assertSame('Monday', $fresh->day_of_week);
        $this->assertSame('08:00', substr($fresh->start_time, 0, 5));

        // quota 0 never accepted (422 validation or 409 conflict)
        $r = $this->api('PUT', "/api/admin/classes/{$bdA->id}", 'admin', $this->classPayload($bdA, ['quota' => 0]));
        $this->assertContains($r->getStatusCode(), [409, 422]);
        $this->assertSame(30, $bdA->fresh()->quota);

        // allowed: raise quota
        $this->api('PUT', "/api/admin/classes/{$bdA->id}", 'admin', $this->classPayload($bdA, ['quota' => 35]))->assertStatus(200);
    }

    public function test_at07_lecturer_and_room_clash(): void
    {
        $bdA = $this->cls('IF201', 'A');       // dosen1, Monday 08:00-10:30, FTI-301
        $bdB = $this->cls('IF201', 'B');       // dosen1, Tuesday 10:00-12:30, FTI-302
        $rpl = $this->cls('IF204', 'A');       // dosen1, Friday, enrolled 0

        // lecturer clash on update (dosen1 already teaches BD A on Monday 08:00-10:30)
        $this->api('PUT', "/api/admin/classes/{$rpl->id}", 'admin', $this->classPayload($rpl, [
            'day_of_week' => 'Monday', 'start_time' => '09:00', 'end_time' => '10:00', 'room' => 'FTI-999',
        ]))->assertStatus(409)->assertJsonPath('error_code', 'SCHEDULE_CONFLICT');

        // room clash on create (dosen2 free on Tuesday, but FTI-302 busy with BD B)
        $dosen2Id = $this->cls('IF202', 'A')->lecturer_id;
        $this->api('POST', '/api/admin/classes', 'admin', $this->classPayload($rpl, [
            'class_code' => 'Z', 'lecturer_id' => $dosen2Id, 'day_of_week' => 'Tuesday',
            'start_time' => '11:00', 'end_time' => '12:00', 'room' => $bdB->room, 'quota' => 20,
        ]))->assertStatus(409)->assertJsonPath('error_code', 'SCHEDULE_CONFLICT');

        // non-conflicting create succeeds
        $this->api('POST', '/api/admin/classes', 'admin', $this->classPayload($rpl, [
            'class_code' => 'Z', 'lecturer_id' => $dosen2Id, 'day_of_week' => 'Saturday',
            'start_time' => '08:00', 'end_time' => '10:00', 'room' => 'FTI-777', 'quota' => 20,
        ]))->assertStatus(201);

        // RBAC: student cannot touch admin endpoints
        $this->api('GET', '/api/admin/classes', 'student1')->assertStatus(403);
        $this->api('GET', '/api/admin/classes')->assertStatus(401);
    }

    // ---------- AT-08 ----------

    public function test_at08_score_priority_incomplete_publish_and_audited_revision(): void
    {
        $rpl = $this->cls('IF204', 'A');
        $this->confirmKrs('student3', [$rpl->id])->assertStatus(200);
        $this->confirmKrs('student4', [$rpl->id])->assertStatus(200);
        $s3 = $this->studentOf('student3')->id;
        $s4 = $this->studentOf('student4')->id;

        // BR-13: score wins over grade_letter
        $res = $this->api('PUT', "/api/lecturer/classes/{$rpl->id}/grades", 'dosen1', [
            'grades' => [['student_id' => $s3, 'score' => 90, 'grade_letter' => 'C']],
        ])->assertStatus(200);
        $g = collect($res->json('data.participants'))->firstWhere('student_id', $s3)['grade'];
        $this->assertSame('A', $g['grade_letter']);
        $this->assertEqualsWithDelta(4.00, $g['grade_point'], 0.001);
        $this->assertFalse($g['is_published']);

        // BR-14: incomplete publish blocked
        $pub = $this->api('POST', "/api/lecturer/classes/{$rpl->id}/grades/publish", 'dosen1')
            ->assertStatus(422)->assertJsonPath('error_code', 'INCOMPLETE_CLASS_GRADES');
        $this->assertSame([$s4], array_column($pub->json('errors.ungraded_students'), 'student_id'));
        $this->assertSame(0, Grade::where('is_published', true)->whereHas('studyPlanItem', fn ($q) => $q->where('course_class_id', $rpl->id))->count());

        // grade both, publish
        $this->api('PUT', "/api/lecturer/classes/{$rpl->id}/grades", 'dosen1', [
            'grades' => [['student_id' => $s4, 'grade_letter' => 'B']],
        ])->assertStatus(200);
        $this->api('POST', "/api/lecturer/classes/{$rpl->id}/grades/publish", 'dosen1')->assertStatus(200);

        // revision w/o reason -> 422, grade unchanged
        $this->api('PUT', "/api/lecturer/classes/{$rpl->id}/grades", 'dosen1', [
            'grades' => [['student_id' => $s4, 'score' => 95]],
        ])->assertStatus(422);
        $this->api('PUT', "/api/lecturer/classes/{$rpl->id}/grades", 'dosen1', [
            'grades' => [['student_id' => $s4, 'score' => 95, 'revision_reason' => 'pendek']],
        ])->assertStatus(422);
        $this->assertSame(0, AuditLog::where('action', 'published_grade_revised')->count());

        // revision with reason -> 200 + audit
        $this->api('PUT', "/api/lecturer/classes/{$rpl->id}/grades", 'dosen1', [
            'grades' => [['student_id' => $s4, 'score' => 95, 'revision_reason' => 'Koreksi kesalahan input nilai akhir']],
        ])->assertStatus(200);
        $this->assertSame(1, AuditLog::where('action', 'published_grade_revised')->count());
        $t = collect($this->transcript('student4')['items'])->firstWhere('course_code', 'IF204');
        $this->assertSame('A', $t['grade_letter']);

        // other lecturer forbidden
        $this->api('PUT', "/api/lecturer/classes/{$rpl->id}/grades", 'dosen2', [
            'grades' => [['student_id' => $s4, 'score' => 10, 'revision_reason' => 'Percobaan tanpa hak akses']],
        ])->assertStatus(403);
    }

    // ---------- AT-09 ----------

    public function test_at09_session_delete_guard_resequence_and_reopen_audit(): void
    {
        $bdA = $this->cls('IF201', 'A');
        $this->clearSessions($bdA);
        $s1 = $this->createSession('dosen1', $bdA, 'Sesi Satu')->json('data.id');
        $s2 = $this->createSession('dosen1', $bdA, 'Sesi Dua')->json('data.id');
        $s3 = $this->createSession('dosen1', $bdA, 'Sesi Tiga')->json('data.id');

        // open -> delete rejected
        $this->setStatus('dosen1', $s1, 'open')->assertStatus(200);
        $this->api('DELETE', "/api/lecturer/sessions/{$s1}", 'dosen1')->assertStatus(409);

        // attendance, close -> delete still rejected
        $this->api('POST', "/api/student/sessions/{$s1}/attendances", 'student1')->assertStatus(201);
        $this->setStatus('dosen1', $s1, 'closed')->assertStatus(200);
        $this->api('DELETE', "/api/lecturer/sessions/{$s1}", 'dosen1')->assertStatus(409);
        $this->assertSame(3, ClassSession::where('course_class_id', $bdA->id)->count());

        // delete not_opened -> 200 and re-sequence
        $this->api('DELETE', "/api/lecturer/sessions/{$s2}", 'dosen1')->assertStatus(200);
        $this->assertNull(ClassSession::find($s2));
        $this->assertSame(1, ClassSession::find($s1)->session_number);
        $this->assertSame(2, ClassSession::find($s3)->session_number);

        // re-open without reason -> 422
        $this->setStatus('dosen1', $s1, 'open')->assertStatus(422);
        $this->assertSame('closed', ClassSession::find($s1)->attendance_status);
        $this->assertSame(0, AuditLog::where('action', 'attendance_session_reopened')->count());

        // with reason -> 200, attendance kept, audit written
        $this->setStatus('dosen1', $s1, 'open', 'Mahasiswa masih ada yang belum presensi')->assertStatus(200);
        $this->assertSame('open', ClassSession::find($s1)->attendance_status);
        $this->assertSame(1, Attendance::where('class_session_id', $s1)->count());
        $this->assertSame(1, AuditLog::where('action', 'attendance_session_reopened')->where('entity_id', $s1)->count());
    }
}
