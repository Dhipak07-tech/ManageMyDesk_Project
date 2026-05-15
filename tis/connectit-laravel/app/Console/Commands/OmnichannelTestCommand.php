<?php

namespace App\Console\Commands;

use App\Models\Ticket;
use App\Services\OmniChannelService;
use App\Jobs\SendEmailNotification;
use App\Jobs\SendWhatsAppNotification;
use Illuminate\Console\Command;

class OmnichannelTestCommand extends Command
{
    protected $signature = 'omnichannel:test {email} {phone} {--ticket=1}';
    protected $description = 'Test Omnichannel notifications (Email and WhatsApp)';

    public function handle(OmniChannelService $service)
    {
        $email = $this->argument('email');
        $phone = $this->argument('phone');
        $ticketId = $this->option('ticket');

        $ticket = Ticket::find($ticketId);

        if (!$ticket) {
            $this->error("Ticket ID $ticketId not found.");
            return 1;
        }

        $this->info("Starting Omnichannel Test...");
        $this->info("Ticket: {$ticket->ticket_number} - {$ticket->title}");

        // Test Email
        $this->comment("1. Testing Email delivery to $email...");
        $emailSuccess = $service->sendEmail($ticket, $email, "Test Notification - {$ticket->ticket_number}", "This is a test email for ticket {$ticket->ticket_number}.");
        
        if ($emailSuccess) {
            $this->info("   [SUCCESS] Email sent.");
        } else {
            $this->error("   [FAILED] Email failed. Check logs.");
        }

        // Test WhatsApp
        $this->comment("2. Testing WhatsApp delivery to $phone...");
        $waSuccess = $service->sendWhatsApp($ticket, $phone, "Test Notification for ticket {$ticket->ticket_number}: Your ticket has been updated.");
        
        if ($waSuccess) {
            $this->info("   [SUCCESS] WhatsApp sent.");
        } else {
            $this->error("   [FAILED] WhatsApp failed. Check logs.");
        }

        // Test Queue
        $this->comment("3. Testing Background Queue dispatch...");
        SendEmailNotification::dispatch($ticket, $email, "Queue Test - {$ticket->ticket_number}", "This was sent via the background queue.");
        SendWhatsAppNotification::dispatch($ticket, $phone, "Queue Test for {$ticket->ticket_number}: Background job dispatched.");
        $this->info("   [QUEUED] Background jobs dispatched. Run 'php artisan queue:work' to process.");

        $this->info("Test Complete.");
        return 0;
    }
}
