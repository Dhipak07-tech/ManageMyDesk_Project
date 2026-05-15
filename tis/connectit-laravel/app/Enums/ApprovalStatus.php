<?php

namespace App\Enums;

enum ApprovalStatus: string
{
    case NotRequired = 'Not Required';
    case Pending = 'Pending';
    case Approved = 'Approved';
    case Rejected = 'Rejected';
}
