import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  id?: string;
  feedback?: 'positive' | 'negative' | null;
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

      // Call edge function (userId comes from JWT, not request body)
      const { data, error: functionError } = await supabase.functions.invoke('chat-wchain', {
        body: {
          messages: [{ role: 'user', content }],
          conversationId,
          sessionId
        }
      });

      if (functionError) {
        throw functionError;
      }

      // Update conversation ID if returned
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
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
