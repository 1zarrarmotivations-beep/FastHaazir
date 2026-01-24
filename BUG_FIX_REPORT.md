# BUG FIX: Customer Side Not Showing Businesses

## Root Cause Identified

The customer-side pages (`/restaurants`, `/grocery`, etc.) were querying from `public_business_info` **VIEW** instead of the `businesses` **TABLE**.

### BEFORE (Broken Query):
```typescript
// In useBusinesses.tsx
let query = supabase
  .from('public_business_info')  // ❌ VIEW - may have RLS restrictions or data issues
  .select('*')
  .eq('is_active', true)
  .eq('type', type);
```

### AFTER (Fixed Query):
```typescript
// In useBusinesses.tsx
let query = supabase
  .from('businesses')  // ✅ Direct table access with selected non-sensitive fields
  .select('id, name, type, image, rating, eta, distance, category, description, featured, is_active')
  .eq('is_active', true)
  .eq('type', normalizedType);  // Now also normalizes type to lowercase
```

## Why Admin Worked But Customer Didn't

| Query | Source | Filter |
|-------|--------|--------|
| **Admin** (`useAdminBusinesses`) | `businesses` table | None (shows all) |
| **Customer** (`useBusinesses`) | `public_business_info` view | `is_active=true`, `type=<type>` |

The `public_business_info` view likely had:
1. RLS (Row Level Security) policies blocking anonymous/customer access
2. Data synchronization issues with the base table
3. Different column definitions or missing data

## Files Modified

### 1. `/app/frontend/src/hooks/useBusinesses.tsx`
- **Changed**: Query now fetches from `businesses` table directly instead of `public_business_info` view
- **Added**: Type normalization to lowercase for consistent matching
- **Added**: Fallback to view if direct table access fails
- **Added**: `useBusinessesDebug` hook for admin-only debugging
- **Added**: Detailed console logging for troubleshooting

### 2. `/app/frontend/src/pages/Restaurants.tsx`
- **Added**: Debug overlay component (admin-only)
- **Added**: Bug icon button in header for admins to toggle debug panel
- **Added**: Shows total businesses, active count, filtered count, and reasons for exclusion

## Debug Overlay (Admin Only)

When logged in as admin, a bug icon appears in the restaurants page header. Clicking it shows:
- Total businesses in database
- Number of active businesses
- Number matching the requested type (restaurant)
- List of businesses filtered out with reasons (INACTIVE or TYPE_MISMATCH)

## Verification Steps

1. Login as Admin
2. Create a business with type "restaurant" and set `is_active = true`
3. Go to `/restaurants` page
4. Business should now appear

If businesses still don't show:
1. Click the bug icon (admin only)
2. Check the debug panel for:
   - Total in DB count
   - Active count
   - Filtered out reasons

## Console Logs Added

Look for these in browser console:
- `[useBusinesses] Fetching businesses, requested type: restaurant`
- `[useBusinesses] Fetched businesses: { count: X, type: "restaurant", businesses: [...] }`
- `[useBusinessesDebug] Debug info: { totalInDb: X, activeCount: Y, filteredByType: Z, filteredOut: [...] }`
