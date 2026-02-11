# Professional Live Support Chat System Design
**Project: Fast Haazir | Role: Senior Product Designer**

## 1. System Overview
This system is designed to handle support for Customers, Riders, and Admins in a unified, scalable way. It combines strict ticket tracking with the immediacy of live chat (WhatsApp style).

### Core Philosophy
- **Immediacy**: Users want instant reassurance.
- **Automation**: Admins cannot be online 24/7. The system must act as a buffer.
- **Cultural Fit**: Native Urdu support with correct RTL layout and typography.

## 2. Chat Flow Design

### A. Customer/Rider Flow
1.  **User Opens Support**: Sees previous chats or "New Ticket" button.
2.  **Creation**: User selects a category (Order, Payment, Tech) and types a message.
3.  **Smart Analysis (Client-Side)**:
    *   System detects keywords (e.g., "late", "missing", "crash").
    *   System checks Admin Online Status.
4.  **Immediate Response**:
    *   **If Admin Online**: "An agent will be with you shortly." (Glow effect).
    *   **If Admin Offline**: "We are currently offline. Your ticket has been logged. Priority: High." (Auto-reply based on keywords).
        *   *Simulated Bot Message*: "I see you have an issue with an order. Can you provide the Order ID?"
5.  **Live Chat**:
    *   User and Admin exchange messages in real-time.
    *   Typing indicators ("Admin is typing...").
    *   Read receipts (Double checks).

### B. Admin Flow
1.  **Dashboard**: A "WhatsApp Web" style interface.
    *   **Left Panel**: List of active chats, sorted by "Last Updated" and "Priority".
        *   Badges for "Unread", "Urgent".
    *   **Right Panel**: Chat window + specific user metadata (Order history, current location).
2.  **Quick Actions**:
    *   "Resolve Ticket".
    *   "Send Saved Reply" (e.g., "Rider is on the way").
    *   "Escalate to Super Admin".

## 3. Automation Logic Structure
Smart categorization happens instantly when a ticket is created.

| Keywords (English/Urdu) | Category | Priority | Auto-Reply (Urdu/English) |
| :--- | :--- | :--- | :--- |
| late, delay, wait, kahan hai | Order Issue | **High** | "Rider ki location check ki ja rhi hai. Please wait." / "Checking rider location..." |
| wrong item, missing, thanda | Food Quality | **Medium** | "Picture upload karein tasdeeq ke liye." / "Please upload a picture for verification." |
| crash, bug, error, login | Technical | **Low** | "Technical team ko agah kar dia gya hai." / "Technical team notified." |
| payment, refund, wallet, credit | Payment | **High** | "Account ID batayein." / "Please share your Account ID." |

## 4. Database Structure
Enhancing `support_tickets` and `support_messages` for scalability.

```sql
-- Enhanced Support Tickets
ALTER TABLE support_tickets 
ADD COLUMN priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
ADD COLUMN assigned_to UUID REFERENCES admins(id),
ADD COLUMN is_resolved BOOLEAN DEFAULT FALSE,
ADD COLUMN metadata JSONB DEFAULT '{}'; -- Store detected keywords, order_id, etc.

-- Admin Status Tracking
CREATE TABLE admin_status (
  admin_id UUID REFERENCES admins(id) PRIMARY KEY,
  is_online BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Auto Replies (Scalable)
CREATE TABLE support_auto_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  keywords TEXT[], -- array of keywords
  reply_text_en TEXT,
  reply_text_ur TEXT
);
```

## 5. UI/UX Specifications

### Chat Bubble Design
- **User**: fast-haazir-green background, right aligned (RTL for Urdu), white text.
- **Admin**: White background, left aligned, dark text, gray border.
- **System/Bot**: Centered, small gray text, capsule shape.

### Typography
- **English**: Inter / SF Pro (System Default).
- **Urdu**: **Jameel Noori Nastaleeq** (Primary) -> Noto Nastaliq Urdu (Fallback).
- **Size**: 16px for readability.

### Interactivity
- **Send Button**: Vibrates on mobile (haptic feedback).
- **Status Indicators**:
    *   Online: Green dot.
    *   Offline: Grey dot + "Last seen X mins ago".

## 6. Escalation System
If a ticket remains "Open" for > 30 minutes with no Admin reply:
1.  **System**: Auto-marks ticket as "Urgent".
2.  **Notification**: Sends push notification to all Admins.
3.  **User Update**: "Sorry for the delay, we are prioritizing your request."

---
*Created by Antigravity for Fast Haazir*
