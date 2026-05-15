<?php

namespace App\Enums;

enum QueueStatus: string
{
    case Pending = 'pending';
    case Sent = 'sent';
    case Failed = 'failed';
}
