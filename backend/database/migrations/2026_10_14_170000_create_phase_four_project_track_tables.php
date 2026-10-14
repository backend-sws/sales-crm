<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 4: Project Track, Scope Governance, Sprints & Time Tracking.
     */
    public function up(): void
    {
        // 1. Projects
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('client_service_id')->nullable()->constrained('client_services')->nullOnDelete();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->enum('status', [
                'draft',
                'scope_approved',
                'in_dev',
                'client_review',
                'on_hold',
                'completed',
                'closed'
            ])->default('draft');
            $table->foreignId('pm_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('start_date')->nullable();
            $table->date('target_end_date')->nullable();
            $table->decimal('total_value', 12, 2)->default(0);
            $table->decimal('total_budget', 12, 2)->default(0);
            $table->tinyInteger('sprint_duration_days')->default(14);
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Project Milestones
        Schema::create('project_milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->decimal('amount', 12, 2)->default(0);
            $table->date('due_date')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed', 'invoiced'])->default('pending');
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();
        });

        // 3. Scope Versions
        Schema::create('scope_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->integer('version_number')->default(1);
            $table->longText('document_body');
            $table->string('pdf_snapshot_url', 500)->nullable();
            $table->foreignId('diff_from_version_id')->nullable()->constrained('scope_versions')->nullOnDelete();
            $table->boolean('is_baseline')->default(false);
            $table->enum('status', ['draft', 'pending_approval', 'approved', 'superseded'])->default('draft');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 4. Scope Approvals (Legal Audit Trail)
        Schema::create('scope_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scope_version_id')->constrained('scope_versions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('signer_name', 255);
            $table->longText('signature_data');
            $table->enum('signature_type', ['drawn', 'typed'])->default('drawn');
            $table->string('ip_address', 50)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->dateTime('approved_at');
            $table->timestamps();
        });

        // 5. Change Requests
        Schema::create('change_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title', 255);
            $table->longText('description');
            $table->decimal('estimated_hours', 6, 2)->default(0);
            $table->decimal('additional_cost', 12, 2)->default(0);
            $table->smallInteger('timeline_delay_days')->default(0);
            $table->enum('status', ['submitted', 'approved', 'rejected', 'implemented'])->default('submitted');
            $table->text('decision_notes')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('client_decision_at')->nullable();
            $table->timestamps();
        });

        // 6. Project Meetings & MoM
        Schema::create('project_meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('title', 255);
            $table->text('agenda')->nullable();
            $table->longText('mom_body')->nullable();
            $table->string('recording_url', 500)->nullable();
            $table->dateTime('scheduled_at');
            $table->enum('status', ['scheduled', 'completed', 'cancelled'])->default('scheduled');
            $table->boolean('is_auto_accepted')->default(false);
            $table->dateTime('auto_accepted_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 7. Meeting Action Items
        Schema::create('meeting_action_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained('project_meetings')->cascadeOnDelete();
            $table->string('title', 255);
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->unsignedBigInteger('converted_task_id')->nullable();
            $table->timestamps();
        });

        // 8. Sprints
        Schema::create('sprints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('goal', 255)->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('velocity_target', 6, 2)->nullable();
            $table->decimal('velocity_achieved', 6, 2)->nullable();
            $table->text('retrospective_notes')->nullable();
            $table->enum('status', ['planned', 'active', 'completed'])->default('planned');
            $table->timestamps();
        });

        // 9. Tasks (Kanban)
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('sprint_id')->nullable()->constrained('sprints')->nullOnDelete();
            $table->foreignId('milestone_id')->nullable()->constrained('project_milestones')->nullOnDelete();
            $table->enum('source_type', ['scope', 'change_request', 'meeting_action', 'ad_hoc'])->default('ad_hoc');
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('title', 255);
            $table->longText('description')->nullable();
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['backlog', 'in_progress', 'qa', 'client_review', 'done'])->default('backlog');
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
            $table->enum('complexity', ['easy', 'medium', 'hard'])->default('medium');
            $table->tinyInteger('story_points')->nullable();
            $table->decimal('estimated_hours', 6, 2)->nullable();
            $table->date('due_date')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->smallInteger('rework_count')->default(0);
            $table->boolean('is_proof_attached')->default(false);
            $table->tinyInteger('client_rating')->nullable();
            $table->text('client_feedback')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 10. Task Dependencies
        Schema::create('task_dependencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('depends_on_task_id')->constrained('tasks')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['task_id', 'depends_on_task_id']);
        });

        // 11. Task Attachments & Proof of Work
        Schema::create('task_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('file_path', 500)->nullable();
            $table->string('file_name', 255);
            $table->string('file_type', 50)->nullable();
            $table->string('url', 500)->nullable();
            $table->boolean('is_proof')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 12. Time Entries (Stopwatch timer & worklogs)
        Schema::create('time_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('started_at');
            $table->dateTime('ended_at')->nullable();
            $table->integer('duration_minutes')->default(0);
            $table->boolean('is_billable')->default(true);
            $table->string('description', 500)->nullable();
            $table->timestamps();
        });

        // 13. Update invoices table with project_id and milestone_id
        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                if (!Schema::hasColumn('invoices', 'project_id')) {
                    $table->foreignId('project_id')->nullable()->after('client_service_id')->constrained('projects')->nullOnDelete();
                }
                if (!Schema::hasColumn('invoices', 'milestone_id')) {
                    $table->foreignId('milestone_id')->nullable()->after('project_id')->constrained('project_milestones')->nullOnDelete();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                if (Schema::hasColumn('invoices', 'milestone_id')) {
                    $table->dropConstrainedForeignId('milestone_id');
                }
                if (Schema::hasColumn('invoices', 'project_id')) {
                    $table->dropConstrainedForeignId('project_id');
                }
            });
        }

        Schema::dropIfExists('time_entries');
        Schema::dropIfExists('task_attachments');
        Schema::dropIfExists('task_dependencies');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('sprints');
        Schema::dropIfExists('meeting_action_items');
        Schema::dropIfExists('project_meetings');
        Schema::dropIfExists('change_requests');
        Schema::dropIfExists('scope_approvals');
        Schema::dropIfExists('scope_versions');
        Schema::dropIfExists('project_milestones');
        Schema::dropIfExists('projects');
    }
};
