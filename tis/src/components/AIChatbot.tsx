import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

/** Render plain text with basic markdown-like formatting */
function MessageText({ text }: { text: string }) {
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeLines: string[] = [];
  const elements: React.ReactNode[] = [];

  const parseBold = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, j) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={j} className="font-bold text-sn-dark dark:text-white">{part.slice(2, -2)}</strong>
        : part
    );
  };

  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="bg-gray-900 text-gray-100 p-4 rounded-2xl text-xs overflow-x-auto my-3 font-mono border border-gray-700 shadow-xl shadow-black/20">
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="font-black text-sn-dark dark:text-white text-base mt-4 mb-1">{parseBold(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="font-black text-sn-dark dark:text-white text-lg mt-5 mb-2">{parseBold(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="font-black text-sn-dark dark:text-white text-xl mt-6 mb-3">{parseBold(line.slice(2))}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="pl-4 flex gap-3 my-1 group">
          <span className="text-sn-green font-black select-none group-hover:scale-150 transition-transform">•</span>
          <span className="flex-1">{parseBold(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\. /.test(line)) {
      const match = line.match(/^(\d+\. )(.*)/);
      elements.push(
        <div key={i} className="pl-4 flex gap-3 my-1">
          <span className="text-sn-green font-bold select-none">{match?.[1]}</span>
          <span className="flex-1">{parseBold(match?.[2] || "")}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-3" />);
    } else {
      elements.push(
        <p key={i} className="leading-relaxed">
          {parseBold(line)}
        </p>
      );
    }
  });

  return <div className="space-y-1 text-[13px] text-gray-700 dark:text-gray-300">{elements}</div>;
}

export function AIChatbot() {
  const [isOpen, setIsOpen]       = useState(false);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [messages, setMessages]   = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Hey there! 👋 I'm **Kiru**, your AI assistant powered by Gemini 2.5 Pro.\n\nI can help with:\n- IT tickets, incidents & SLA questions\n- Coding in PHP, React, TypeScript\n- General questions & brainstorming\n\nWhat's on your mind?",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const callGemini = async (text: string): Promise<string> => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error || data?.message || `Error ${res.status}`;
      throw new Error(msg);
    }

    return data.response || "I couldn't generate a response. Please try again.";
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || retryCountdown > 0) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      let reply: string;
      try {
        reply = await callGemini(userMsg.text);
      } catch (err: any) {
        // Auto-retry after rate limit
        if (err.retryAfter > 0) {
          let secs = err.retryAfter;
          setIsLoading(false);
          setRetryCountdown(secs);
          const timer = setInterval(() => {
            secs--;
            setRetryCountdown(secs);
            if (secs <= 0) {
              clearInterval(timer);
              setRetryCountdown(0);
              // Retry automatically
              setIsLoading(true);
              callGemini(userMsg.text)
                .then(r => setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: r }]))
                .catch(e => setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: `Sorry, still having trouble: ${e.message}` }]))
                .finally(() => setIsLoading(false));
            }
          }, 1000);
          return;
        }
        throw err;
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: `Sorry, something went wrong: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = ['Help with a ticket', 'Explain SLA', 'PHP code help', 'What can you do?'];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
             style={{ width: '380px', height: '580px', background: 'var(--background, #fff)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
               style={{ background: 'linear-gradient(135deg, #1d1d2c 0%, #2d3748 100%)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sn-green flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Kiru AI</div>
                <div className="text-green-400 text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
                  Gemini 2.5 Pro · Online
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 rounded">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4"
               style={{ background: 'var(--muted, #f8fafc)' }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-sn-green flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={14} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                  msg.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.sender === 'ai' ? <MessageText text={msg.text} /> : <p className="text-sm">{msg.text}</p>}
                </div>
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <User size={14} className="text-white" />
                  </div>
                )}
              </div>
            ))}

            {(isLoading || retryCountdown > 0) && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-sn-green flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                  {retryCountdown > 0 ? (
                    <span className="text-xs text-amber-500 font-medium">⏳ Retrying in {retryCountdown}s...</span>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-sn-green rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-sn-green rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-sn-green rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts — only show when no conversation yet */}
          {messages.length === 1 && !isLoading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5" style={{ background: 'var(--muted, #f8fafc)' }}>
              {quickPrompts.map(p => (
                <button key={p} onClick={() => { setInput(p); }}
                        className="text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-sn-green hover:text-sn-green transition-colors">
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask Kiru anything..."
                className="flex-1 bg-transparent text-sm outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
              />
              <button onClick={handleSend} disabled={isLoading || !input.trim() || retryCountdown > 0}
                      className="w-8 h-8 rounded-full bg-sn-green flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex-shrink-0">
                <Send size={14} className="text-white" />
              </button>
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-1.5">Powered by Gemini 2.5 Pro</p>
          </div>
        </div>
      )}

      {/* FAB */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
                className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                style={{ background: 'linear-gradient(135deg, #62d84e, #3db82e)' }}>
          <MessageSquare size={24} className="text-white" />
        </button>
      )}
    </div>
  );
}
