<?php

namespace App\Enums;

/**
 * Ticket State Machine — mirrors existing system exactly
 * New → Assigned → In Progress → Awaiting User → Awaiting Vendor → Resolved → Closed → Reopened
 */
enum TicketStatus: string
{
    case New = 'New';
    case InProgress = 'In Progress';
    case OnHold = 'On Hold';
    case Resolved = 'Resolved';
    case Closed = 'Closed';
    case Canceled = 'Canceled';
    case PendingApproval = 'Pending Approval';
    case Assigned = 'Assigned';
    case AwaitingUser = 'Awaiting User';
    case AwaitingVendor = 'Awaiting Vendor';
    case WaitingForCustomer = 'Waiting for Customer';
    case Reopened = 'Reopened';

    public function isPaused(): bool
    {
        return in_array($this, [
            self::OnHold,
            self::WaitingForCustomer,
            self::AwaitingUser,
            self::AwaitingVendor,
        ]);
    }

    public function isResolved(): bool
    {
        return in_array($this, [self::Resolved, self::Closed]);
    }

    public function isOpen(): bool
    {
        return !in_array($this, [self::Resolved, self::Closed, self::Canceled]);
    }

    public function color(): string
    {
        return match ($this) {
            self::New => 'bg-blue-100 text-blue-800',
            self::InProgress => 'bg-yellow-100 text-yellow-800',
            self::OnHold => 'bg-orange-100 text-orange-800',
            self::Resolved => 'bg-green-100 text-green-800',
            self::Closed => 'bg-gray-100 text-gray-800',
            self::Canceled => 'bg-red-100 text-red-800',
            self::PendingApproval => 'bg-purple-100 text-purple-800',
            self::Assigned => 'bg-indigo-100 text-indigo-800',
            self::AwaitingUser, self::AwaitingVendor, self::WaitingForCustomer => 'bg-amber-100 text-amber-800',
            self::Reopened => 'bg-rose-100 text-rose-800',
        };
    }

    /** Valid transitions from this state */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::New => [self::Assigned, self::InProgress, self::Canceled, self::PendingApproval],
            self::Assigned => [self::InProgress, self::OnHold, self::Canceled],
            self::InProgress => [self::OnHold, self::AwaitingUser, self::AwaitingVendor, self::WaitingForCustomer, self::Resolved, self::Canceled],
            self::OnHold => [self::InProgress, self::Resolved, self::Canceled],
            self::AwaitingUser, self::AwaitingVendor, self::WaitingForCustomer => [self::InProgress, self::Resolved, self::Canceled],
            self::Resolved => [self::Closed, self::Reopened],
            self::Closed => [self::Reopened],
            self::Canceled => [],
            self::Reopened => [self::InProgress, self::Assigned],
            self::PendingApproval => [self::New, self::Assigned, self::Canceled],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions());
    }
}
