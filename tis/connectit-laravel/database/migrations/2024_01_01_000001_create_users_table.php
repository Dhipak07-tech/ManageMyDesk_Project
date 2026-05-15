<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('uid', 128)->unique();
            $table->string('email', 255)->unique();
            $table->string('password_hash', 255)->nullable();
            $table->string('name', 255);
            $table->string('role', 30)->default('user');
            $table->string('phone', 50)->nullable();
            $table->string('department', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_demo')->default(false);
            $table->boolean('email_verified')->default(false);
            $table->text('photo_url')->nullable();
            $table->string('provider', 50)->default('email');
            $table->timestamps();
            $table->timestamp('last_login')->nullable();

            $table->index('role');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
