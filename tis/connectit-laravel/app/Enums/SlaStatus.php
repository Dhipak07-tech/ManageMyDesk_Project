<?php

namespace App\Enums;

enum SlaStatus: string
{
    case InProgress = 'In Progress';
    case Completed = 'Completed';
    case Breached = 'Breached';
    case AtRisk = 'At Risk';
}
