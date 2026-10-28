<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_meetings', function (Blueprint $table) {
            if (!Schema::hasColumn('project_meetings', 'is_disputed')) {
                $table->boolean('is_disputed')->default(false)->after('is_auto_accepted');
            }
            if (!Schema::hasColumn('project_meetings', 'dispute_reason')) {
                $table->text('dispute_reason')->nullable()->after('is_disputed');
            }
            if (!Schema::hasColumn('project_meetings', 'client_confirmed_at')) {
                $table->datetime('client_confirmed_at')->nullable()->after('auto_accepted_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('project_meetings', function (Blueprint $table) {
            $table->dropColumn(['is_disputed', 'dispute_reason', 'client_confirmed_at']);
        });
    }
};
