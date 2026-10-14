<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('email');
            $table->string('avatar', 500)->nullable()->after('phone');
            $table->boolean('is_active')->default(true)->after('avatar');
            // client_id: set when a Client user is created (lead Won conversion)
            $table->unsignedBigInteger('client_id')->nullable()->after('is_active');
            // hourly_rate: used for project budget tracking (developers)
            $table->decimal('hourly_rate', 8, 2)->default(0)->after('client_id');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn(['phone', 'avatar', 'is_active', 'client_id', 'hourly_rate']);
        });
    }
};
