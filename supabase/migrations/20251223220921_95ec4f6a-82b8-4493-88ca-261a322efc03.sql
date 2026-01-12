-- Create chat messages table for order-based communication
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_request_id UUID REFERENCES public.rider_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'business', 'rider')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can view messages for their orders
CREATE POLICY "Customers can view their order messages"
ON public.chat_messages
FOR SELECT
USING (
  (order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid()))
  OR
  (rider_request_id IN (SELECT id FROM rider_requests WHERE customer_id = auth.uid()))
);

-- Policy: Customers can send messages for their orders
CREATE POLICY "Customers can send messages for their orders"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_type = 'customer' AND
  sender_id = auth.uid() AND
  (
    (order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid()))
    OR
    (rider_request_id IN (SELECT id FROM rider_requests WHERE customer_id = auth.uid()))
  )
);

-- Policy: Business owners can view/send messages for their orders
CREATE POLICY "Business can view order messages"
ON public.chat_messages
FOR SELECT
USING (
  order_id IN (
    SELECT o.id FROM orders o
    JOIN businesses b ON o.business_id = b.id
    WHERE b.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Business can send order messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_type = 'business' AND
  order_id IN (
    SELECT o.id FROM orders o
    JOIN businesses b ON o.business_id = b.id
    WHERE b.owner_user_id = auth.uid()
  )
);

-- Policy: Riders can view/send messages for their assigned orders
CREATE POLICY "Riders can view assigned order messages"
ON public.chat_messages
FOR SELECT
USING (
  (order_id IN (
    SELECT id FROM orders WHERE rider_id IN (
      SELECT id FROM riders WHERE user_id = auth.uid()
    )
  ))
  OR
  (rider_request_id IN (
    SELECT id FROM rider_requests WHERE rider_id IN (
      SELECT id FROM riders WHERE user_id = auth.uid()
    )
  ))
);

CREATE POLICY "Riders can send messages for assigned orders"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_type = 'rider' AND
  (
    (order_id IN (
      SELECT id FROM orders WHERE rider_id IN (
        SELECT id FROM riders WHERE user_id = auth.uid()
      )
    ))
    OR
    (rider_request_id IN (
      SELECT id FROM rider_requests WHERE rider_id IN (
        SELECT id FROM riders WHERE user_id = auth.uid()
      )
    ))
  )
);

-- Policy: Admins can manage all messages
CREATE POLICY "Admins can manage all messages"
ON public.chat_messages
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create index for faster queries
CREATE INDEX idx_chat_messages_order_id ON public.chat_messages(order_id);
CREATE INDEX idx_chat_messages_rider_request_id ON public.chat_messages(rider_request_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);