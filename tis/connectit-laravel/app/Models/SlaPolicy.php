<?php

namespace App\Models;

use App\Enums\TicketPriority;
use Illuminate\Database\Eloquent\Model;

class SlaPolicy extends Model
{
    protected $fillable = [
        'name', 'priority', 'category', 'response_time_hours',
        'resolution_time_hours', 'is_active', 'description'
    ];

    protected $casts = [
        'priority' => TicketPriority::class,
        'is_active' => 'boolean',
    ];
}
