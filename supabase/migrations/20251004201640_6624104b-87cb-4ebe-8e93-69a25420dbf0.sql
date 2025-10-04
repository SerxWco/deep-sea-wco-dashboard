-- Create chat conversations table
CREATE TABLE public.chat_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  feedback text CHECK (feedback IN ('positive', 'negative')) NULL,
  tool_calls jsonb NULL,
  tool_results jsonb NULL
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Chat conversations are viewable by everyone" 
ON public.chat_conversations 
FOR SELECT 
USING (true);

CREATE POLICY "Allow conversation creation" 
ON public.chat_conversations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow conversation updates" 
ON public.chat_conversations 
FOR UPDATE 
USING (true);

CREATE POLICY "Chat messages are viewable by everyone" 
ON public.chat_messages 
FOR SELECT 
USING (true);

CREATE POLICY "Allow message creation" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow message updates" 
ON public.chat_messages 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_timestamp ON public.chat_messages(timestamp);
CREATE INDEX idx_chat_conversations_session_id ON public.chat_conversations(session_id);