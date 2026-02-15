import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * PHASE 2 – PREVENT ROLE MIXING
 * Standardize role values and ensure consistency.
 */
export type AppRole = 'admin' | 'rider' | 'business' | 'customer';

export interface RoleResolution {
    role: AppRole;
    riderStatus?: 'pending' | 'verified' | 'rejected' | 'none';
    isBlocked: boolean;
    needsRegistration: boolean;
}

// Type for get_my_role RPC response
interface GetMyRoleResponse {
    role: string;
    is_blocked: boolean;
    needs_registration: boolean;
}

// Type for resolve_role_by_email/phone RPC response
interface ResolveRoleResponse {
    role: string;
    is_blocked: boolean;
}

/**
 * PHASE 1 & 3 & 5 & 6 – ROLE RESOLVER
 * Safe role validation layer with database as source of truth.
 * 
 * Uses get_my_role() which returns: role, is_blocked, needs_registration
 * This is the PRIMARY role resolution function.
 */
export const roleResolver = async (userId: string, email?: string): Promise<RoleResolution> => {
    // PHASE 6 – DEBUG LOGGER
    console.log(`[RoleResolver] 🔍 Starting validation for: ${email || userId}`);

    try {
        // PHASE 5 – ASYNC FIX: Use the new get_my_role function
        // This function returns a table with role, is_blocked, needs_registration
        const { data: roleData, error: roleError } = await (supabase.rpc as any)('get_my_role');

        if (roleError) {
            console.error("[RoleResolver] ❌ RPC error fetching role:", roleError);
            // Fallback: try to resolve via email/phone sync
            return await fallbackRoleResolution(userId, email);
        }

        // get_my_role returns a table, so roleData is an array with one row
        // New format: { role: string, is_blocked: boolean, needs_registration: boolean }
        let resolvedRole = 'customer';
        let isBlocked = false;
        let needsRegistration = false;

        if (roleData) {
            // Handle both array and single object responses
            const roleRow = Array.isArray(roleData) ? roleData[0] : roleData;
            if (roleRow) {
                resolvedRole = (roleRow.role || 'customer').toLowerCase();
                isBlocked = roleRow.is_blocked === true;
                needsRegistration = roleRow.needs_registration === true;
            }
        }

        // Standardize role
        let standardizedRole: AppRole = 'customer';
        if (resolvedRole === 'admin') standardizedRole = 'admin';
        else if (resolvedRole === 'rider') standardizedRole = 'rider';
        else if (resolvedRole === 'business') standardizedRole = 'business';
        else standardizedRole = 'customer';

        console.log(`[RoleResolver] 👤 Resolved Role: ${standardizedRole}, Blocked: ${isBlocked}, NeedsReg: ${needsRegistration}`);

        // PHASE 3 – RIDER VALIDATION CHECK
        if (standardizedRole === 'rider') {
            // If needs_registration is true, return early
            if (needsRegistration) {
                return {
                    role: 'rider',
                    riderStatus: 'none',
                    isBlocked: false,
                    needsRegistration: true
                };
            }

            // If blocked by is_active, return blocked status
            if (isBlocked) {
                return {
                    role: 'rider',
                    riderStatus: 'rejected',
                    isBlocked: true,
                    needsRegistration: false
                };
            }

            // Get rider details for verification status
            const { data: rider, error: riderError } = await supabase
                .from('riders')
                .select('verification_status, is_active')
                .eq('user_id', userId)
                .maybeSingle();

            if (riderError) {
                console.error("[RoleResolver] ❌ Error fetching rider details:", riderError);
            }

            const riderObj = rider as Record<string, unknown>;
            const riderStatus = (riderObj?.verification_status || 'pending') as 'pending' | 'verified' | 'rejected';

            console.log(`[RoleResolver] 🏍️ Rider Status: ${riderStatus}, Active: ${!isBlocked}`);

            return {
                role: 'rider',
                riderStatus,
                isBlocked,
                needsRegistration: false
            };
        }

        // Admin or Customer path
        return {
            role: standardizedRole,
            isBlocked,
            needsRegistration
        };

    } catch (error) {
        console.error("[RoleResolver] 🚨 Critical failure in resolver:", error);
        // Try fallback before giving up
        return await fallbackRoleResolution(userId, email);
    }
};

/**
 * Fallback role resolution when get_my_role fails
 * This attempts to sync role from email/phone
 */
async function fallbackRoleResolution(userId: string, email?: string): Promise<RoleResolution> {
    console.log("[RoleResolver] 🔄 Attempting fallback resolution...");

    if (!email) {
        return { role: 'customer', isBlocked: false, needsRegistration: false };
    }

    try {
        const isEmail = email.includes('@');
        const rpcName = isEmail ? 'resolve_role_by_email' : 'resolve_role_by_phone';
        const rpcParam = isEmail ? { _email: email } : { _phone: email };

        const { data: syncData, error: syncError } = await (supabase.rpc as any)(rpcName, rpcParam);

        if (syncError || !syncData || (syncData as unknown[]).length === 0) {
            console.log("[RoleResolver] Fallback failed, defaulting to customer");
            return { role: 'customer', isBlocked: false, needsRegistration: false };
        }

        const synced = Array.isArray(syncData) ? syncData[0] : syncData;
        if (!synced) {
            return { role: 'customer', isBlocked: false, needsRegistration: false };
        }

        const syncedRole = (synced.role || 'customer').toLowerCase();
        const isBlocked = synced.is_blocked === true;

        console.log(`[RoleResolver] ✅ Fallback resolved to: ${syncedRole}`);

        // Map to standardized role
        let standardizedRole: AppRole = 'customer';
        if (syncedRole === 'admin') standardizedRole = 'admin';
        else if (syncedRole === 'rider') standardizedRole = 'rider';
        else if (syncedRole === 'business') standardizedRole = 'business';

        return {
            role: standardizedRole,
            isBlocked,
            needsRegistration: false
        };
    } catch (error) {
        console.error("[RoleResolver] Fallback error:", error);
        return { role: 'customer', isBlocked: false, needsRegistration: false };
    }
}
