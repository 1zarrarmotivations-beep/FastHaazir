-- Add voice message support to chat_messages table
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
ADD COLUMN IF NOT EXISTS voice_url text,
ADD COLUMN IF NOT EXISTS voice_duration numeric;

-- Create storage bucket for voice notes
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-voice-notes', 'chat-voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for voice notes storage
CREATE POLICY "Users can upload voice notes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-voice-notes' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view voice notes for their chats"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-voice-notes'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own voice notes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-voice-notes'
  AND auth.uid()::text = (storage.foldername(name))[2]
);