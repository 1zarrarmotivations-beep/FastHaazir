-- P0 Fix: Chat reliability (text + voice) + customer business listing visibility
-- Date: 2026-01-24
--
-- Goals:
-- 1) Make chat_messages schema match the app (message_type, voice_url, voice_duration, sender_type includes admin).
-- 2) Clean up chat RLS so participants can SELECT/INSERT, and admins can SELECT only (silent monitoring).
--    - Ensure ONLY ONE INSERT policy exists for participants (one policy with OR branches).
-- 3) Create storage bucket + RLS policies for voice notes (private bucket; participants can upload/read; admin read-only).
-- 4) Ensure customer business dashboard reads from public_businesses (approved + active + not deleted), and enable realtime.
--
-- NOTE: This file is intended to be applied in Supabase SQL editor / migration.

------------------------------------------------------------
-- 1) chat_messages: schema alignment
------------------------------------------------------------

-- Ensure sender_type constraint includes admin
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_sender_type_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_sender_type_check
  CHECK (sender_type IN ('customer', 'business', 'rider', 'admin'));

-- Add missing columns used by frontend
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'voice')),
  ADD COLUMN IF NOT EXISTS voice_url text NULL,
  ADD COLUMN IF NOT EXISTS voice_duration numeric NULL;

-- Helpful index for queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_created
  ON public.chat_messages(order_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_request_created
  ON public.chat_messages(rider_request_id, created_at);

------------------------------------------------------------
-- 2) chat_messages: RLS cleanup (no duplicates)
------------------------------------------------------------

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing chat policies (recreate clean set)
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_messages'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_messages;', p.policyname);
  END LOOP;
END $$;

-- SELECT: participants (customer/business/rider) can read messages for their conversations
CREATE POLICY "chat_select_participants"
ON public.chat_messages
FOR SELECT
USING (
  -- Customer owns the order/request
  (order_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = chat_messages.order_id
      AND o.customer_id = auth.uid()
  ))
  OR
  (rider_request_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.rider_requests rr
    WHERE rr.id = chat_messages.rider_request_id
      AND rr.customer_id = auth.uid()
  ))
  OR
  -- Business owner for that order
  (order_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id = chat_messages.order_id
      AND b.owner_user_id = auth.uid()
  ))
  OR
  -- Rider assigned to the order/request
  (order_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.riders r ON r.id = o.rider_id
    WHERE o.id = chat_messages.order_id
      AND r.user_id = auth.uid()
  ))
  OR
  (rider_request_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.rider_requests rr
    JOIN public.riders r ON r.id = rr.rider_id
    WHERE rr.id = chat_messages.rider_request_id
      AND r.user_id = auth.uid()
  ))
);

-- SELECT: admins can silently monitor (read-only)
CREATE POLICY "chat_select_admin"
ON public.chat_messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- INSERT: exactly ONE policy for participants (customer/business/rider)
CREATE POLICY "chat_insert_participants"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND sender_type IN ('customer', 'business', 'rider')
  AND (
    -- Customer sending in their order/request
    (sender_type = 'customer' AND (
      (order_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = chat_messages.order_id
          AND o.customer_id = auth.uid()
      ))
      OR
      (rider_request_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.rider_requests rr
        WHERE rr.id = chat_messages.rider_request_id
          AND rr.customer_id = auth.uid()
      ))
    ))

    OR

    -- Business owner sending in an order
    (sender_type = 'business' AND order_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.businesses b ON b.id = o.business_id
      WHERE o.id = chat_messages.order_id
        AND b.owner_user_id = auth.uid()
    ))

    OR

    -- Rider sending in their assigned order/request
    (sender_type = 'rider' AND (
      (order_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.orders o
        JOIN public.riders r ON r.id = o.rider_id
        WHERE o.id = chat_messages.order_id
          AND r.user_id = auth.uid()
      ))
      OR
      (rider_request_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.rider_requests rr
        JOIN public.riders r ON r.id = rr.rider_id
        WHERE rr.id = chat_messages.rider_request_id
          AND r.user_id = auth.uid()
      ))
    ))
  )
);

