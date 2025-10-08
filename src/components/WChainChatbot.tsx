import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWChainChat } from '@/hooks/useWChainChat';
import { toast } from 'sonner';
import { BubblesAvatar } from './BubblesAvatar';


export const WChainChatbot = () => {
  const [input, setInput] = useState('');
  const { messages, loading, error, sendMessage, setFeedback, clearMessages } = useWChainChat();
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


  const handleFeedback = async (messageIndex: number, feedback: 'positive' | 'negative') => {
    await setFeedback(messageIndex, feedback);
    toast.success(feedback === 'positive' ? '👍 Thanks for the feedback!' : '👎 Feedback noted, I\'ll try to improve!');
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="border-b bg-gradient-to-r from-card via-card to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BubblesAvatar size="sm" state={loading ? "thinking" : "idle"} />
            <div>
              <CardTitle className="flex items-center gap-2">
                Bubbles – WCO Ocean AI 🫧
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your friendly guide through the ocean of WCO data 🌊
              </p>
            </div>
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
        <div 
          ref={scrollRef}
          className="flex-1 p-4 overflow-y-auto scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 px-4">
              <BubblesAvatar size="lg" state="idle" />
              <div>
                <h3 className="font-semibold text-xl mb-2">
                  Hi! I'm Bubbles 🫧
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  I can help you explore WCO holders, transactions, tokens, and more. Ask me anything about W-Chain! 🌊
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <BubblesAvatar size="sm" state="idle" className="mt-1 flex-shrink-0" />
                  )}
                  <div className="flex flex-col gap-1">
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gradient-to-br from-muted via-muted to-primary/10 text-foreground border border-primary/20'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {message.role === 'assistant' && (
                      <div className="flex gap-1 ml-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-6 w-6 p-0 ${message.feedback === 'positive' ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'}`}
                          onClick={() => handleFeedback(idx, 'positive')}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-6 w-6 p-0 ${message.feedback === 'negative' ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                          onClick={() => handleFeedback(idx, 'negative')}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 justify-start">
                  <BubblesAvatar size="sm" state="thinking" className="mt-1 flex-shrink-0" />
                  <div className="bg-gradient-to-br from-muted via-muted to-primary/10 rounded-lg px-4 py-3 border border-primary/20">
                    <p className="text-sm text-muted-foreground">Bubbles is diving deep... 💧</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
