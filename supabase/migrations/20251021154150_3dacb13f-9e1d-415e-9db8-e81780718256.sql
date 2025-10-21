-- Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for RBAC
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Add user_id column to chat_conversations
ALTER TABLE public.chat_conversations 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to portfolio_snapshots
ALTER TABLE public.portfolio_snapshots 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update chat_conversations RLS policies
DROP POLICY IF EXISTS "Allow conversation creation" ON public.chat_conversations;
DROP POLICY IF EXISTS "Allow conversation updates" ON public.chat_conversations;
DROP POLICY IF EXISTS "Chat conversations are viewable by everyone" ON public.chat_conversations;

CREATE POLICY "Users can view own conversations"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own conversations"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
ON public.chat_conversations
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Update chat_messages RLS policies
DROP POLICY IF EXISTS "Allow message creation" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow message updates" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat messages are viewable by everyone" ON public.chat_messages;

CREATE POLICY "Users can view own messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = chat_messages.conversation_id
      AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create own messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = chat_messages.conversation_id
      AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = chat_messages.conversation_id
      AND user_id = auth.uid()
  )
);

-- Update portfolio_snapshots RLS policies
DROP POLICY IF EXISTS "Allow portfolio snapshot insertion" ON public.portfolio_snapshots;
DROP POLICY IF EXISTS "Allow portfolio snapshot updates" ON public.portfolio_snapshots;
DROP POLICY IF EXISTS "Portfolio snapshots are viewable by everyone" ON public.portfolio_snapshots;

CREATE POLICY "Users can view own portfolio"
ON public.portfolio_snapshots
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own portfolio"
ON public.portfolio_snapshots
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own portfolio"
ON public.portfolio_snapshots
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Update knowledge_base RLS policies to require admin role
DROP POLICY IF EXISTS "Allow knowledge base management" ON public.knowledge_base;
DROP POLICY IF EXISTS "Knowledge base is viewable by everyone" ON public.knowledge_base;

CREATE POLICY "Everyone can view active knowledge"
ON public.knowledge_base
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage knowledge base"
ON public.knowledge_base
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policy for user_roles (admins can manage, users can view own roles)
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));