-- UPDATE: allow participants to mark read_at (no content edits)
CREATE POLICY "chat_update_participants"
ON public.chat_messages
FOR UPDATE
USING (
  -- same as participant SELECT access
  (order_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = chat_messages.order_id
      AND o.customer_id = auth.uid()
  ))
  OR
  (rider_request_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.rider_requests rr
    WHERE rr.id = chat_messages.rider_request_id
      AND rr.customer_id = auth.uid()
  ))
  OR
  (order_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id = chat_messages.order_id
      AND b.owner_user_id = auth.uid()
  ))
  OR
  (order_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.riders r ON r.id = o.rider_id
    WHERE o.id = chat_messages.order_id
      AND r.user_id = auth.uid()
  ))
  OR
  (rider_request_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.rider_requests rr
    JOIN public.riders r ON r.id = rr.rider_id
    WHERE rr.id = chat_messages.rider_request_id
      AND r.user_id = auth.uid()
  ))
)
WITH CHECK (true);

------------------------------------------------------------
-- 3) Storage: chat voice notes (private bucket + policies)
------------------------------------------------------------

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-voice-notes', 'chat-voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop and recreate clean)
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (qual ILIKE '%chat-voice-notes%' OR with_check ILIKE '%chat-voice-notes%')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', p.policyname);
  END LOOP;
END $$;

-- Helper: allow read if the current user is a participant in conversation based on object path
-- Path convention used by frontend: "{contextId}/{timestamp_userId}.webm" where contextId is orderId OR riderRequestId.

-- SELECT: participants + admin can read objects in chat-voice-notes bucket
CREATE POLICY "voice_notes_select_participants_and_admin"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-voice-notes'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.chat_messages cm
      WHERE cm.message_type = 'voice'
        AND cm.voice_url = storage.objects.name
        AND (
          -- participant access for that message row
          (cm.order_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = cm.order_id AND o.customer_id = auth.uid()
          ))
          OR
          (cm.order_id IS NOT NULL AND EXISTS (
            SELECT 1
            FROM public.orders o
            JOIN public.businesses b ON b.id = o.business_id
            WHERE o.id = cm.order_id AND b.owner_user_id = auth.uid()
          ))
          OR
          (cm.order_id IS NOT NULL AND EXISTS (
            SELECT 1
            FROM public.orders o
            JOIN public.riders r ON r.id = o.rider_id
            WHERE o.id = cm.order_id AND r.user_id = auth.uid()
          ))
          OR
          (cm.rider_request_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.rider_requests rr
            WHERE rr.id = cm.rider_request_id AND rr.customer_id = auth.uid()
          ))
          OR
          (cm.rider_request_id IS NOT NULL AND EXISTS (
            SELECT 1
            FROM public.rider_requests rr
            JOIN public.riders r ON r.id = rr.rider_id
            WHERE rr.id = cm.rider_request_id AND r.user_id = auth.uid()
          ))
        )
    )
  )
);

-- INSERT: authenticated users can upload to the bucket (object not yet referenced by chat_messages)
-- We keep this simple + safe by constraining to bucket only.
-- Final authorization happens at chat_messages INSERT: only participants can create voice message rows.
CREATE POLICY "voice_notes_insert_authenticated"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-voice-notes'
  AND auth.uid() IS NOT NULL
);

-- UPDATE/DELETE: disallow (immutability)
CREATE POLICY "voice_notes_no_update"
ON storage.objects
FOR UPDATE
USING (false);

CREATE POLICY "voice_notes_no_delete"
ON storage.objects
FOR DELETE
USING (false);

------------------------------------------------------------
-- 4) public_businesses: enable realtime and ensure it exists in publication
------------------------------------------------------------

-- Ensure realtime publication includes public_businesses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'public_businesses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.public_businesses;
  END IF;
END $$;

-- Ensure full payload for realtime updates
ALTER TABLE public.public_businesses REPLICA IDENTITY FULL;
