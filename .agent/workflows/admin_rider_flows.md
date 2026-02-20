---
description: Test Admin Adding Rider Email and Rider Application Flow
---

# Admin Add Rider Email & Rider Application Flow Test

This workflow verifies the two key rider management functionalities.

## 1. Admin Adds Rider Email
1. Login as Admin.
2. Navigate to **Riders** tab.
3. Click **Add Rider**.
4. Enter Name, Phone, and **Email/Password**.
   - Note: This uses the `create-user` edge function.
5. Click **Create Rider**.
   - Verify success toast "Rider created successfully!".
6. Logout.
7. Login as the new Rider using the Email/Password.
8. Verify you are redirected to the **Rider Dashboard** (`/rider`).

## 2. Rider Application & Approval
1. Open a new Incognito window (or logout).
2. Go to `/rider/register`.
3. Fill out the application form (Personal, Vehicle, Documents).
4. Submit the application.
   - Verify you see the "Registration Submitted!" (Pending) screen.
5. Refresh the page.
   - Verify you STILL see the "Pending" screen (persistence check).
6. Login as Admin in the main window.
7. Navigate to **Riders** -> **Applications** tab.
8. Find the new application.
9. Click **Approve & Activate**.
   - Verify success toast.
10. Switch back to the Rider window (or login as that rider if you created an account during app).
11. Refresh or Login.
12. Verify you are now redirected to the **Rider Dashboard** (`/rider`).

## Troubleshooting
- If Rider is not redirected to dashboard:
  - Check `profiles` table: `role` should be 'rider'.
  - Check `riders` table: `verification_status` should be 'verified'.
- If Application "Pending" screen is lost on refresh:
  - Ensure `RiderRegistration.tsx` is checking `rider_applications` table via `useRiderApplication` hook.
