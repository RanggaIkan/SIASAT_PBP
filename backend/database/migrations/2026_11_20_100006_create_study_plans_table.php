<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('study_plans', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('student_id')->constrained('students')->restrictOnDelete();
            $table->foreignId('semester_id')->constrained('semesters')->restrictOnDelete();
            $table->enum('status', ['draft', 'confirmed'])->default('draft')->index();
            $table->unsignedTinyInteger('total_credits')->default(0);
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'semester_id'], 'sp_student_semester_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('study_plans');
    }
};
