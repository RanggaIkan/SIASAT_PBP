<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grades', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->id();
            $table->foreignId('study_plan_item_id')->unique()->constrained('study_plan_items')->restrictOnDelete();
            $table->decimal('score', 5, 2)->nullable();
            $table->enum('grade_letter', ['A', 'AB', 'B', 'BC', 'C', 'D', 'E']);
            $table->decimal('grade_point', 3, 2);
            $table->boolean('is_published')->default(false)->index();
            $table->timestamp('published_at')->nullable();
            $table->foreignId('updated_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};
