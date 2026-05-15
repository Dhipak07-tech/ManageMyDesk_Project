<?php

namespace App\Console\Commands;

use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Enums\ActivityType;
use App\Enums\VisibilityType;
use Illuminate\Console\Command;
use Webklex\IMAP\Facades\Client;
use Illuminate\Support\Facades\Log;
use Exception;

class OmnichannelPollCommand extends Command
{
    protected $signature = 'omnichannel:poll';
    protected $description = 'Poll IMAP inbox for new emails and create/update tickets';

    public function handle()
    {
        $this->info("Connecting to IMAP...");
        
        try {
            $client = Client::account('default');
            $client->connect();
            
            $folder = $client->getFolder('INBOX');
            $messages = $folder->query()->unseen()->get();
            
            $this->info("Found " . $messages->count() . " unseen messages.");

            foreach ($messages as $message) {
                $this->processMessage($message);
            }

            return 0;
        } catch (Exception $e) {
            $this->error("IMAP Error: " . $e->getMessage());
            Log::error("IMAP Polling Failed: " . $e->getMessage());
            return 1;
        }
    }

    protected function processMessage($message)
    {
        $subject = $message->getSubject();
        $from = $message->getFrom()[0]->mail;
        $body = $message->getTextBody() ?: $message->getHTMLBody();
        
        $this->info("Processing message from $from: $subject");

        // Try to find ticket number in subject (e.g., [INC000001])
        preg_match('/\[(INC\d+)\]/i', $subject, $matches);
        $ticketNumber = $matches[1] ?? null;

        $ticket = null;
        if ($ticketNumber) {
            $ticket = Ticket::where('ticket_number', $ticketNumber)->first();
        }

        if ($ticket) {
            // Update existing ticket
            $this->comment("   Appending to ticket $ticketNumber");
            TicketActivity::create([
                'ticket_id' => $ticket->id,
                'activity_type' => ActivityType::Email->value,
                'visibility_type' => VisibilityType::Public->value,
                'channel' => 'email',
                'message' => $body,
                'created_by' => $from,
                'created_by_name' => $from,
            ]);
            
            $ticket->touch(); // Update updated_at
        } else {
            // Create new ticket
            $this->comment("   Creating new ticket");
            $newTicket = Ticket::create([
                'ticket_number' => 'INC' . str_pad(Ticket::count() + 1, 6, '0', STR_PAD_LEFT),
                'caller' => $from,
                'title' => $subject,
                'description' => $body,
                'channel' => 'Email',
                'status' => 'New',
                'created_by' => 'system',
            ]);

            TicketActivity::create([
                'ticket_id' => $newTicket->id,
                'activity_type' => ActivityType::Email->value,
                'visibility_type' => VisibilityType::Public->value,
                'channel' => 'email',
                'message' => "Initial email: " . $body,
                'created_by' => $from,
                'created_by_name' => $from,
            ]);
        }

        // Mark as seen
        $message->setFlag('Seen');
    }
}
