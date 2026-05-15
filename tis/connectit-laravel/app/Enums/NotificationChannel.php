<?php

namespace App\Enums;

enum NotificationChannel: string
{
    case EmailChannel = 'email';
    case WhatsAppChannel = 'whatsapp';
}
