<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ticket History
        Schema::create('ticket_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
            $table->string('action', 255);
            $table->string('user', 255)->nullable();
            $table->string('user_id', 128)->nullable();
            $table->timestamp('timestamp')->useCurrent();
            $table->text('details')->nullable();
            $table->index('ticket_id');
            $table->index('timestamp');
        });

        // Ticket Activities (Unified Timeline)
        Schema::create('ticket_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
            $table->string('activity_type', 50);
            $table->string('visibility_type', 50);
            $table->string('channel', 50)->default('portal');
            $table->string('message_id', 255)->nullable();
            $table->string('thread_id', 255)->nullable();
            $table->string('created_by', 128)->nullable();
            $table->string('created_by_name', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->text('message');
            $table->json('metadata_json')->nullable();
            $table->index('ticket_id');
            $table->index('created_at');
            $table->index('visibility_type');
            $table->index('message_id');
        });

        // Comments (legacy compatibility)
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
            $table->string('user_id', 128)->nullable();
            $table->string('user_name', 255)->nullable();
            $table->string('user_role', 50)->nullable();
            $table->text('message');
            $table->boolean('is_internal')->default(false);
            $table->timestamps();
            $table->index('ticket_id');
            $table->index('user_id');
        });

        // Notifications Queue (OmniChannel outbound)
        Schema::create('notifications_queue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->nullable()->constrained()->nullOnDelete();
            $table->string('recipient', 255);
            $table->string('channel', 50);
            $table->string('subject', 255)->nullable();
            $table->text('body');
            $table->string('status', 50)->default('pending');
            $table->integer('retry_count')->default(0);
            $table->text('last_error')->nullable();
            $table->timestamps();
            $table->timestamp('sent_at')->nullable();
            $table->index('status');
        });

        // SLA Policies
        Schema::create('sla_policies', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('priority', 50);
            $table->string('category', 100)->nullable();
            $table->integer('response_time_hours');
            $table->integer('resolution_time_hours');
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
            $table->index('priority');
            $table->index('category');
            $table->unique(['priority', 'category']);
        });

        // Approvals
        Schema::create('approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('Pending');
            $table->string('requested_by', 128);
            $table->string('requested_by_name', 255)->nullable();
            $table->string('approved_by', 128)->nullable();
            $table->string('approved_by_name', 255)->nullable();
            $table->text('comments')->nullable();
            $table->timestamps();
            $table->timestamp('approved_at')->nullable();
            $table->index('status');
        });

        // Assets / CMDB
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('type', 50)->default('Hardware');
            $table->string('status', 50)->default('Operational');
            $table->string('owner', 128)->nullable();
            $table->string('owner_name', 255)->nullable();
            $table->string('location', 255)->nullable();
            $table->string('serial_number', 255)->nullable();
            $table->string('model', 255)->nullable();
            $table->string('manufacturer', 255)->nullable();
            $table->date('purchase_date')->nullable();
            $table->date('warranty_expiry')->nullable();
            $table->string('ip_address', 50)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
            $table->index('type');
            $table->index('status');
        });

        // Problems
        Schema::create('problems', function (Blueprint $table) {
            $table->id();
            $table->string('problem_number', 50)->unique();
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->string('status', 30)->default('Open');
            $table->string('priority', 20)->default('4 - Low');
            $table->string('category', 100)->nullable();
            $table->text('root_cause')->nullable();
            $table->text('workaround')->nullable();
            $table->text('resolution')->nullable();
            $table->string('assigned_to', 128)->nullable();
            $table->string('assigned_to_name', 255)->nullable();
            $table->string('reported_by', 128)->nullable();
            $table->string('reported_by_name', 255)->nullable();
            $table->integer('related_incidents')->default(0);
            $table->timestamps();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->index('status');
            $table->index('priority');
        });

        // Changes
        Schema::create('changes', function (Blueprint $table) {
            $table->id();
            $table->string('change_number', 50)->unique();
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->string('type', 20)->default('Normal');
            $table->string('state', 30)->default('Draft');
            $table->string('risk', 20)->default('Low');
            $table->text('impact')->nullable();
            $table->text('rollback_plan')->nullable();
            $table->string('requester', 128);
            $table->string('requester_name', 255)->nullable();
            $table->string('assigned_to', 128)->nullable();
            $table->string('assigned_to_name', 255)->nullable();
            $table->timestamp('planned_start_date')->nullable();
            $table->timestamp('planned_end_date')->nullable();
            $table->timestamp('actual_start_date')->nullable();
            $table->timestamp('actual_end_date')->nullable();
            $table->string('category', 100)->nullable();
            $table->text('affected_services')->nullable();
            $table->string('approval_status', 20)->default('Not Required');
            $table->timestamps();
            $table->index('state');
            $table->index('type');
        });

        // Knowledge Articles
        Schema::create('knowledge_articles', function (Blueprint $table) {
            $table->id();
            $table->string('article_number', 50)->unique();
            $table->string('title', 500);
            $table->string('category', 100)->nullable();
            $table->string('subcategory', 100)->nullable();
            $table->text('content');
            $table->text('summary')->nullable();
            $table->text('tags')->nullable();
            $table->integer('views')->default(0);
            $table->decimal('rating', 2, 1)->default(0);
            $table->integer('rating_count')->default(0);
            $table->integer('helpful_count')->default(0);
            $table->integer('not_helpful_count')->default(0);
            $table->string('author', 128);
            $table->string('author_name', 255)->nullable();
            $table->string('reviewer', 128)->nullable();
            $table->string('reviewer_name', 255)->nullable();
            $table->string('status', 20)->default('Draft');
            $table->string('visibility', 20)->default('Internal');
            $table->integer('version')->default(1);
            $table->timestamps();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            
            if (config('database.default') === 'mysql') {
                $table->fullText(['title', 'content', 'summary']);
            }
        });

        // Notifications (in-app)
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 128);
            $table->string('type', 50)->default('system');
            $table->string('title', 255);
            $table->text('message')->nullable();
            $table->foreignId('related_ticket_id')->nullable()->constrained('tickets')->nullOnDelete();
            $table->string('related_entity_type', 50)->nullable();
            $table->string('related_entity_id', 50)->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'is_read']);
            $table->index('type');
        });

        // Audit Log
        Schema::create('audit_log', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('entity_type', 50);
            $table->string('entity_id', 50);
            $table->string('action', 50);
            $table->string('user_id', 128)->nullable();
            $table->string('user_name', 255)->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 50)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['entity_type', 'entity_id']);
            $table->index('user_id');
            $table->index('action');
        });

        // System Settings
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('setting_key', 100)->unique();
            $table->text('setting_value')->nullable();
            $table->string('setting_type', 20)->default('string');
            $table->text('description')->nullable();
            $table->string('updated_by', 128)->nullable();
            $table->timestamp('updated_at')->useCurrent();
        });

        // Timesheets
        Schema::create('timesheets', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 128);
            $table->date('week_start');
            $table->date('week_end');
            $table->string('status', 20)->default('Draft');
            $table->decimal('total_hours', 10, 2)->default(0);
            $table->timestamps();
            $table->timestamp('submitted_at')->nullable();
            $table->index(['user_id', 'week_start']);
            $table->index('status');
        });

        // Time Cards
        Schema::create('time_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('timesheet_id')->constrained()->cascadeOnDelete();
            $table->string('user_id', 128);
            $table->date('entry_date');
            $table->string('task', 255)->nullable();
            $table->decimal('hours_worked', 10, 2)->default(0);
            $table->text('description')->nullable();
            $table->string('short_description', 255)->nullable();
            $table->string('start_time', 20)->nullable();
            $table->string('end_time', 20)->nullable();
            $table->decimal('deduct', 10, 2)->default(0);
            $table->string('work_type', 50)->nullable();
            $table->string('billable', 50)->nullable();
            $table->string('status', 20)->default('Draft');
            $table->integer('elapsed_seconds')->default(0);
            $table->timestamps();
            $table->index(['user_id', 'entry_date']);
        });

        // Work Sessions (AI-tracked)
        Schema::create('work_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 128);
            $table->string('user_name', 255)->nullable();
            $table->string('ticket_id', 128)->nullable();
            $table->string('ticket_number', 50)->nullable();
            $table->timestamp('start_time');
            $table->timestamp('stop_time')->nullable();
            $table->integer('duration')->default(0);
            $table->text('start_context')->nullable();
            $table->text('stop_context')->nullable();
            $table->text('ai_notes_start')->nullable();
            $table->text('ai_notes_stop')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
            $table->index('user_id');
        });

        // Work Notes (AI-generated)
        Schema::create('work_notes', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 128);
            $table->string('user_name', 255)->nullable();
            $table->string('ticket_id', 128)->nullable();
            $table->string('ticket_number', 50)->nullable();
            $table->string('session_id', 128)->nullable();
            $table->string('note_type', 10);
            $table->text('screenshot_url')->nullable();
            $table->string('screenshot_filename', 255)->nullable();
            $table->string('screenshot_format', 10)->nullable();
            $table->integer('screenshot_size_kb')->nullable();
            $table->text('ai_note')->nullable();
            $table->integer('duration_seconds')->nullable();
            $table->string('duration_display', 50)->nullable();
            $table->timestamps();
            $table->index('user_id');
        });

        // Message History
        Schema::create('message_history', function (Blueprint $table) {
            $table->id();
            $table->string('user_id', 128);
            $table->string('user_name', 255)->nullable();
            $table->string('message_type', 50);
            $table->string('recipient', 255)->nullable();
            $table->text('message_content')->nullable();
            $table->timestamp('sent_at')->useCurrent();
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_history');
        Schema::dropIfExists('work_notes');
        Schema::dropIfExists('work_sessions');
        Schema::dropIfExists('time_cards');
        Schema::dropIfExists('timesheets');
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('audit_log');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('knowledge_articles');
        Schema::dropIfExists('changes');
        Schema::dropIfExists('problems');
        Schema::dropIfExists('assets');
        Schema::dropIfExists('approvals');
        Schema::dropIfExists('sla_policies');
        Schema::dropIfExists('notifications_queue');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('ticket_activities');
        Schema::dropIfExists('ticket_history');
    }
};
