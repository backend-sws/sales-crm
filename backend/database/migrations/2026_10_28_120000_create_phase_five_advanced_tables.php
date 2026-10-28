<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 5:
     * - GitHub Repository & Commit / PR Tracking
     * - Slack-grade Project Channels & Messages with Attachments & Reactions
     * - Multi-level Feedback & Developer Performance Scores
     */
    public function up(): void
    {
        // 1. GitHub Repositories
        Schema::create('github_repos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('repo_full_name'); // e.g. 'owner/repo-name'
            $table->string('webhook_secret');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. GitHub Commits linked to Tasks & Users
        Schema::create('github_commits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('repo_id')->constrained('github_repos')->cascadeOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('sha', 40);
            $table->string('author_github', 100);
            $table->string('author_name', 100);
            $table->text('message');
            $table->integer('additions')->default(0);
            $table->integer('deletions')->default(0);
            $table->timestamp('committed_at');
            $table->timestamps();

            $table->index(['repo_id', 'committed_at']);
        });

        // 3. GitHub Pull Requests
        Schema::create('github_pull_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('repo_id')->constrained('github_repos')->cascadeOnDelete();
            $table->integer('pr_number');
            $table->string('title');
            $table->string('author');
            $table->string('state')->default('open'); // open, closed, merged
            $table->timestamp('merged_at')->nullable();
            $table->timestamps();

            $table->index(['repo_id', 'pr_number']);
        });

        // 4. Project Chat Channels (e.g. #general, #internal-notes)
        Schema::create('project_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name', 100); // 'general', 'internal-notes'
            $table->boolean('is_internal')->default(false);
            $table->string('topic')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'name']);
        });

        // 5. Project Messages (Slack-grade formatting)
        Schema::create('project_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('channel_id')->constrained('project_channels')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('project_messages')->cascadeOnDelete();
            $table->text('content');
            $table->text('code_snippet')->nullable();
            $table->string('code_language', 50)->nullable();
            $table->boolean('is_internal')->default(false);
            $table->timestamps();

            $table->index(['channel_id', 'created_at']);
        });

        // 6. Message Attachments (Presigned uploads: images, files, docs)
        Schema::create('message_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('project_messages')->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_url', 500);
            $table->string('file_type', 100);
            $table->unsignedBigInteger('file_size_bytes')->default(0);
            $table->timestamps();
        });

        // 7. Message Emoji Reactions
        Schema::create('message_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('project_messages')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('emoji', 20);
            $table->timestamps();

            $table->unique(['message_id', 'user_id', 'emoji']);
        });

        // 8. Multi-level Feedback & Reviews
        Schema::create('feedback_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->foreignId('milestone_id')->nullable()->constrained('project_milestones')->nullOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('developer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('client_user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('rating', 3, 2)->default(5.00);
            $table->integer('quality')->default(5);
            $table->integer('communication')->default(5);
            $table->integer('timeliness')->default(5);
            $table->integer('understanding')->default(5);
            $table->boolean('would_work_again')->default(true);
            $table->text('comment')->nullable();
            $table->boolean('is_excluded')->default(false);
            $table->text('exclusion_reason')->nullable();
            $table->timestamps();

            $table->index(['developer_id', 'rating']);
        });

        // 9. Developer Monthly Performance Scores
        Schema::create('performance_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('developer_id')->constrained('users')->cascadeOnDelete();
            $table->string('period', 7); // YYYY-MM
            $table->decimal('final_score', 5, 2)->default(0.00);
            $table->decimal('client_score', 5, 2)->default(0.00);
            $table->decimal('ontime_score', 5, 2)->default(0.00);
            $table->decimal('rework_score', 5, 2)->default(0.00);
            $table->decimal('pm_score', 5, 2)->default(0.00);
            $table->decimal('estimate_score', 5, 2)->default(0.00);
            $table->integer('sample_size')->default(0);
            $table->json('breakdown_json')->nullable();
            $table->timestamps();

            $table->unique(['developer_id', 'period']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('performance_scores');
        Schema::dropIfExists('feedback_responses');
        Schema::dropIfExists('message_reactions');
        Schema::dropIfExists('message_attachments');
        Schema::dropIfExists('project_messages');
        Schema::dropIfExists('project_channels');
        Schema::dropIfExists('github_pull_requests');
        Schema::dropIfExists('github_commits');
        Schema::dropIfExists('github_repos');
    }
};
