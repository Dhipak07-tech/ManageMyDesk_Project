<?php

namespace App\Jobs;

use App\Models\Ticket;
use App\Services\OmniChannelService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendEmailNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 5;
    public $backoff = [60, 300, 600, 1800, 3600]; // 1m, 5m, 10m, 30m, 1h

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected Ticket $ticket,
        protected string $recipient,
        protected string $subject,
        protected string $body
    ) {}

    /**
     * Execute the job.
     */
    public function handle(OmniChannelService $service): void
    {
        $service->sendEmail($this->ticket, $this->recipient, $this->subject, $this->body);
    }
}
