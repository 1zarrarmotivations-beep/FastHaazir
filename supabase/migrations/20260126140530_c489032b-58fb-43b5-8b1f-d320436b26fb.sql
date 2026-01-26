-- Ensure chat_messages requires authentication for ALL operations
-- Add explicit policy requiring authentication for SELECT
CREATE POLICY "Require authentication for chat access"
ON public.chat_messages
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Also ensure INSERT/UPDATE/DELETE require authentication
CREATE POLICY "Require authentication for chat insert"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for chat update"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Require authentication for chat delete"
ON public.chat_messages
FOR DELETE
USING (auth.uid() IS NOT NULL);