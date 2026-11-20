<?php

namespace App\Policies;

use App\Models\CourseClass;
use App\Models\StudyPlanItem;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class CourseClassPolicy
{
    /**
     * Determine whether the lecturer owns and can manage the course class.
     */
    public function manage(User $user, CourseClass $courseClass): Response
    {
        if ($user->role === 'lecturer' && $user->lecturer !== null && (int) $courseClass->lecturer_id === (int) $user->lecturer->id) {
            return Response::allow();
        }

        return Response::deny('Akses ditolak. Anda tidak mengampu kelas ini.');
    }

    /**
     * Determine whether the user (lecturer owner, enrolled student, or admin) can view the course class.
     */
    public function view(User $user, CourseClass $courseClass): Response
    {
        if ($user->role === 'admin') {
            return Response::allow();
        }

        if ($user->role === 'lecturer') {
            return $this->manage($user, $courseClass);
        }

        return $this->viewAsStudent($user, $courseClass);
    }

    /**
     * Determine whether the student is enrolled in a confirmed study plan for this class.
     */
    public function viewAsStudent(User $user, CourseClass $courseClass): Response
    {
        if ($user->role === 'student' && $user->student !== null) {
            $enrolled = StudyPlanItem::query()
                ->where('course_class_id', $courseClass->id)
                ->whereHas('studyPlan', function ($query) use ($user) {
                    $query->where('student_id', $user->student->id)
                        ->where('status', 'confirmed');
                })
                ->exists();

            if ($enrolled) {
                return Response::allow();
            }
        }

        $courseName = $courseClass->course?->course_name ?? 'tersebut';
        $classCode = $courseClass->class_code ?? '';

        return Response::deny(trim("Akses ditolak. Anda tidak terdaftar sebagai peserta pada kelas {$courseName} {$classCode}."));
    }
}
