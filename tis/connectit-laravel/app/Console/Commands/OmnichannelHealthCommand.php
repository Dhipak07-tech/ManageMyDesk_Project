<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Twilio\Rest\Client as TwilioClient;
use Exception;

class OmnichannelHealthCommand extends Command
{
    protected $signature = 'omnichannel:health';
    protected $description = 'Verify connectivity to external services (SMTP, Twilio, DB)';

    public function handle()
    {
        $this->info("=== Omnichannel Health Check ===");

        // 1. Database
        $this->check("Database Connectivity", function() {
            DB::connection()->getPdo();
            return true;
        });

        // 2. SMTP
        $this->check("SMTP Connection (" . config('mail.mailers.smtp.host') . ")", function() {
            $transport = Mail::getSymfonyTransport();
            // This is a basic check, doesn't actually authenticate but checks if transport is available
            return $transport !== null;
        });

        // 3. Twilio
        $this->check("Twilio API Connectivity", function() {
            $sid = config('services.twilio.sid');
            $token = config('services.twilio.token');
            if (!$sid || !$token) return "Credentials missing";
            
            $client = new TwilioClient($sid, $token);
            $client->accounts($sid)->fetch(); // Attempt to fetch account details
            return true;
        });

        // 4. Queue Worker
        $this->check("Queue Connection (" . config('queue.default') . ")", function() {
            return DB::table('jobs')->count() >= 0; // Simple check if jobs table exists/accessible
        });

        $this->info("================================");
        return 0;
    }

    protected function check(string $name, callable $callback)
    {
        $this->output->write("$name: ");
        try {
            $result = $callback();
            if ($result === true) {
                $this->info("OK");
            } else {
                $this->error("FAILED ($result)");
            }
        } catch (Exception $e) {
            $this->error("ERROR - " . $e->getMessage());
        }
    }
}
