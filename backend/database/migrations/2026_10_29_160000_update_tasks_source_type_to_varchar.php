<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE tasks MODIFY COLUMN source_type VARCHAR(50) NULL DEFAULT 'ad_hoc'");
        } else {
            Schema::table('tasks', function (Blueprint $table) {
                $table->string('source_type', 50)->nullable()->default('ad_hoc')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE tasks MODIFY COLUMN source_type ENUM('scope', 'change_request', 'meeting_action', 'ad_hoc') NULL DEFAULT 'ad_hoc'");
        }
    }
};

