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

/**
 * PHASE 1 & 3 & 5 & 6 – ROLE RESOLVER
 * Safe role validation layer with database as source of truth.
 */
export const roleResolver = async (userId: string, email?: string): Promise<RoleResolution> => {
    // PHASE 6 – DEBUG LOGGER
    console.log(`[RoleResolver] 🔍 Starting validation for: ${email || userId}`);

    try {
        // PHASE 5 – ASYNC FIX: Await database fetch properly
        // 1. Fetch user role from DB (Source of Truth)
        const { data: roleData, error: roleError } = await supabase.rpc('get_my_role' as any);

        if (roleError) {
            console.error("[RoleResolver] ❌ RPC error fetching role:", roleError);
            return { role: 'customer', isBlocked: false, needsRegistration: false };
        }

        // PHASE 2: Standardize and make case-insensitive
        const rawRole = (roleData as string || 'customer').toLowerCase();
        let standardizedRole: AppRole = 'customer';

        if (rawRole === 'admin') standardizedRole = 'admin';
        else if (rawRole === 'rider') standardizedRole = 'rider';
        else if (rawRole === 'business') standardizedRole = 'business';
        else standardizedRole = 'customer';

        // FALLBACK: If role is still customer but we have an identifier (email/phone),
        // try to resolve it via identifying RPCs to sync the database.
        if (standardizedRole === 'customer' && email) {
            console.log(`[RoleResolver] 🔄 Attempting fallback resolution for: ${email}`);

            const isEmail = email.includes('@');
            const rpcName = isEmail ? 'resolve_role_by_email' : 'resolve_role_by_phone';
            const rpcParam = isEmail ? { _email: email } : { _phone: email };

            const { data: syncData, error: syncError } = await supabase.rpc(rpcName as any, rpcParam as any);

            if (!syncError && syncData && (syncData as any).length > 0) {
                const synced = syncData[0] as any;
                const syncedRole = (synced.role || 'customer').toLowerCase();

                if (syncedRole !== 'customer') {
                    console.log(`[RoleResolver] ✅ Fallback successful. New Role: ${syncedRole}`);
                    standardizedRole = syncedRole === 'admin' ? 'admin' : (syncedRole === 'rider' ? 'rider' : (syncedRole === 'business' ? 'business' : 'customer'));
                }
            }
        }

        console.log(`[RoleResolver] 👤 Final Resolved Role: ${standardizedRole}`);

        // PHASE 3 – RIDER VALIDATION CHECK
        if (standardizedRole === 'rider') {
            const { data: rider, error: riderError } = await supabase
                .from('riders')
                .select('verification_status, is_active')
                .eq('user_id', userId)
                .maybeSingle();

            if (riderError) {
                console.error("[RoleResolver] ❌ Error fetching rider details:", riderError);
            }

            // If rider record missing but role is rider
            if (!rider) {
                console.warn("[RoleResolver] ⚠️ Rider record missing for rider role.");
                return {
                    role: 'rider',
                    riderStatus: 'none',
                    isBlocked: false,
                    needsRegistration: true
                };
            }

            const riderObj = rider as any;
            const riderStatus = (riderObj?.verification_status || 'pending') as any;
            const isBlocked = riderObj?.is_active === false;

            console.log(`[RoleResolver] 🏍️ Rider Status: ${riderStatus}, Active: ${!isBlocked}`);

            return {
                role: 'rider',
                riderStatus,
                isBlocked,
                needsRegistration: false
            };
        }

        // Default Customer / Admin path
        return {
            role: standardizedRole,
            isBlocked: false,
            needsRegistration: false
        };

    } catch (error) {
        console.error("[RoleResolver] 🚨 Critical failure in resolver:", error);
        return { role: 'customer', isBlocked: false, needsRegistration: false };
    }
};
