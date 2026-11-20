<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_class_id',
        'session_number',
        'session_date',
        'topic',
        'attendance_status',
        'opened_at',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'session_number' => 'integer',
            'session_date' => 'date:Y-m-d',
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function courseClass(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }
}
