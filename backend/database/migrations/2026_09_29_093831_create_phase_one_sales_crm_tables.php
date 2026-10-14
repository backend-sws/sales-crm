<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 1: Sales CRM Core.
     */
    public function up(): void
    {
        // 1. Lead Sources
        Schema::create('lead_sources', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. Products / Offerings
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150)->unique();
            $table->enum('type', ['software', 'service', 'product'])->default('service');
            $table->string('price_range', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 3. Lead Imports (for Excel / CSV bulk ingest)
        Schema::create('lead_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('filename', 255);
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('processed_rows')->default(0);
            $table->unsignedInteger('imported_count')->default(0);
            $table->unsignedInteger('duplicate_count')->default(0);
            $table->unsignedInteger('error_count')->default(0);
            $table->string('status', 30)->default('pending'); // pending, processing, completed, failed
            $table->json('error_log')->nullable();
            $table->timestamps();
        });

        // 4. Upgrade existing leads table with Phase 1 fields
        Schema::table('leads', function (Blueprint $table) {
            $table->string('alt_phone', 50)->nullable()->after('phone');
            $table->string('city', 100)->nullable()->after('company');
            $table->foreignId('source_id')->nullable()->after('source')->constrained('lead_sources')->nullOnDelete();
            $table->string('priority', 20)->default('warm')->index()->after('source_id'); // hot, warm, cold
            $table->string('status', 50)->default('new')->change();
            $table->unsignedSmallInteger('score')->default(0)->index()->after('status');
            $table->decimal('budget', 12, 2)->default(0)->after('score');
            $table->string('lost_reason', 255)->nullable()->after('budget');
            $table->text('lost_notes')->nullable()->after('lost_reason');
            $table->unsignedBigInteger('converted_client_id')->nullable()->after('lost_notes');
            $table->foreignId('import_id')->nullable()->after('converted_client_id')->constrained('lead_imports')->nullOnDelete();
            $table->foreignId('master_lead_id')->nullable()->after('import_id')->constrained('leads')->nullOnDelete();
            $table->dateTime('last_activity_at')->nullable()->index()->after('master_lead_id');
            $table->foreignId('created_by')->nullable()->after('last_activity_at')->constrained('users')->nullOnDelete();
            $table->softDeletes()->after('updated_at');

            // Add indexes for search performance
            $table->index('name');
            $table->index('email');
            $table->index('phone');
            $table->index('status');
        });

        // 5. Lead Products Pivot
        Schema::create('lead_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['lead_id', 'product_id']);
        });

        // 6. Follow-ups
        Schema::create('follow_ups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 30); // call, whatsapp, email, meeting
            $table->dateTime('scheduled_at')->index();
            $table->string('status', 30)->default('pending')->index(); // pending, done, missed, rescheduled
            $table->text('outcome')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->foreignId('next_follow_up_id')->nullable()->constrained('follow_ups')->nullOnDelete();
            $table->timestamps();
        });

        // 7. Lead Activity Timeline
        Schema::create('lead_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 50)->index(); // created, assigned, status_change, follow_up, note, score_change, merged
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->index();
        });

        // 8. Lead Merge Logs
        Schema::create('lead_merge_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('master_lead_id')->constrained('leads')->cascadeOnDelete();
            $table->unsignedBigInteger('merged_lead_id')->index();
            $table->foreignId('merged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('merged_data_snapshot');
            $table->timestamps();
        });

        // 9. Notification Logs
        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->string('notifiable_type', 255);
            $table->unsignedBigInteger('notifiable_id');
            $table->string('channel', 30); // email, whatsapp, database, push
            $table->string('type', 100);
            $table->json('payload')->nullable();
            $table->string('status', 30)->default('sent');
            $table->dateTime('sent_at')->nullable();
            $table->timestamps();

            $table->index(['notifiable_type', 'notifiable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
        Schema::dropIfExists('lead_merge_logs');
        Schema::dropIfExists('lead_activities');
        Schema::dropIfExists('follow_ups');
        Schema::dropIfExists('lead_products');

        Schema::table('leads', function (Blueprint $table) {
            $table->dropForeign(['source_id']);
            $table->dropForeign(['import_id']);
            $table->dropForeign(['master_lead_id']);
            $table->dropForeign(['created_by']);

            $table->dropColumn([
                'alt_phone',
                'city',
                'source_id',
                'priority',
                'score',
                'budget',
                'lost_reason',
                'lost_notes',
                'converted_client_id',
                'import_id',
                'master_lead_id',
                'last_activity_at',
                'created_by',
                'deleted_at',
            ]);
        });

        Schema::dropIfExists('lead_imports');
        Schema::dropIfExists('products');
        Schema::dropIfExists('lead_sources');
    }
};
