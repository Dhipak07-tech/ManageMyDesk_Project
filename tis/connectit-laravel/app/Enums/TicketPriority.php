<?php

namespace App\Enums;

enum TicketPriority: string
{
    case Critical = '1 - Critical';
    case High = '2 - High';
    case Moderate = '3 - Moderate';
    case Low = '4 - Low';

    public function basePoints(): int
    {
        return match ($this) {
            self::Critical => 100,
            self::High => 50,
            self::Moderate => 25,
            self::Low => 10,
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::Critical => 'bg-red-600 text-white',
            self::High => 'bg-red-100 text-red-700',
            self::Moderate => 'bg-orange-100 text-orange-700',
            self::Low => 'bg-blue-100 text-blue-700',
        };
    }
}
