<?php

namespace App\Policies;

use App\Models\StudyPlan;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class StudyPlanPolicy
{
    public function view(User $user, StudyPlan $studyPlan): Response
    {
        if ($user->role === 'student' && $user->student?->id === $studyPlan->student_id) {
            return Response::allow();
        }

        return Response::deny('Anda tidak memiliki izin untuk mengakses KRS mahasiswa lain.', 'FORBIDDEN');
    }

    public function update(User $user, StudyPlan $studyPlan): Response
    {
        if ($user->role === 'student' && $user->student?->id === $studyPlan->student_id) {
            return Response::allow();
        }

        return Response::deny('Anda tidak memiliki izin untuk mengubah KRS mahasiswa lain.', 'FORBIDDEN');
    }
}
