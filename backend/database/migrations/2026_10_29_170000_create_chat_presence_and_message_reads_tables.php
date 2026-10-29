<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Chat Presence and Message Reads tracking.
     */
    public function up(): void
    {
        // 1. Add last_seen_at to users table if not exists
        if (!Schema::hasColumn('users', 'last_seen_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->timestamp('last_seen_at')->nullable()->after('is_active');
            });
        }

        // 2. Create project_message_reads table
        if (!Schema::hasTable('project_message_reads')) {
            Schema::create('project_message_reads', function (Blueprint $table) {
                $table->id();
                $table->foreignId('message_id')->constrained('project_messages')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamp('read_at')->useCurrent();

                $table->unique(['message_id', 'user_id']);
                $table->index(['user_id', 'read_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_message_reads');

        if (Schema::hasColumn('users', 'last_seen_at')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('last_seen_at');
            });
        }
    }
};

