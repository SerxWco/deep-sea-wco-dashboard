import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWChainChat } from '@/hooks/useWChainChat';
import { toast } from 'sonner';

const quickQuestions = [
  "How many WCO holders are there?",
  "Show me the top Krakens",
  "What's the total WCO volume today?",
  "How many active wallets this week?",
];

export const WChainChatbot = () => {
  const [input, setInput] = useState('');
  const { messages, loading, error, sendMessage, clearMessages } = useWChainChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    await sendMessage(input);
    setInput('');
  };

  const handleQuickQuestion = async (question: string) => {
    await sendMessage(question);
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <CardTitle>W-Chain AI Assistant</CardTitle>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <MessageSquare className="w-12 h-12 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Ask me anything about W-Chain</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  I can help you with holders, transactions, wallets, and network stats
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {quickQuestions.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickQuestion(question)}
                    disabled={loading}
                    className="text-xs"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about W-Chain data..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
