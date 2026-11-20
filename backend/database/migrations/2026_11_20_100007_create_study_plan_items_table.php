<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('study_plan_items', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('study_plan_id')->constrained('study_plans')->cascadeOnDelete();
            $table->foreignId('course_class_id')->constrained('course_classes')->restrictOnDelete();
            $table->foreignId('course_id')->constrained('courses')->restrictOnDelete();
            $table->timestamps();

            $table->unique(['study_plan_id', 'course_class_id'], 'spi_plan_class_unique');
            $table->unique(['study_plan_id', 'course_id'], 'spi_plan_course_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('study_plan_items');
    }
};
