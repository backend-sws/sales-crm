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
            DB::statement("ALTER TABLE client_services MODIFY COLUMN service_type VARCHAR(50) NOT NULL DEFAULT 'recurring'");
        } else {
            Schema::table('client_services', function (Blueprint $table) {
                $table->string('service_type', 50)->default('recurring')->change();
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
            DB::statement("ALTER TABLE client_services MODIFY COLUMN service_type ENUM('recurring', 'one_time', 'software_project') NOT NULL DEFAULT 'recurring'");
        }
    }
};
