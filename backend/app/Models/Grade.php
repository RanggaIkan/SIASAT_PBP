<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    use HasFactory;

    protected $fillable = [
        'study_plan_item_id',
        'score',
        'grade_letter',
        'grade_point',
        'is_published',
        'published_at',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'float',
            'grade_point' => 'float',
            'is_published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function studyPlanItem(): BelongsTo
    {
        return $this->belongsTo(StudyPlanItem::class);
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
