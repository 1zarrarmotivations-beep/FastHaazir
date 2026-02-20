import { supabase } from "@/integrations/supabase/client";

/**
 * PHASE 2 – UNIFIED ROLE SYSTEM
 * Single Source of Truth is the Database (profiles + riders tables).
 */
export type AppRole = 'super_admin' | 'admin' | 'rider' | 'business' | 'customer';

export interface RoleResolution {
    role: AppRole;
    name?: string;
    riderStatus?: 'pending' | 'verified' | 'rejected' | 'none';
    isBlocked: boolean;
    needsRegistration: boolean;
    profileId?: string;
}

/**
 * CENTRALIZED ROLE RESOLVER
 * Uses 'get_unified_role' RPC to fetch the definitive role from the backend.
 * No client-side role guessing.
 */
export const roleResolver = async (userId: string, email?: string, phone?: string): Promise<RoleResolution> => {
    // Debug Logging
    console.log(`[RoleResolver] 🔒 Validating Role for: ${userId}`);
    if (email) console.log(`[RoleResolver] 📧 Email: ${email}`);
    if (phone) console.log(`[RoleResolver] 📱 Phone: ${phone}`);

    try {
        // 1. Call Unified RPC
        // This function encapsulates all logic: Admin checks, Rider status checks, Block checks.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: unified, error } = await (supabase.rpc as any)('get_unified_role', { target_user_id: userId });

        if (error) {
            console.error("[RoleResolver] ❌ RPC Failure:", error);
            // Robustness: If RPC fails, fallback to 'customer' to avoid blocking legitimate logins completely,
            // but log significantly. In a strict system, we might block access, but for now 'customer' is safer.
            return { role: 'customer', isBlocked: false, needsRegistration: false };
        }

        console.log(`[RoleResolver] 🛡️ Backend Response:`, unified);

        const role = (unified as any).role || 'customer';
        const status = (unified as any).status || 'active'; // approved, pending, rejected, blocked, active
        const isBlocked = (unified as any).is_blocked === true;

        // 2. Map Backend Status to Frontend Types
        let riderStatus: RoleResolution['riderStatus'] = 'none';

        if (role === 'rider') {
            if (status === 'approved') riderStatus = 'verified';
            else if (status === 'pending') riderStatus = 'pending';
            else if (status === 'rejected') riderStatus = 'rejected';
            else riderStatus = 'pending'; // Safe default for rider role
        }

        // 3. Admin Protection (Frontend Safeguard)
        // Even if backend sends 'admin', if we wanted to enforce strict UIDs here we could,
        // but the RPC is the trusted source.

        return {
            role: role as AppRole,
            riderStatus,
            isBlocked,
            needsRegistration: false, // RPC implies registration is sufficient if a role is returned
            profileId: userId // implicit
        };

    } catch (e) {
        console.error("[RoleResolver] 🚨 Exception in logic:", e);
        return { role: 'customer', isBlocked: false, needsRegistration: false };
    }
};
