<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseClass extends Model
{
    use HasFactory;

    protected $fillable = [
        'semester_id',
        'course_id',
        'lecturer_id',
        'class_code',
        'day_of_week',
        'start_time',
        'end_time',
        'room',
        'quota',
        'enrolled_count',
    ];

    protected function casts(): array
    {
        return [
            'quota' => 'integer',
            'enrolled_count' => 'integer',
        ];
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function lecturer(): BelongsTo
    {
        return $this->belongsTo(Lecturer::class);
    }

    public function studyPlanItems(): HasMany
    {
        return $this->hasMany(StudyPlanItem::class);
    }

    public function classSessions(): HasMany
    {
        return $this->hasMany(ClassSession::class);
    }
}
