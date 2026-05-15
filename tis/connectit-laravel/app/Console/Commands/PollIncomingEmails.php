<?php

namespace App\Console\Commands;

use App\Services\OmniChannelService;
use Illuminate\Console\Command;

class PollIncomingEmails extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'omnichannel:poll';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Poll incoming emails and process them into tickets or updates.';

    /**
     * Execute the console command.
     */
    public function handle(OmniChannelService $omniChannel)
    {
        $this->info('Starting OmniChannel Email Polling...');
        $omniChannel->pollIncomingEmails();
        $this->info('Polling completed.');
    }
}
