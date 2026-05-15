<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 50)->unique();
            $table->string('caller', 255);
            $table->string('caller_user_id', 128)->nullable();
            $table->string('affected_user', 255)->nullable();
            $table->string('affected_user_id', 128)->nullable();
            $table->string('category', 100)->nullable();
            $table->string('subcategory', 100)->nullable();
            $table->string('service', 100)->nullable();
            $table->string('service_offering', 100)->nullable();
            $table->string('cmdb_item', 100)->nullable();
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->string('channel', 30)->default('Self-service');
            $table->string('status', 30)->default('New');
            $table->string('impact', 20)->default('3 - Low');
            $table->string('urgency', 20)->default('3 - Low');
            $table->string('priority', 20)->default('4 - Low');
            $table->string('assignment_group', 100)->nullable();
            $table->string('assigned_to', 128)->nullable();
            $table->string('assigned_to_name', 255)->nullable();
            $table->string('created_by', 128);
            $table->string('created_by_name', 255)->nullable();
            $table->timestamps();
            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('response_deadline')->nullable();
            $table->timestamp('resolution_deadline')->nullable();
            $table->timestamp('on_hold_start')->nullable();
            $table->string('on_hold_reason', 255)->nullable();
            $table->bigInteger('total_paused_time_ms')->default(0);
            $table->string('response_sla_status', 20)->default('In Progress');
            $table->string('resolution_sla_status', 20)->default('In Progress');
            $table->integer('points')->default(0);
            $table->string('approval_status', 20)->default('Not Required');
            $table->string('resolution_code', 100)->nullable();
            $table->text('resolution_notes')->nullable();
            $table->string('resolution_method', 100)->nullable();
            $table->string('closure_reason', 100)->nullable();
            $table->bigInteger('resolution_duration')->nullable();
            $table->string('resolved_by', 255)->nullable();
            $table->foreignId('parent_ticket_id')->nullable()->constrained('tickets')->nullOnDelete();

            $table->index('status');
            $table->index('priority');
            $table->index('assigned_to');
            $table->index('created_by');
            $table->index('caller');
            $table->index('category');
            $table->index('resolved_at');
            $table->index(['status', 'priority']);
            $table->index(['assigned_to', 'status']);
            
            if (config('database.default') === 'mysql') {
                $table->fullText(['title', 'description']);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
