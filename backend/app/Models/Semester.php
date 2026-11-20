<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Semester extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'is_active',
        'enrollment_start_at',
        'enrollment_end_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'enrollment_start_at' => 'datetime',
            'enrollment_end_at' => 'datetime',
        ];
    }

    public function courseClasses(): HasMany
    {
        return $this->hasMany(CourseClass::class);
    }

    public function studyPlans(): HasMany
    {
        return $this->hasMany(StudyPlan::class);
    }
}
