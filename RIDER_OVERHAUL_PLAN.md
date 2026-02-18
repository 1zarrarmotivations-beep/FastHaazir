# Rider Management Architecture Overhaul - Implementation Plan

## Objective
Rebuild the Rider Management, Role System, and Authentication architecture to production standards. This ensures a single source of truth (the `profiles` table), backend-controlled role assignments, and robust Super Admin control.

## Database Overhaul (SQL Migration)
1.  **Refine Custom Types:**
    *   Add `super_admin` to `app_role` enum.
    *   Create `profile_status` enum: `active`, `pending`, `blocked`.
2.  **`profiles` Table Updates:**
    *   Rename `is_blocked` to `status` (converted to `profile_status`).
    *   Add `last_login_at` column.
    *   Ensure strict uniqueness on `email` and `phone`.
3.  **`rider_profiles` Table:**
    *   If `riders` exists, ensure it links to `profiles.id`.
    *   Standardize columns: `vehicle_type`, `vehicle_number`, `cnic`, `license_number`, `is_online`, `is_verified`.
4.  **`rider_applications` Table:**
    *   Track documents, status, and reviewer info.
5.  **Security & Functions:**
    *   Bulletproof `get_my_role()` RPC.
    *   Add `set_user_role(user_id, new_role)` (Super Admin only).
    *   Update `handle_new_user()` trigger to maintain `profiles` integrity.
    *   Implement RLS policies using `auth.uid()` and role-based checks.

## Frontend Implementation
1.  **Authentication Flow (Auth.tsx):**
    *   Eliminate local assumptions about roles.
    *   Always fetch role from `get_my_role()` after login.
    *   Implement strict redirection logic:
        *   `super_admin` -> Admin Dashboard (with god mode)
        *   `admin` -> Admin Dashboard
        *   `rider` (active) -> Rider Dashboard
        *   `rider` (pending) -> Rider Registration/Pending page
        *   `customer` -> Customer App
        *   `blocked` -> Access Denied page
2.  **Global Auth Hook (`useAuth.tsx` / `useFirebaseAuth.tsx`):**
    *   Clear all storage and cache on sign-out.
    *   Expose `profile` and `role` globally with proper loading states.
3.  **Admin Panel UI:**
    *   **User Management:** Searchable list of all users with role/status editing.
    *   **Rider Applications:** Approval/Rejection interface.
    *   **Super Admin Settings:** System-wide overrides.

## Security Hardening
*   Backend middleware for all API/RPC calls.
*   Audit logging for sensitive actions (role changes, payouts).
*   Enforce `global` sign-out to invalidate all sessions.

## Testing Checklist
- [ ] Admin adds rider -> Rider logs in -> Lands on correct dashboard.
- [ ] Customer applies -> Admin approves -> Role updates instantly.
- [ ] Super Admin changes self/other role -> Reflected instantly.
- [ ] Blocked user cannot access any dashboard.
- [ ] Duplicate profile check (using existing phone/email).
