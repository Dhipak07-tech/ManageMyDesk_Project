<?php

namespace App\Enums;

enum TicketChannel: string
{
    case Phone = 'Phone';
    case Email = 'Email';
    case SelfService = 'Self-service';
    case WalkIn = 'Walk-in';
    case WhatsApp = 'whatsapp';
    case Other = 'Other';
}
