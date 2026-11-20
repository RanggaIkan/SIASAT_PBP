<?php

namespace Database\Seeders;

use App\Models\ClassSession;
use App\Models\Course;
use App\Models\CourseClass;
use App\Models\Grade;
use App\Models\Lecturer;
use App\Models\Semester;
use App\Models\Student;
use App\Models\StudyPlan;
use App\Models\StudyPlanItem;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('DemoSeeder cannot be executed in production environment.');
        }

        DB::transaction(function () {
            $now = CarbonImmutable::now('UTC');

            Semester::updateOrCreate(
                ['code' => '20252'],
                [
                    'name' => 'Semester Genap 2025/2026',
                    'is_active' => false,
                    'enrollment_start_at' => CarbonImmutable::create(2026, 1, 15, 0, 0, 0, 'UTC'),
                    'enrollment_end_at' => CarbonImmutable::create(2026, 2, 15, 23, 59, 59, 'UTC'),
                ]
            );

            $activeSemester = Semester::updateOrCreate(
                ['code' => '20261'],
                [
                    'name' => 'Semester Gasal 2026/2027',
                    'is_active' => true,
                    'enrollment_start_at' => $now->subDays(7),
                    'enrollment_end_at' => $now->addDays(30),
                ]
            );

            $demoPassword = Hash::make('password123');

            $dosen1 = $this->seedLecturer('dosen1', 'Dr. Hendra Wijaya', '0612088501', 'Fakultas Teknologi Informasi', $demoPassword);
            $dosen2 = $this->seedLecturer('dosen2', 'Prof. Ratna Sari', '0605047902', 'Fakultas Teknologi Informasi', $demoPassword);

            $student1 = $this->seedStudent('student1', 'Budi Santoso', '672024001', 'Teknik Informatika', 2024, $demoPassword);
            $student2 = $this->seedStudent('student2', 'Siti Aminah', '672024002', 'Teknik Informatika', 2024, $demoPassword);
            $this->seedStudent('student3', 'Andi Pratama', '672024003', 'Teknik Informatika', 2024, $demoPassword);
            $this->seedStudent('student4', 'Dewi Lestari', '672024004', 'Teknik Informatika', 2024, $demoPassword);
            $this->seedStudent('student5', 'Rizky Ramadhan', '672024005', 'Sistem Informasi', 2024, $demoPassword);

            $if201 = Course::updateOrCreate(['course_code' => 'IF201'], ['course_name' => 'Basis Data', 'credits' => 3, 'is_active' => true]);
            $if202 = Course::updateOrCreate(['course_code' => 'IF202'], ['course_name' => 'Pemrograman Berbasis Platform', 'credits' => 4, 'is_active' => true]);
            $if203 = Course::updateOrCreate(['course_code' => 'IF203'], ['course_name' => 'Jaringan Komputer', 'credits' => 3, 'is_active' => true]);
            $if204 = Course::updateOrCreate(['course_code' => 'IF204'], ['course_name' => 'Rekayasa Perangkat Lunak', 'credits' => 3, 'is_active' => true]);

            $basisDataA = $this->seedClass($activeSemester->id, $if201->id, $dosen1->id, 'A', 'Monday', '08:00:00', '10:30:00', 'FTI-301', 30, 1);
            $basisDataB = $this->seedClass($activeSemester->id, $if201->id, $dosen1->id, 'B', 'Tuesday', '10:00:00', '12:30:00', 'FTI-302', 30, 1);
            $this->seedClass($activeSemester->id, $if202->id, $dosen2->id, 'A', 'Monday', '09:00:00', '11:30:00', 'FTI-303', 30, 0);
            $pbpB = $this->seedClass($activeSemester->id, $if202->id, $dosen2->id, 'B', 'Wednesday', '08:00:00', '11:00:00', 'FTI-303', 30, 1);
            $this->seedClass($activeSemester->id, $if203->id, $dosen2->id, 'A', 'Thursday', '13:00:00', '15:30:00', 'FTI-401', 30, 29);
            $this->seedClass($activeSemester->id, $if204->id, $dosen1->id, 'A', 'Friday', '08:00:00', '10:30:00', 'FTI-301', 30, 0);

            $plan1 = StudyPlan::updateOrCreate(
                ['student_id' => $student1->id, 'semester_id' => $activeSemester->id],
                ['status' => 'confirmed', 'total_credits' => 7, 'confirmed_at' => $now]
            );

            $plan1BasisDataA = StudyPlanItem::updateOrCreate(
                ['study_plan_id' => $plan1->id, 'course_id' => $if201->id],
                ['course_class_id' => $basisDataA->id]
            );

            $plan1PbpB = StudyPlanItem::updateOrCreate(
                ['study_plan_id' => $plan1->id, 'course_id' => $if202->id],
                ['course_class_id' => $pbpB->id]
            );

            $plan2 = StudyPlan::updateOrCreate(
                ['student_id' => $student2->id, 'semester_id' => $activeSemester->id],
                ['status' => 'confirmed', 'total_credits' => 3, 'confirmed_at' => $now]
            );

            StudyPlanItem::updateOrCreate(
                ['study_plan_id' => $plan2->id, 'course_id' => $if201->id],
                ['course_class_id' => $basisDataB->id]
            );

            ClassSession::updateOrCreate(
                ['course_class_id' => $basisDataA->id, 'session_number' => 1],
                [
                    'session_date' => $now->toDateString(),
                    'topic' => 'Pengantar Model Relasional & ERD',
                    'attendance_status' => 'open',
                    'opened_at' => $now,
                    'closed_at' => null,
                ]
            );

            ClassSession::updateOrCreate(
                ['course_class_id' => $basisDataA->id, 'session_number' => 2],
                [
                    'session_date' => $now->addDays(7)->toDateString(),
                    'topic' => 'Normalisasi & SQL',
                    'attendance_status' => 'not_opened',
                    'opened_at' => null,
                    'closed_at' => null,
                ]
            );

            ClassSession::updateOrCreate(
                ['course_class_id' => $basisDataB->id, 'session_number' => 1],
                [
                    'session_date' => $now->toDateString(),
                    'topic' => 'Pengantar Model Relasional & ERD',
                    'attendance_status' => 'not_opened',
                    'opened_at' => null,
                    'closed_at' => null,
                ]
            );

            Grade::updateOrCreate(
                ['study_plan_item_id' => $plan1BasisDataA->id],
                [
                    'score' => 88.50,
                    'grade_letter' => 'A',
                    'grade_point' => 4.00,
                    'is_published' => true,
                    'published_at' => $now,
                    'updated_by' => $dosen1->user_id,
                ]
            );

            Grade::updateOrCreate(
                ['study_plan_item_id' => $plan1PbpB->id],
                [
                    'score' => 78.00,
                    'grade_letter' => 'B',
                    'grade_point' => 3.00,
                    'is_published' => false,
                    'published_at' => null,
                    'updated_by' => $dosen2->user_id,
                ]
            );
        });
    }

    private function seedLecturer(
        string $username,
        string $name,
        string $lecturerNumber,
        string $faculty,
        string $hashedPassword
    ): Lecturer {
        $user = User::updateOrCreate(
            ['username' => $username],
            [
                'name' => $name,
                'password' => $hashedPassword,
                'role' => 'lecturer',
                'is_active' => true,
            ]
        );

        return Lecturer::updateOrCreate(
            ['user_id' => $user->id],
            [
                'lecturer_number' => $lecturerNumber,
                'faculty' => $faculty,
            ]
        );
    }

    private function seedStudent(
        string $username,
        string $name,
        string $studentNumber,
        string $studyProgram,
        int $cohortYear,
        string $hashedPassword
    ): Student {
        $user = User::updateOrCreate(
            ['username' => $username],
            [
                'name' => $name,
                'password' => $hashedPassword,
                'role' => 'student',
                'is_active' => true,
            ]
        );

        return Student::updateOrCreate(
            ['user_id' => $user->id],
            [
                'student_number' => $studentNumber,
                'study_program' => $studyProgram,
                'cohort_year' => $cohortYear,
                'max_credits' => 24,
            ]
        );
    }

    private function seedClass(
        int $semesterId,
        int $courseId,
        int $lecturerId,
        string $classCode,
        string $dayOfWeek,
        string $startTime,
        string $endTime,
        string $room,
        int $quota,
        int $enrolledCount
    ): CourseClass {
        return CourseClass::updateOrCreate(
            [
                'semester_id' => $semesterId,
                'course_id' => $courseId,
                'class_code' => $classCode,
            ],
            [
                'lecturer_id' => $lecturerId,
                'day_of_week' => $dayOfWeek,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'room' => $room,
                'quota' => $quota,
                'enrolled_count' => $enrolledCount,
            ]
        );
    }
}
