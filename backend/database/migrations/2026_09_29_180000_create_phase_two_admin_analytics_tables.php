<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 2: Super Admin Intelligence & Analytics.
     */
    public function up(): void
    {
        // 1. Teams
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 2. Team User Pivot
        Schema::create('team_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained('teams')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['team_id', 'user_id']);
        });

        // 3. Impersonation Logs
        Schema::create('impersonation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('target_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason', 255)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->dateTime('started_at');
            $table->dateTime('ended_at')->nullable();
            $table->timestamps();

            $table->index(['admin_id', 'target_user_id']);
        });

        // 4. Scheduled Reports
        Schema::create('scheduled_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('report_type', 100); // weekly_digest, monthly_executive, agent_performance
            $table->enum('frequency', ['weekly', 'monthly', 'on_demand'])->default('weekly');
            $table->dateTime('last_generated_at')->nullable();
            $table->string('file_url', 500)->nullable();
            $table->enum('status', ['pending', 'generating', 'ready', 'failed'])->default('pending');
            $table->json('parameters')->nullable();
            $table->timestamps();
        });

        // 5. Activity Log (Immutable Audit Trail)
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('log_name', 100)->nullable()->index();
            $table->text('description');
            $table->string('subject_type', 255)->nullable()->index();
            $table->unsignedBigInteger('subject_id')->nullable()->index();
            $table->string('causer_type', 255)->nullable();
            $table->unsignedBigInteger('causer_id')->nullable()->index();
            $table->json('properties')->nullable();
            $table->timestamp('created_at')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('scheduled_reports');
        Schema::dropIfExists('impersonation_logs');
        Schema::dropIfExists('team_user');
        Schema::dropIfExists('teams');
    }
};
