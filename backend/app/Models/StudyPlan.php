<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudyPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'semester_id',
        'status',
        'total_credits',
        'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'total_credits' => 'integer',
            'confirmed_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(StudyPlanItem::class);
    }

    public function studyPlanItems(): HasMany
    {
        return $this->hasMany(StudyPlanItem::class);
    }
}
