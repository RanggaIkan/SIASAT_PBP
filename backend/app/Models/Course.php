<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_code',
        'course_name',
        'credits',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'credits' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function courseClasses(): HasMany
    {
        return $this->hasMany(CourseClass::class);
    }

    public function studyPlanItems(): HasMany
    {
        return $this->hasMany(StudyPlanItem::class);
    }
}
