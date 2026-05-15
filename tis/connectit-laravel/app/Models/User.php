<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'uid', 'email', 'password_hash', 'name', 'role', 'phone',
        'department', 'is_active', 'is_demo', 'email_verified',
        'photo_url', 'provider', 'last_login',
    ];

    protected $hidden = ['password_hash'];

    protected $casts = [
        'role' => UserRole::class,
        'is_active' => 'boolean',
        'is_demo' => 'boolean',
        'email_verified' => 'boolean',
        'last_login' => 'datetime',
    ];

    // Relationships
    public function assignedTickets() { return $this->hasMany(Ticket::class, 'assigned_to', 'uid'); }
    public function createdTickets() { return $this->hasMany(Ticket::class, 'created_by', 'uid'); }
    public function callerTickets() { return $this->hasMany(Ticket::class, 'caller_user_id', 'uid'); }
    public function timesheets() { return $this->hasMany(Timesheet::class, 'user_id', 'uid'); }
    public function workSessions() { return $this->hasMany(WorkSession::class, 'user_id', 'uid'); }

    // Permission helpers (mirror existing roles.ts)
    public function canManage(User $target): bool { return $this->role->canManage($target->role); }
    public function canViewAllTickets(): bool { return $this->role->canViewAllTickets(); }
    public function canManageTickets(): bool { return $this->role->canManageTickets(); }
    public function canManageUsers(): bool { return $this->role->canManageUsers(); }
    public function canManageSLA(): bool { return $this->role->canManageSLA(); }
    public function hasFullControl(): bool { return $this->role->hasFullControl(); }

    // Auth password field override
    public function getAuthPassword() { return $this->password_hash; }
}
