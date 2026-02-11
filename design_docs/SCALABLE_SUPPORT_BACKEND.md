# Scalable Real-Time Support Chat System Architecture
**Project: Fast Haazir | Role: Senior Backend Architect**

## 1. System Architecture Overview

This system is designed to handle **10,000+ concurrent users** with sub-second latency for chat and intelligent automation when admins are offline.

### High-Level Components
1.  **Client Layer (Mobile/Web)**: React/React Native frontend using Supabase Client for Realtime subscriptions.
2.  **API Gateway / Load Balancer**: Supabase handled (Kong).
3.  **Real-Time Engine**: Supabase Realtime (PostgreSQL Replication) for instant message delivery and presence implementation.
4.  **Database Layer**: PostgreSQL (Supabase) with optimized indexing, partitioning strategy, and JSONB for flexibility.
5.  **Automation Engine**: Supabase Edge Functions (Deno) for NLP analysis, intent detection, and auto-replies.
6.  **Background Workers**: pg_cron for scheduled escalation checks and cleanup.

---

## 2. Database Schema Design

### Core Tables

#### `support_tickets`
The central entity representing a support case.
- **PK**: `id` (UUID)
- **FK**: `user_id` (UUID -> auth.users), `assigned_to` (UUID -> admins)
- **Columns**:
    - `status` (enum: open, in_progress, resolved, closed, escalated)
    - `priority` (enum: low, medium, high, urgent)
    - `category` (enum: order, payment, rider, technical, other)
    - `metadata` (JSONB): Stores context like `{ "order_id": "123", "detected_intent": "late_delivery" }`
    - `unanswered_count` (int): For escalation logic.
    - `last_message_at` (timestamptz): For sorting.
- **Indexes**: `(user_id)`, `(assigned_to)`, `(status, last_message_at DESC)` for admin dashboard performance.

#### `support_messages`
Immutable ledger of all communications.
- **PK**: `id` (UUID)
- **FK**: `ticket_id` (UUID)
- **Columns**:
    - `sender_id` (UUID)
    - `is_admin` (boolean)
    - `message` (text)
    - `type` (enum: text, image, system)
    - `read_at` (timestamptz)
- **Indexes**: `(ticket_id, created_at ASC)` for chat history loading.

#### `admin_presence`
Tracks real-time availability of support agents.
- **PK**: `admin_id` (UUID)
- **Columns**:
    - `status` (enum: online, busy, offline)
    - `last_active_at` (timestamptz)
- **Logic**: Frontend sends "heartbeat" every 30s.

#### `auto_reply_templates`
Configurable responses for the automation engine.
- **Columns**: `category`, `keywords` (text[]), `reply_ur`, `reply_en`, `is_active`.

---

## 3. Real-Time Logic Flow

### A. Message Delivery (User -> Admin)
1.  User sends message via `sendMessage` mutation.
2.  **Supabase** inserts row into `support_messages`.
3.  **Trigger** updates `support_tickets.last_message_at` and `unanswered_count`.
4.  **Realtime** broadcasts `INSERT` event to subscribed Admins.
5.  **Admin Dashboard** updates UI instantly.

### B. Admin Presence System
1.  **Heartbeat**: Admin client updates `admin_presence` set `last_active_at = NOW()` every 30s.
2.  **Offline Detection**: If `last_active_at < NOW() - 2 minutes`, system considers admin offline.

---

## 4. Automation Engine (Edge Function)

**Trigger**: Database Webhook on `INSERT` to `support_messages` (if `is_admin = false`).

**Logic**:
1.  **Check Admin Status**: Query `admin_presence` for online admins.
2.  **If Admins Online**: Do nothing (Admin will handle).
3.  **If Admins Offline**:
    *   **Analyze Text**: Simple keyword matching (or call OpenAI API if upgraded).
    *   **Intent Detection**:
        *   "late", "delivery", "kahan" -> `Order Issue`
        *   "refund", "paisay" -> `Payment Issue`
    *   **Auto Reply**: Fetch template from `auto_reply_templates`.
    *   **Action**: Insert system message: "We are offline. [Auto Reply]".
    *   **Update Ticket**: Set `priority = high`.

---

## 5. Escalation Flow

1.  **Trigger**: User sends 3rd message without generic admin reply (tracked via `unanswered_count`).
2.  **Logic**:
    *   Update `support_tickets.status` = `escalated`.
    *   Update `support_tickets.priority` = `urgent`.
    *   **Notification**: Send Push Notification to All Admins ("Urgent Ticket Escalated!").
    *   **Reassurance**: Send system message to user: "Your case has been prioritized to senior support."

---

## 6. Security Implementation

1.  **Row Level Security (RLS)**:
    *   **Users**: Can `SELECT` and `INSERT` messages only for their own tickets (`ticket.user_id = auth.uid()`).
    *   **Admins**: Can `SELECT`, `UPDATE`, `INSERT` on ALL tickets. Service role required for automation.
2.  **Rate Limiting**:
    *   Supabase generic rate limiting enables.
3.  **Input Sanitation**: all text inputs sanitized on frontend and backend.

## 7. Performance Optimization

1.  **Indexes**: Covered in Schema Design. Crucial for the "10k users" requirement.
2.  **Pagination**: Messages loaded in chunks of 50.
3.  **Archiving**: Old closed tickets (> 6 months) moved to `archived_tickets` table (future phase).
4.  **Connection Pooling**: Supavisor used for database connections.

---
*Designed by Antigravity for Fast Haazir*
