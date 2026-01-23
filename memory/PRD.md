# Fast Haazir - Product Requirements Document

## Project Overview
**Fast Haazir** is Quetta's on-demand delivery application. It provides a complete delivery ecosystem connecting customers with local businesses (restaurants, grocery stores, bakeries) through a network of delivery riders.

## Architecture
The system follows an **Admin-Controlled Model** where:
- **Admin** has complete control over businesses, menus, and order management
- **Customers** can browse businesses, view menus, and place orders
- **Riders** can accept deliveries and update order status
- **NO Business Owner Login** - All business management is handled by admin

### Flow
```
Admin → Creates business & menu items
Customer → Places order → Order appears in admin panel
Admin → Accepts order → Assigns rider (online riders only)
Rider → Picks up → Delivers to customer
```

## Tech Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS + ShadCN UI
- **Backend**: Supabase (Database, Auth, Realtime, Storage)
- **State Management**: TanStack Query (React Query)
- **Mobile**: Capacitor for PWA/native conversion
- **Authentication**: Firebase Phone Auth + Supabase Auth

## Core Features

### Admin Panel (100% Admin-Controlled)
- [x] Dashboard with animated statistics (EnhancedStatsCards)
- [x] Real-time order management with command center UI
- [x] Business CRUD (create, edit, delete, enable/disable)
- [x] Menu item management with image uploads
- [x] Rider assignment (online riders only)
- [x] Order status updates (placed → preparing → on_way → delivered)
- [x] Rider management and payments tracking
- [x] Push notification center

### Customer App
- [x] Business browsing (restaurants, grocery, bakery)
- [x] Menu viewing and cart management
- [x] Order placement
- [x] Order tracking
- [x] Order history

### Rider Dashboard
- [x] Online/offline toggle
- [x] Active deliveries view
- [x] Order acceptance
- [x] Delivery completion

## What's Been Implemented (January 2026)

### Session: UI Enhancement & Business Role Removal
**Date**: January 23, 2026

**Completed:**
1. ✅ **EnhancedStatsCards Integration** - Replaced old StatsCards with animated, gradient-styled statistics cards in Admin dashboard
2. ✅ **Business Owner Fields Removed** - Removed owner_phone and owner_email from:
   - Create business form
   - Edit business dialog
   - Business card display
3. ✅ **Enhanced OrdersManager** - Complete UI overhaul with:
   - Command center layout with real-time order statistics
   - Color-coded order status cards
   - Live "New Orders" alert banner
   - Improved action panel with gradient buttons
   - Rider assignment with online status indicators
   - Detailed order information display
4. ✅ **Build Verification** - Production build successful with no errors

**Files Modified:**
- `/app/frontend/src/pages/Admin.tsx` - EnhancedStatsCards now rendered
- `/app/frontend/src/components/admin/BusinessesManager.tsx` - Removed business owner fields
- `/app/frontend/src/components/admin/OrdersManager.tsx` - Complete UI overhaul

## Pending Tasks

### P0 (Critical)
- [ ] Apply database migration (`/app/supabase/migrations/20260123_remove_business_role.sql`) to fully remove business role

### P1 (High Priority)
- [ ] Image upload testing with actual Supabase storage bucket
- [ ] End-to-end flow testing: Admin → Customer → Rider

### P2 (Nice to Have)
- [ ] Android APK build (blocked on Android SDK installation)
- [ ] Break down `useAdmin.tsx` into smaller hooks

## Database Schema (Key Tables)
- `businesses`: id, name, type, image_url, is_active, featured, category, commission_rate
- `menu_categories`: id, business_id, name
- `menu_items`: id, category_id, name, price, image_url, is_available
- `orders`: id, customer_id, business_id, rider_id, status, total, delivery_address, delivery_fee
- `riders`: id, user_id, name, is_active, is_online, vehicle_type
- `users`: id, phone, role (admin/rider/customer)

## Test Credentials
- **OTP Code (Testing)**: `911911`

## Key Files Reference
- Admin Page: `/app/frontend/src/pages/Admin.tsx`
- Enhanced Stats: `/app/frontend/src/components/admin/EnhancedStatsCards.tsx`
- Orders Manager: `/app/frontend/src/components/admin/OrdersManager.tsx`
- Businesses Manager: `/app/frontend/src/components/admin/BusinessesManager.tsx`
- Image Upload: `/app/frontend/src/components/admin/ImageUpload.tsx`
- Admin Hooks: `/app/frontend/src/hooks/useAdmin.tsx`
