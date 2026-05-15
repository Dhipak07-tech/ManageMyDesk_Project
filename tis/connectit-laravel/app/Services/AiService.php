<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class AiService
{
    protected $client;
    protected $apiKey;
    protected $baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';

    public function __construct()
    {
        $this->client = new Client();
        $this->apiKey = config('services.gemini.key');
    }

    /**
     * Get a suggested solution for an IT issue.
     */
    public function getSuggestion(string $text)
    {
        $prompt = "A user is experiencing an IT issue. Provide a short, direct suggested solution to help them fix it before creating a ticket. Keep it under 3 sentences and be friendly.\n\nIssue: \"{$text}\"";
        
        return $this->generateContent('gemini-2.5-flash', $prompt);
    }

    /**
     * Chat with Kiru AI.
     */
    public function chat(string $message, array $history = [])
    {
        $prompt = "You are Kiru, a friendly and intelligent IT service management assistant.
Personality: Warm, professional, and helpful.
Capabilities: 
1. Answer general questions.
2. Help with IT issues (Network, Software, Hardware, etc.).
3. Manage tickets using your available tools (create, get status, list).

When a user reports an issue, try to understand the impact and urgency. 
If they want to create a ticket, use the 'create_ticket' tool.
Always confirm the details before creating a ticket if possible.
Respond in a conversational, friendly tone.

User message: \"{$message}\"

Please respond appropriately as a helpful IT assistant.";

        return $this->generateContent('gemini-1.5-flash', $prompt);
    }

    /**
     * Helper to call Gemini API.
     */
    protected function generateContent(string $model, string $prompt)
    {
        if (!$this->apiKey) {
            Log::warning("[AiService] Gemini API key not configured.");
            return "AI service is currently unavailable.";
        }

        try {
            $url = "{$this->baseUrl}{$model}:generateContent?key={$this->apiKey}";
            
            $response = $this->client->post($url, [
                'json' => [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt]
                            ]
                        ]
                    ]
                ]
            ]);

            $result = json_decode($response->getBody()->getContents(), true);
            return $result['candidates'][0]['content']['parts'][0]['text'] ?? "I couldn't process that right now.";

        } catch (\Exception $e) {
            Log::error("[AiService] Gemini API failed: " . $e->getMessage());
            return "Sorry, I encountered an error while processing your request.";
        }
    }
}
