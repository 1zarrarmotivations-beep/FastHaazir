# Rider Panel White Screen - Troubleshooting Guide

## Overview

This guide provides step-by-step instructions to diagnose and resolve the critical issue where the Rider Panel in the Admin Panel displays an empty white screen. The Rider Panel is rendered by the [`RidersManager`](frontend/src/components/admin/RidersManager.tsx:106) component and depends on multiple data sources, hooks, and UI components.

---

## Table of Contents

1. [Quick Diagnosis Checklist](#1-quick-diagnosis-checklist)
2. [Check Browser Console for Errors](#2-check-browser-console-for-errors)
3. [Check Network Requests](#3-check-network-requests)
4. [Analyze React Component Errors](#4-analyze-react-component-errors)
5. [Check Supabase Connection & Queries](#5-check-supabase-connection--queries)
6. [Memory Limit & Performance Issues](#6-memory-limit--performance-issues)
7. [JavaScript Conflicts & Bundle Issues](#7-javascript-conflicts--bundle-issues)
8. [Real-time Subscription Issues](#8-real-time-subscription-issues)
9. [Authentication & Permission Issues](#9-authentication--permission-issues)
10. [Step-by-Step Resolution](#10-step-by-step-resolution)

---

## 1. Quick Diagnosis Checklist

Before diving deep, run through this quick checklist:

| Check | Command/Action | Expected Result |
|-------|---------------|-----------------|
| Backend Running | Check Terminal 1 | `cd backend && node server.js` should be running |
| Frontend Running | Check Terminal 4 | `cd frontend && npm run dev` should be running |
| Browser Console | Press F12 → Console | No red error messages |
| Network Tab | Press F12 → Network | API requests returning 200 status |
| Supabase Connection | Check `.env` file | Valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |

---

## 2. Check Browser Console for Errors

### Step 2.1: Open Developer Tools

1. Open the Admin Panel in your browser
2. Press **F12** or **Ctrl+Shift+I** (Windows/Linux) or **Cmd+Option+I** (Mac)
3. Click on the **Console** tab
4. Navigate to the Riders tab in the admin panel

### Step 2.2: Look for Error Types

#### JavaScript Fatal Errors
Look for errors like:
```
Uncaught Error: Something went wrong
TypeError: Cannot read properties of undefined (reading '...')
ReferenceError: ... is not defined
```

#### React Error Boundaries
If you see the GlobalErrorBoundary fallback UI, check:
```javascript
// Location: frontend/src/components/GlobalErrorBoundary.tsx
// The error will be displayed in the UI
```

#### Common Console Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot read properties of undefined (reading 'filter')` | `riders` data is undefined | Add null checks in [`RidersManager.tsx:129`](frontend/src/components/admin/RidersManager.tsx:129) |
| `useAdminRiders is not a function` | Import error | Check import statement in component |
| `Network request failed` | Supabase connection issue | Check `.env` configuration |
| `JWT expired` | Session timeout | Re-authenticate |

### Step 2.3: Enable Verbose Logging

Add temporary logging to identify the issue:

```javascript
// In RidersManager.tsx, add after line 123:
console.log('[RidersManager] riders data:', riders);
console.log('[RidersManager] isLoading:', isLoading);
console.log('[RidersManager] error:', error);
```

---

## 3. Check Network Requests

### Step 3.1: Open Network Tab

1. Press **F12** → **Network** tab
2. Check **"Preserve log"** checkbox
3. Navigate to the Riders tab
4. Look for failed requests (red colored)

### Step 3.2: Identify Failed Requests

Look for requests to:
- `https://jqbwynomwwjhsebcicpm.supabase.co/rest/v1/riders*`
- `https://jqbwynomwwjhsebcicpm.supabase.co/rest/v1/rider_requests*`

### Step 3.3: Analyze Response

Click on a failed request and check:

| Status Code | Meaning | Action |
|-------------|---------|--------|
| 401 | Unauthorized | Check authentication token |
| 403 | Forbidden | Check RLS policies in Supabase |
| 404 | Not Found | Check table exists in Supabase |
| 500 | Server Error | Check Supabase logs |
| 0/CORS | CORS Error | Check Supabase CORS settings |

### Step 3.4: Check Request Headers

Verify these headers are present:
```
apikey: [your-anon-key]
Authorization: Bearer [user-token]
Content-Type: application/json
```

---

## 4. Analyze React Component Errors

### Step 4.1: Check Component Rendering Flow

The RidersManager component flow:
```
Admin.tsx (line 127-131)
    ↓
RidersManager.tsx
    ↓
useAdminRiders() hook (line 123)
    ↓
Supabase Query (useAdmin.tsx:256-267)
```

### Step 4.2: Add Error Boundary

Wrap the RidersManager with an error boundary:

```tsx
// In Admin.tsx, modify lines 127-131:
import { ErrorBoundary } from 'react-error-boundary';

// Replace the riders case:
case "riders":
  return (
    <ErrorBoundary
      fallback={<div className="p-4 text-red-500">Riders panel failed to load</div>}
      onError={(error) => console.error('[RidersManager Error]:', error)}
    >
      <div className="space-y-6">
        <RidersManager onNavigate={handleNavigate} />
      </div>
    </ErrorBoundary>
  );
```

### Step 4.3: Check for Null/Undefined Data

The component expects `riders` to be an array. Add defensive coding:

```typescript
// In RidersManager.tsx, line 129 - add null safety:
const filteredRiders = (riders as any[])?.filter((rider) => {
  // Add null check for rider object
  if (!rider) return false;
  
  const matchesSearch = safeLower(rider.name).includes(safeLower(searchQuery)) ||
    safeLower(rider.phone).includes(safeLower(searchQuery));
  // ... rest of filter logic
});
```

---

## 5. Check Supabase Connection & Queries

### Step 5.1: Verify Environment Variables

Check [`frontend/.env`](frontend/.env) file:

```env
VITE_SUPABASE_URL=https://jqbwynomwwjhsebcicpm.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 5.2: Test Supabase Connection

Run this in browser console:

```javascript
// Test connection
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  'https://jqbwynomwwjhsebcicpm.supabase.co',
  'your-anon-key'
);

// Test riders query
const { data, error } = await supabase
  .from('riders')
  .select('*')
  .limit(5);
  
console.log('Data:', data);
console.log('Error:', error);
```

### Step 5.3: Check RLS Policies

The `riders` table must have proper Row Level Security policies:

```sql
-- Check if policies exist
SELECT * FROM pg_policies WHERE tablename = 'riders';

-- Required policy for admin access
CREATE POLICY "Admins can view all riders"
ON riders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

### Step 5.4: Check Table Structure

Verify the riders table has required columns:

```sql
-- Check riders table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'riders';
```

Required columns:
- `id` (uuid, primary key)
- `name` (text)
- `phone` (text)
- `is_active` (boolean)
- `is_online` (boolean)
- `verification_status` (text)
- `created_at` (timestamp)

---

## 6. Memory Limit & Performance Issues

### Step 6.1: Check Browser Memory

1. Press **F12** → **Memory** tab
2. Click **"Take heap snapshot"**
3. Look for memory usage above 500MB

### Step 6.2: Check for Memory Leaks

Real-time subscriptions can cause memory leaks. Check cleanup:

```typescript
// In useAdmin.tsx, verify cleanup is called:
useEffect(() => {
  const channel = supabase.channel('admin-riders-realtime');
  
  // ... subscription setup
  
  return () => {
    console.log('[useAdminRiders] Cleaning up realtime subscription');
    supabase.removeChannel(channel);  // This MUST be called
  };
}, [queryClient]);
```

### Step 6.3: Optimize Large Datasets

If there are many riders, add pagination:

```typescript
// In useAdmin.tsx, modify the query:
return useQuery({
  queryKey: ["admin-riders"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("riders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);  // Add limit
      
    if (error) throw error;
    return data;
  },
});
```

### Step 6.4: Check Node.js Memory (Backend)

If backend is crashing:

```bash
# Check current memory limit
node --v8-options | grep "max-old-space-size"

# Increase memory limit
set NODE_OPTIONS=--max-old-space-size=4096
cd backend && node server.js
```

---

## 7. JavaScript Conflicts & Bundle Issues

### Step 7.1: Check for Import Errors

Verify all imports in [`RidersManager.tsx`](frontend/src/components/admin/RidersManager.tsx:1-54):

```typescript
// These imports must be valid:
import { useAdminRiders, useCreateRider, useToggleRiderStatus, useDeleteRider, useVerifyRider, useAdminUpdateRider } from "@/hooks/useAdmin";
import { useRiderAvailableBalance } from "@/hooks/useWithdrawals";
```

### Step 7.2: Check for Circular Dependencies

Run this command to detect circular dependencies:

```bash
cd frontend && npx madge --circular src/
```

### Step 7.3: Rebuild the Frontend

Clear cache and rebuild:

```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules
rm -rf .vite
npm install

# Rebuild
npm run build

# Or for development
npm run dev
```

### Step 7.4: Check for Version Conflicts

```bash
# Check for duplicate dependencies
npm ls | grep -i "duplicate\|UNMET"

# Update dependencies
npm update
```

---

## 8. Real-time Subscription Issues

### Step 8.1: Check WebSocket Connection

Real-time updates use WebSockets. Check in Network tab:
1. Filter by **"WS"** (WebSocket)
2. Look for connection to Supabase Realtime

### Step 8.2: Verify Realtime is Enabled

In Supabase Dashboard:
1. Go to **Database → Replication**
2. Ensure `riders` table has replication enabled

```sql
-- Enable realtime for riders table
ALTER PUBLICATION supabase_realtime ADD TABLE riders;
```

### Step 8.3: Check Subscription Status

Add logging to track subscription state:

```typescript
// In useAdmin.tsx, modify subscription:
const channel = supabase
  .channel('admin-riders-realtime')
  .on('postgres_changes', { ... }, (payload) => { ... })
  .subscribe((status) => {
    console.log('[useAdminRiders] Subscription status:', status);
    // Status can be: SUBSCRIBED, TIMED_OUT, CLOSED, CHANNEL_ERROR
  });
```

### Step 8.4: Handle Subscription Errors

```typescript
// Add error handling for realtime
.on('system', { event: 'disconnect' }, () => {
  console.warn('[Realtime] Disconnected - attempting reconnect');
})
```

---

## 9. Authentication & Permission Issues

### Step 9.1: Verify Admin Role

Check if user has admin role:

```javascript
// Run in browser console
const { data } = await supabase
  .from('user_roles')
  .select('*')
  .eq('user_id', (await supabase.auth.getUser()).data.user.id);
  
console.log('User roles:', data);
```

### Step 9.2: Check Auth State

The [`Admin.tsx`](frontend/src/pages/Admin.tsx:52-96) component checks:

```typescript
const { user, loading: authLoading } = useAuth();
const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

// If not admin, shows "Restricted Access" screen
if (!isAdmin) {
  return <RestrictedAccess />;
}
```

### Step 9.3: Fix Missing Admin Role

```sql
-- Add admin role for user
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid-here', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Step 9.4: Check Token Expiry

```javascript
// Check if session is valid
const { data: { session } } = await supabase.auth.getSession();
console.log('Session expires at:', new Date(session?.expires_at * 1000));
```

---

## 10. Step-by-Step Resolution

### Complete Diagnostic Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHITE SCREEN DIAGNOSIS                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Check Browser Console                                    │
│ - Open F12 → Console                                             │
│ - Look for red error messages                                    │
│ - Note the error type and message                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌───────────────┐   ┌───────────────┐
            │ Errors Found  │   │ No Errors     │
            └───────────────┘   └───────────────┘
                    │                   │
                    ▼                   ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│ Step 2: Analyze Error Type  │   │ Step 3: Check Network       │
│ - TypeError → Null check    │   │ - Check API responses       │
│ - ReferenceError → Import   │   │ - Check auth headers        │
│ - NetworkError → Connection │   │ - Check for CORS issues     │
└─────────────────────────────┘   └─────────────────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Check Supabase                                          │
│ - Verify connection string                                      │
│ - Test query in browser console                                 │
│ - Check RLS policies                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Check Authentication                                    │
│ - Verify user is logged in                                      │
│ - Verify admin role exists                                      │
│ - Check session validity                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 6: Apply Fix                                               │
│ - Fix identified issue                                          │
│ - Clear browser cache                                           │
│ - Restart development server                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Fix Commands

```bash
# 1. Restart both servers
# Terminal 1:
cd backend && node server.js

# Terminal 2:
cd frontend && npm run dev

# 2. Clear all caches
cd frontend
rm -rf node_modules/.vite
rm -rf .vite
npm run dev

# 3. Reinstall dependencies
cd frontend
npm install

# 4. Check for TypeScript errors
npx tsc --noEmit
```

### Emergency Fallback

If the issue persists, add a loading state and error message:

```typescript
// In RidersManager.tsx, add after line 123:
const { data: riders, isLoading, error } = useAdminRiders();

// Add error handling in return statement:
if (isLoading) {
  return <div className="p-4">Loading riders...</div>;
}

if (error) {
  return (
    <div className="p-4 text-red-500">
      Error loading riders: {error.message}
    </div>
  );
}
```

---

## Common Issues & Solutions Summary

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Null Data** | `Cannot read properties of undefined` | Add null checks in filter operations |
| **Auth Failure** | Redirected to login | Check session and admin role |
| **CORS Error** | Network requests blocked | Configure Supabase CORS settings |
| **RLS Policy** | Empty data returned | Add admin read policy on riders table |
| **WebSocket Fail** | No real-time updates | Enable replication on riders table |
| **Memory Leak** | Browser becomes slow | Check useEffect cleanup functions |
| **Import Error** | Component doesn't render | Fix import paths and reinstall deps |
| **Bundle Error** | White screen on load | Rebuild frontend with `npm run build` |

---

## Related Files

- [`frontend/src/components/admin/RidersManager.tsx`](frontend/src/components/admin/RidersManager.tsx) - Main rider panel component
- [`frontend/src/hooks/useAdmin.tsx`](frontend/src/hooks/useAdmin.tsx) - Admin hooks including `useAdminRiders`
- [`frontend/src/pages/Admin.tsx`](frontend/src/pages/Admin.tsx) - Admin page layout
- [`frontend/src/components/GlobalErrorBoundary.tsx`](frontend/src/components/GlobalErrorBoundary.tsx) - Error boundary
- [`backend/server.js`](backend/server.js) - Backend server

---

## Need More Help?

If the issue persists after following this guide:

1. Check Supabase Dashboard logs at https://supabase.com/dashboard
2. Review browser console for any missed errors
3. Test with a different browser to rule out browser-specific issues
4. Create a minimal reproduction to isolate the problem
