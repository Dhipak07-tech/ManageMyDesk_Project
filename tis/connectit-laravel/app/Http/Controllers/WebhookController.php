<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Enums\ActivityType;
use App\Enums\VisibilityType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function whatsapp(Request $request)
    {
        $from = $request->input('From'); // e.g. whatsapp:+919876543210
        $body = $request->input('Body');
        $phone = str_replace('whatsapp:', '', $from);

        Log::info("Inbound WhatsApp from $phone: $body");

        // Try to find ticket by caller's phone (simplified for this demo)
        // In production, you might search for the user by phone number first
        $ticket = Ticket::where('caller', $phone)
            ->orWhere('description', 'like', "%$phone%")
            ->latest()
            ->first();

        if ($ticket) {
            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'activity_type' => ActivityType::WhatsApp->value,
                'visibility_type' => VisibilityType::Public->value,
                'channel' => 'whatsapp',
                'message' => $body,
                'created_by' => $phone,
                'created_by_name' => 'Customer (WhatsApp)',
            ]);
            
            $ticket->touch();
        } else {
            // Create new ticket from WhatsApp
            $newTicket = Ticket::create([
                'ticket_number' => 'INC' . str_pad(Ticket::count() + 1, 6, '0', STR_PAD_LEFT),
                'caller' => $phone,
                'title' => "WhatsApp: " . substr($body, 0, 50),
                'description' => $body,
                'channel' => 'whatsapp',
                'status' => 'New',
                'created_by' => 'system',
            ]);

            TicketActivity::create([
                'ticket_id' => $newTicket->id,
                'activity_type' => ActivityType::WhatsApp->value,
                'visibility_type' => VisibilityType::Public->value,
                'channel' => 'whatsapp',
                'message' => $body,
                'created_by' => $phone,
                'created_by_name' => 'Customer (WhatsApp)',
            ]);
        }

        return response('<Response></Response>', 200)->header('Content-Type', 'text/xml');
    }
}
