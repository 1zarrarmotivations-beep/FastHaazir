import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { safeLower } from "./utils";

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
 * 
 * FALLBACK: If RPC fails, directly query user_roles table
 */
export const roleResolver = async (userId: string, email?: string): Promise<RoleResolution> => {
    // PHASE 6 – DEBUG LOGGER
    console.log(`[RoleResolver] 🔍 Starting validation for: ${email || userId}`);
    console.log(`[RoleResolver] 📋 Received userId: ${userId}`);

    try {
        // PHASE 5 – ASYNC FIX: Use the new get_my_role function
        // This function returns a table with role, is_blocked, needs_registration
        console.log(`[RoleResolver] 📡 Calling get_my_role() RPC...`);
        const { data: roleData, error: roleError } = await (supabase.rpc as any)('get_my_role');

        if (roleError) {
            console.error("[RoleResolver] ❌ RPC error fetching role:", roleError);
            // Fallback: try direct query
            console.log("[RoleResolver] 🔄 Falling back to direct query...");
            return await directRoleQuery(userId);
        }

        console.log(`[RoleResolver] 📥 get_my_role response:`, roleData);

        // get_my_role returns a table, so roleData is an array with one row
        // New format: { role: string, is_blocked: boolean, needs_registration: boolean }
        let resolvedRole = 'customer';
        let isBlocked = false;
        let needsRegistration = false;

        if (roleData && Array.isArray(roleData) && roleData.length > 0) {
            const roleRow = roleData[0];
            if (roleRow) {
                resolvedRole = safeLower(roleRow.role || 'customer');
                isBlocked = roleRow.is_blocked === true;
                needsRegistration = roleRow.needs_registration === true;

                console.log(`[RoleResolver] ✅ RPC returned role: ${resolvedRole}, blocked: ${isBlocked}, needsReg: ${needsRegistration}`);
            }
        } else {
            console.log("[RoleResolver] ⚠️ RPC returned empty data, falling back to direct query");
            return await directRoleQuery(userId);
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
        // NEW: If resolved as customer but email/phone provided, check if they exist in rider/admin tables
        if (standardizedRole === 'customer' && email) {
            console.log(`[RoleResolver] 🕵️ Role is customer, checking email/phone for matches: ${email}`);
            const syncResult = await fallbackRoleResolution(userId, email);
            if (syncResult.role !== 'customer') {
                console.log(`[RoleResolver] 🚀 Upgraded to ${syncResult.role} based on email/phone match`);
                return syncResult;
            }
        }

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

        const syncedRole = safeLower(synced.role || 'customer');
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

/**
 * Direct role query fallback - bypasses RPC function issues
 * Queries user_roles and riders tables directly
 */
async function directRoleQuery(userId: string): Promise<RoleResolution> {
    console.log("[RoleResolver] 🔍 Performing direct role query for:", userId);

    try {
        // Check profiles table first (single source of truth)
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role, is_blocked')
            .eq('user_id', userId)
            .maybeSingle();

        if (profileError) {
            console.error("[RoleResolver] ❌ Error fetching profiles:", profileError);
            return { role: 'customer', isBlocked: false, needsRegistration: false };
        }

        const userRole = profileData?.role as AppRole | undefined;
        const isBlocked = profileData?.is_blocked || false;

        console.log("[RoleResolver] 📊 profiles result:", userRole);

        if (!userRole) {
            console.log("[RoleResolver] ℹ️ No profile found, defaulting to customer");
            // If no profile, they are a new customer (handled by trigger usually, but here just return default)
            return { role: 'customer', isBlocked: false, needsRegistration: false };
        }

        // If role is rider, verify rider record exists for status
        if (userRole === 'rider') {
            const { data: riderData, error: riderError } = await supabase
                .from('riders')
                .select('id, is_active, verification_status')
                .eq('user_id', userId)
                .maybeSingle();

            if (riderError) {
                console.error("[RoleResolver] ❌ Error fetching rider record:", riderError);
            }

            if (!riderData) {
                console.log("[RoleResolver] ⚠️ Rider role but no rider record - needs registration");
                return {
                    role: 'rider',
                    riderStatus: 'none',
                    isBlocked,
                    needsRegistration: true
                };
            }

            const riderStatus = (riderData.verification_status || 'pending') as 'pending' | 'verified' | 'rejected';
            console.log("[RoleResolver] ✅ Found user as rider with status:", riderStatus);

            return {
                role: 'rider',
                riderStatus,
                isBlocked: isBlocked || (riderData.is_active !== true),
                needsRegistration: false
            };
        }

        // Admin, Business or Customer
        console.log(`[RoleResolver] ✅ Found user as: ${userRole}`);
        return {
            role: userRole,
            isBlocked,
            needsRegistration: false
        };

    } catch (error) {
        console.error("[RoleResolver] 🚨 Direct query critical failure:", error);
        return { role: 'customer', isBlocked: false, needsRegistration: false };
    }
}
