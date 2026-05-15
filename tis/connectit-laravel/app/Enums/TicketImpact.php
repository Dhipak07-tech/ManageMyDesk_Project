<?php

namespace App\Enums;

enum TicketImpact: string
{
    case High = '1 - High';
    case Medium = '2 - Medium';
    case Low = '3 - Low';
}
