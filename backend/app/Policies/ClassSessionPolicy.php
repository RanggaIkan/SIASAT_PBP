<?php

namespace App\Policies;

use App\Models\ClassSession;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ClassSessionPolicy
{
    public function __construct(
        private readonly CourseClassPolicy $courseClassPolicy
    ) {}

    /**
     * Determine whether the lecturer owns the parent course class of this session.
     */
    public function manage(User $user, ClassSession $classSession): Response
    {
        $classSession->loadMissing('courseClass.course');

        return $this->courseClassPolicy->manage($user, $classSession->courseClass);
    }

    /**
     * Determine whether the student is enrolled in the parent course class of this session.
     */
    public function viewAsStudent(User $user, ClassSession $classSession): Response
    {
        $classSession->loadMissing('courseClass.course');

        return $this->courseClassPolicy->viewAsStudent($user, $classSession->courseClass);
    }
}
