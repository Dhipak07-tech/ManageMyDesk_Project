<?php

namespace App\Http\Controllers;

use App\Services\TicketService;
use App\Services\AiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TicketController extends Controller
{
    protected $ticketService;
    protected $aiService;

    public function __construct(TicketService $ticketService, AiService $aiService)
    {
        $this->ticketService = $ticketService;
        $this->aiService = $aiService;
    }

    /**
     * Create a new ticket.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'caller' => 'required|string',
            'impact' => 'required|string',
            'urgency' => 'required|string',
            'category' => 'nullable|string',
            'description' => 'nullable|string',
            'caller_email' => 'nullable|email',
        ]);

        $ticket = $this->ticketService->createTicket($validated);

        return response()->json($ticket, 201);
    }

    /**
     * AI Suggestion for an issue.
     */
    public function suggest(Request $request)
    {
        $request->validate(['text' => 'required|string']);
        $suggestion = $this->aiService->getSuggestion($request->text);
        return response()->json(['suggestion' => $suggestion]);
    }

    /**
     * AI Chat with Kiru.
     */
    public function chat(Request $request)
    {
        $request->validate(['message' => 'required|string']);
        $response = $this->aiService->chat($request->message, $request->history ?? []);
        return response()->json(['response' => $response]);
    }

    /**
     * Update ticket status.
     */
    public function updateStatus(Request $request, \App\Models\Ticket $ticket)
    {
        $request->validate([
            'status' => 'required|string',
            'reason' => 'nullable|string',
        ]);

        $status = \App\Enums\TicketStatus::from($request->status);
        $updatedTicket = $this->ticketService->updateStatus($ticket, $status, $request->reason);

        return response()->json($updatedTicket);
    }

    /**
     * Assign ticket.
     */
    public function assign(Request $request, \App\Models\Ticket $ticket)
    {
        $validated = $request->validate([
            'assigned_to' => 'nullable|string',
            'assigned_to_name' => 'nullable|string',
            'assignment_group' => 'nullable|string',
        ]);

        $updatedTicket = $this->ticketService->assignTicket($ticket, $validated);

        return response()->json($updatedTicket);
    }

    /**
     * Add comment.
     */
    public function comment(Request $request, \App\Models\Ticket $ticket)
    {
        $request->validate([
            'message' => 'required|string',
            'is_internal' => 'boolean',
        ]);

        $activity = $this->ticketService->addComment($ticket, $request->message, $request->is_internal ?? false);

        return response()->json($activity, 201);
    }

    /**
     * Trigger manual notification (Bridge for legacy system)
     */
    public function notify(Request $request, \App\Services\OmniChannelService $omniChannel)
    {
        $request->validate([
            'ticket_id' => 'required|exists:tickets,id',
            'type' => 'required|string'
        ]);

        $ticket = \App\Models\Ticket::find($request->ticket_id);
        
        match ($request->type) {
            'created' => event(new \App\Events\TicketCreated($ticket)),
            'assigned' => event(new \App\Events\TicketAssigned($ticket)),
            'resolved' => event(new \App\Events\TicketResolved($ticket)),
            'commented' => event(new \App\Events\CommentAdded($ticket, $request->message ?? 'New update added.')),
            default => null,
        };

        return response()->json(['status' => "Notification event '{$request->type}' dispatched"]);
    }
}
