<?php

namespace App\Enums;

/**
 * Hierarchical Role System
 * Mirrors existing: user < agent < sub_admin < admin < super_admin < ultra_super_admin
 */
enum UserRole: string
{
    case User = 'user';
    case Agent = 'agent';
    case SubAdmin = 'sub_admin';
    case Admin = 'admin';
    case SuperAdmin = 'super_admin';
    case UltraSuperAdmin = 'ultra_super_admin';

    public function level(): int
    {
        return match ($this) {
            self::User => 1,
            self::Agent => 2,
            self::SubAdmin => 3,
            self::Admin => 4,
            self::SuperAdmin => 5,
            self::UltraSuperAdmin => 6,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::User => 'User',
            self::Agent => 'Support Agent',
            self::SubAdmin => 'Sub Admin',
            self::Admin => 'Administrator',
            self::SuperAdmin => 'Super Admin',
            self::UltraSuperAdmin => 'Ultra Super Admin',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::User => 'bg-gray-100 text-gray-700',
            self::Agent => 'bg-blue-100 text-blue-700',
            self::SubAdmin => 'bg-purple-100 text-purple-700',
            self::Admin => 'bg-orange-100 text-orange-700',
            self::SuperAdmin => 'bg-red-100 text-red-700',
            self::UltraSuperAdmin => 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
        };
    }

    public function canManage(UserRole $target): bool
    {
        return $this->level() > $target->level();
    }

    /** Permissions — exact mirror of existing roles.ts */
    public function canViewAllTickets(): bool { return $this->level() >= self::Agent->level(); }
    public function canManageTickets(): bool { return $this->level() >= self::Agent->level(); }
    public function canApproveTimesheets(): bool { return $this->level() >= self::Admin->level(); }
    public function canManageUsers(): bool { return $this->level() >= self::Admin->level(); }
    public function canManageDropdowns(): bool { return $this->level() >= self::SuperAdmin->level(); }
    public function canCompanyWideView(): bool { return $this->level() >= self::SubAdmin->level(); }
    public function canManageSLA(): bool { return $this->level() >= self::Admin->level(); }
    public function canSystemSettings(): bool { return $this->level() >= self::SuperAdmin->level(); }
    public function hasFullControl(): bool { return $this === self::UltraSuperAdmin; }

    /** Get all roles this role can assign to others */
    public function assignableRoles(): array
    {
        return array_filter(self::cases(), fn (self $r) => $this->level() > $r->level());
    }
}
