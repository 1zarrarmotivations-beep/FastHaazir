-- Clean up all riders and their related data to start fresh
-- WARNING: This deletes rider accounts and history!

BEGIN;

-- 1. Unlink dependencies (Optional: set to NULL or delete depending on business logic)
-- Assuming we want to keep order history but disassociate from deleted riders
UPDATE public.orders SET rider_id = NULL WHERE rider_id IS NOT NULL;
UPDATE public.rider_requests SET rider_id = NULL WHERE rider_id IS NOT NULL;

-- 2. Delete strictly dependent tables
DELETE FROM public.rider_wallets;
DELETE FROM public.rider_payments;
DELETE FROM public.withdrawal_requests;
DELETE FROM public.rider_trips;
DELETE FROM public.rider_performance_daily;
DELETE FROM public.order_ratings WHERE rider_id IS NOT NULL;
DELETE FROM public.rider_rating_stats;
DELETE FROM public.rider_wallet_adjustments;

-- 3. Reset Roles for existing Users who were riders
-- Find users who are currently riders
UPDATE public.profiles
SET role = 'customer'
WHERE role = 'rider';

UPDATE public.user_roles
SET role = 'customer'
WHERE role = 'rider';

-- 4. Delete the Riders
DELETE FROM public.riders;

COMMIT;
