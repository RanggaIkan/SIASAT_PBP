<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('class_session_id')->constrained('class_sessions')->restrictOnDelete();
            $table->foreignId('student_id')->constrained('students')->restrictOnDelete();
            $table->enum('status', ['present', 'excused', 'sick', 'absent']);
            $table->timestamp('recorded_at');
            $table->string('notes', 255)->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['class_session_id', 'student_id'], 'att_session_student_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
