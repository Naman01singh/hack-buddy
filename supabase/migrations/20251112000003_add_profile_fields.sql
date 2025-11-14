-- Add additional fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS college TEXT,
ADD COLUMN IF NOT EXISTS year TEXT,
ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}';

-- Create personal_messages table for 1-on-1 chat
CREATE TABLE public.personal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT personal_messages_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT personal_messages_no_self_message CHECK (sender_id != receiver_id)
);

-- Add foreign key constraints with proper names
ALTER TABLE public.personal_messages
  ADD CONSTRAINT personal_messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.personal_messages
  ADD CONSTRAINT personal_messages_receiver_id_fkey 
  FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create indexes for faster queries
CREATE INDEX idx_personal_messages_sender_id ON public.personal_messages(sender_id);
CREATE INDEX idx_personal_messages_receiver_id ON public.personal_messages(receiver_id);
CREATE INDEX idx_personal_messages_created_at ON public.personal_messages(created_at DESC);
CREATE INDEX idx_personal_messages_conversation ON public.personal_messages(sender_id, receiver_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.personal_messages ENABLE ROW LEVEL SECURITY;

-- Personal messages policies
-- Users can view messages where they are sender or receiver
CREATE POLICY "Users can view their personal messages"
  ON public.personal_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Authenticated users can send personal messages
CREATE POLICY "Users can send personal messages"
  ON public.personal_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Users can update read status of messages sent to them
CREATE POLICY "Users can update read status of their received messages"
  ON public.personal_messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Users can delete their own sent messages
CREATE POLICY "Users can delete their own sent messages"
  ON public.personal_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Enable real-time for personal_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_messages;

