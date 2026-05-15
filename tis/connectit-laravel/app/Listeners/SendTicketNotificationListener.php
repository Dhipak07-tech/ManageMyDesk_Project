<?php

namespace App\Listeners;

use App\Events\TicketCreated;
use App\Events\TicketAssigned;
use App\Events\TicketResolved;
use App\Services\OmniChannelService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class SendTicketNotificationListener implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct(protected OmniChannelService $omniChannel) {}

    /**
     * Handle Ticket Created event
     */
    public function handleTicketCreated(TicketCreated $event): void
    {
        Log::info("[Listener] Handling TicketCreated for " . $event->ticket->ticket_number);
        $this->omniChannel->notifyTicketCreated($event->ticket);
    }

    /**
     * Handle Ticket Assigned event
     */
    public function handleTicketAssigned(TicketAssigned $event): void
    {
        Log::info("[Listener] Handling TicketAssigned for " . $event->ticket->ticket_number);
        $this->omniChannel->notifyTicketAssigned($event->ticket);
    }

    /**
     * Handle Ticket Resolved event
     */
    public function handleTicketResolved(TicketResolved $event): void
    {
        Log::info("[Listener] Handling TicketResolved for " . $event->ticket->ticket_number);
        $this->omniChannel->notifyTicketResolved($event->ticket);
    }

    /**
     * Handle Comment Added event
     */
    public function handleCommentAdded(\App\Events\CommentAdded $event): void
    {
        if ($event->isInternal) return; // Never notify for internal notes
        
        Log::info("[Listener] Handling CommentAdded for " . $event->ticket->ticket_number);
        $this->omniChannel->notifyCommentAdded($event->ticket, $event->comment);
    }

    /**
     * Register the listeners for the subscriber.
     */
    public function subscribe($events): array
    {
        return [
            TicketCreated::class => 'handleTicketCreated',
            TicketAssigned::class => 'handleTicketAssigned',
            TicketResolved::class => 'handleTicketResolved',
            \App\Events\CommentAdded::class => 'handleCommentAdded',
        ];
    }
}
