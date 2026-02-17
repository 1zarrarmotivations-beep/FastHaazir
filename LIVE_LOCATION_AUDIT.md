# Live Location System Audit & Fix Report

## 1. System Architecture Audit

### Backend Logic (`server.js`)
After a comprehensive audit of `backend/server.js`, we confirmed that **this file is NOT involved in the live location tracking flow**.
- The server handles menu OCR, PayUp payments, and admin verification.
- It does **not** process WebSocket connections or location coordinates.
- **Conclusion**: The "backend" for location tracking is entirely **Supabase Realtime** (managed service), not the custom Node.js server. This is the correct architecture for this application.

### Frontend Implementation (`RidersManager.tsx` & `useAdmin.tsx`)
- **`RidersManager.tsx`**: Correctly uses `useAdminRiders` to fetch and display the list of riders. It does not handle map visualization directly.
- **`useAdmin.tsx` (`useAdminRiders`)**: 
  - Correctly sets up a Supabase Realtime subscription to the `riders` table.
  - Listens for `INSERT`, `UPDATE`, `DELETE` events.
  - Invalidates `admin-riders` query on change, triggering a re-fetch.
  - **Verdict**: Robust and correct.

### Admin Map (`LiveRidersMap.tsx`)
- **Issue Found**: This component was setting up a **redundant** realtime subscription to the `riders` table, while *also* using `useAdminRiders` (which has its own subscription).
- **Impact**: This caused double event listening and potentially wasted resources / connection limits.
- **Fix Applied**: Removed the manual subscription in `LiveRidersMap.tsx`. It now relies purely on the data updates propagated by `useAdminRiders`, ensuring a single source of truth and efficient re-rendering.

## 2. Validated Data Flow

The corrected data flow is now fully streamlined:

1.  **Rider App**: 
    -   `useRiderLocation` hook captures GPS coordinates.
    -   Updates `riders` table in Supabase directly via `update()`.
    -   throttled to every 5 seconds.

2.  **Database**: 
    -   Supabase records the change in `riders` table.
    -   Triggers a Realtime event (postgres_changes).

3.  **Admin Panel**:
    -   `useAdminRiders` hook receives the Realtime event.
    -   Invalidates Query Cache (`admin-riders`).
    -   Fetches fresh data (including new lat/lng/speed).
    -   `LiveRidersMap` component re-renders automatically with new positions.

## 3. Troubleshooting & Next Steps

If you still experience issues with location updates:

1.  **Check RLS Policies**: Ensure the `riders` table allows `UPDATE` by the rider role and `SELECT` by the admin role.
2.  **Verify Rider GPS**: Ensure the rider's device has GPS enabled and permissions granted (handled by `useRiderLocation`).
3.  **Realtime Quotas**: Check Supabase dashboard to ensure you haven't exceeded concurrent connection limits.


## 4. Customer-Side Fix (Critical)

### Issue: "Customer can't get live rider"
- **Investigation**: The customer app uses `useOnlineRiders` hook which calls a Supabase RPC function `get_online_riders`.
- **Finding**: The `get_online_riders` SQL function (and its fallback view `public_rider_info`) was failing with error `column r.is_blocked does not exist`.
- **Root Cause**: The database schema for `riders` table does not have an `is_blocked` column, but the SQL function was trying to filter by it (`WHERE is_blocked = false`).
- **Fix Applied**: Updated the SQL function `get_online_riders`, `get_all_riders_for_map`, and `get_rider_public_info` to remove the `is_blocked` check. The system now relies on `is_active = true` to determine availability.
- **Result**: The RPC now successfully returns a list of online riders. Customers should now see available riders on the map.
