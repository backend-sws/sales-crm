<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tasks') && !Schema::hasColumn('tasks', 'service_request_id')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->foreignId('service_request_id')
                    ->nullable()
                    ->after('source_id')
                    ->constrained('service_requests')
                    ->nullOnDelete();
            });
        }

        if (Schema::hasTable('service_requests') && !Schema::hasColumn('service_requests', 'task_id')) {
            Schema::table('service_requests', function (Blueprint $table) {
                $table->foreignId('task_id')
                    ->nullable()
                    ->after('assigned_to')
                    ->constrained('tasks')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('service_requests') && Schema::hasColumn('service_requests', 'task_id')) {
            Schema::table('service_requests', function (Blueprint $table) {
                $table->dropConstrainedForeignId('task_id');
            });
        }

        if (Schema::hasTable('tasks') && Schema::hasColumn('tasks', 'service_request_id')) {
            Schema::table('tasks', function (Blueprint $table) {
                $table->dropConstrainedForeignId('service_request_id');
            });
        }
    }
};

