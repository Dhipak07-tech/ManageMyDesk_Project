<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentAdded
{
    use Dispatchable, SerializesModels;

    public function __construct(public Ticket $ticket, public string $comment, public bool $isInternal = false) {}
}
