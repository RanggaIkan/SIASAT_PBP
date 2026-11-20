<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_sessions', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('course_class_id')->constrained('course_classes')->restrictOnDelete();
            $table->unsignedSmallInteger('session_number');
            $table->date('session_date');
            $table->string('topic', 255);
            $table->enum('attendance_status', ['not_opened', 'open', 'closed'])->default('not_opened')->index();
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->unique(['course_class_id', 'session_number'], 'cs_class_session_num_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_sessions');
    }
};
