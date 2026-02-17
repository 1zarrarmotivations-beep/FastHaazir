-- Rider Support System Database Setup
-- Run this SQL to create the necessary tables for rider-specific support

-- Create rider_support_tickets table for rider-specific support
CREATE TABLE IF NOT EXISTS rider_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL,
    assigned_to UUID,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    metadata JSONB DEFAULT '{}',
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rider_support_messages table for real-time chat
CREATE TABLE IF NOT EXISTS rider_support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('rider', 'admin', 'system')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE rider_support_messages 
ADD CONSTRAINT fk_ticket 
FOREIGN KEY (ticket_id) REFERENCES rider_support_tickets(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE rider_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_support_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_rider_support_tickets_rider_id ON rider_support_tickets(rider_id);
CREATE INDEX idx_rider_support_tickets_status ON rider_support_tickets(status);
CREATE INDEX idx_rider_support_messages_ticket_id ON rider_support_messages(ticket_id);

-- Rider Trips Table
CREATE TABLE IF NOT EXISTS rider_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID NOT NULL REFERENCES riders(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    distance_km NUMERIC DEFAULT 0,
    max_speed_kmh NUMERIC DEFAULT 0,
    avg_speed_kmh NUMERIC DEFAULT 0,
    start_lat NUMERIC,
    start_lng NUMERIC,
    end_lat NUMERIC,
    end_lng NUMERIC,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_trips_rider_id ON rider_trips(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_trips_created_at ON rider_trips(created_at);

ALTER TABLE rider_trips ENABLE ROW LEVEL SECURITY;

-- Detailed RLS Policies (Apply these manually if needed)

-- TICKET POLICIES
-- CREATE POLICY "Riders can view their own tickets" ON rider_support_tickets FOR SELECT USING (auth.uid() IN (SELECT user_id FROM riders WHERE id = rider_id));
-- CREATE POLICY "Riders can create tickets" ON rider_support_tickets FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM riders WHERE id = rider_id));
-- CREATE POLICY "Admins can view all tickets" ON rider_support_tickets FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- TRIP POLICIES
-- CREATE POLICY "Riders can view their own trips" ON rider_trips FOR SELECT USING (auth.uid() IN (SELECT user_id FROM riders WHERE id = rider_id));
-- CREATE POLICY "Riders can insert their own trips" ON rider_trips FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM riders WHERE id = rider_id));
