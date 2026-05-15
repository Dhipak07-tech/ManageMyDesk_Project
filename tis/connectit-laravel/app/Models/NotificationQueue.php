<?php

namespace App\Models;

use App\Enums\QueueStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationQueue extends Model
{
    protected $table = 'notifications_queue';

    protected $fillable = [
        'ticket_id', 'recipient', 'channel', 'subject', 'body',
        'status', 'retry_count', 'last_error', 'sent_at'
    ];

    protected $casts = [
        'status' => QueueStatus::class,
        'sent_at' => 'datetime',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }
}
