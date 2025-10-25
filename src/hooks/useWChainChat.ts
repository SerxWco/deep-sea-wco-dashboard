import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatCard {
  type: 'token' | 'wallet' | 'price';
  data: any;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  id?: string;
  feedback?: 'positive' | 'negative' | null;
  cards?: ChatCard[];
}

// Generate a persistent session ID
const getSessionId = () => {
  let sessionId = localStorage.getItem('wchain_chat_session');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('wchain_chat_session', sessionId);
  }
  return sessionId;
};

interface UseWChainChatParams {
  userId: string | null;
}

export const useWChainChat = ({ userId }: UseWChainChatParams) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const sessionId = getSessionId();

  // Load conversation history when user is available
  const loadConversationHistory = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Find existing conversation for this session and user
      const { data: convData } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (convData) {
        setConversationId(convData.id);
        
        // Load messages
        const { data: messagesData } = await supabase
          .from('chat_messages')
          .select('id, role, content, timestamp, feedback')
          .eq('conversation_id', convData.id)
          .order('timestamp', { ascending: true });

        if (messagesData && messagesData.length > 0) {
          setMessages(messagesData.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.timestamp),
            feedback: m.feedback as 'positive' | 'negative' | null
          })));
          console.log('📚 Loaded conversation history:', messagesData.length, 'messages');
        }
      }
    } catch (err) {
      console.error('Failed to load conversation history:', err);
    }
  }, [userId, sessionId]);

  // Load conversation history when user is available
  useEffect(() => {
    if (userId) {
      loadConversationHistory();
    }
  }, [userId, loadConversationHistory]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    try {
      setError(null);
      setLoading(true);

      // Add user message
      const userMessage: ChatMessage = {
        role: 'user',
        content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Add placeholder assistant message that will be updated as stream arrives
      const placeholderMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, placeholderMessage]);
      const assistantMessageIndex = messages.length + 1;

      // Stream response from edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-wchain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: [
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content }
            ],
            conversationId,
            sessionId
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error('No reader available');

      let accumulatedContent = '';
      let buffer = '';
      const accumulatedCards: ChatCard[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(6);
          
          try {
            const parsed = JSON.parse(data);
            
            if (parsed.delta) {
              accumulatedContent += parsed.delta;
              // Update the assistant message in place
              setMessages(prev => {
                const updated = [...prev];
                updated[assistantMessageIndex] = {
                  ...updated[assistantMessageIndex],
                  content: accumulatedContent,
                  cards: accumulatedCards.length > 0 ? accumulatedCards : undefined
                };
                return updated;
              });
            }

            if (parsed.card) {
              accumulatedCards.push({
                type: parsed.card.type,
                data: parsed.card.data
              });
              // Update message with cards
              setMessages(prev => {
                const updated = [...prev];
                updated[assistantMessageIndex] = {
                  ...updated[assistantMessageIndex],
                  content: accumulatedContent,
                  cards: [...accumulatedCards]
                };
                return updated;
              });
            }

            if (parsed.done && parsed.conversationId && !conversationId) {
              setConversationId(parsed.conversationId);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove placeholder message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const setFeedback = async (messageIndex: number, feedback: 'positive' | 'negative') => {
    try {
      // Update local state
      setMessages(prev => prev.map((msg, idx) => 
        idx === messageIndex ? { ...msg, feedback } : msg
      ));

      // Update database if we have a conversation ID
      if (conversationId) {
        const message = messages[messageIndex];
        
        // Find the message in the database
        const { data: dbMessages } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .eq('content', message.content)
          .eq('role', message.role)
          .order('timestamp', { ascending: true });

        if (dbMessages && dbMessages.length > 0) {
          await supabase
            .from('chat_messages')
            .update({ feedback })
            .eq('id', dbMessages[0].id);
          
          console.log('👍 Feedback saved:', feedback);
        }
      }
    } catch (err) {
      console.error('Failed to save feedback:', err);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    
    // Clear session and start fresh
    localStorage.removeItem('wchain_chat_session');
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    setFeedback,
    clearMessages
  };
};
