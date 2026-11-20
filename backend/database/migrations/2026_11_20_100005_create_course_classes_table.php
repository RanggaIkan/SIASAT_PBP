<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_classes', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('semester_id')->constrained('semesters')->restrictOnDelete();
            $table->foreignId('course_id')->constrained('courses')->restrictOnDelete();
            $table->foreignId('lecturer_id')->constrained('lecturers')->restrictOnDelete();
            $table->string('class_code', 10);
            $table->enum('day_of_week', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
            $table->time('start_time');
            $table->time('end_time');
            $table->string('room', 50);
            $table->unsignedSmallInteger('quota');
            $table->unsignedSmallInteger('enrolled_count')->default(0);
            $table->timestamps();

            $table->unique(['semester_id', 'course_id', 'class_code'], 'cc_sem_course_code_unique');
            $table->index(['semester_id', 'lecturer_id', 'day_of_week'], 'cc_sem_lec_day_index');
            $table->index(['semester_id', 'room', 'day_of_week'], 'cc_sem_room_day_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_classes');
    }
};
