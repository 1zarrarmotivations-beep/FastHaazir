import { supabase } from '@/integrations/supabase/client';

interface PricingQuote {
    serviceType: 'food' | 'grocery' | 'parcel';
    distanceKm: number;
    baseFare: number;
    totalFare: number;
    surgeMultiplier: number;
    isPeakHour: boolean;
    breakdown: {
        base: number;
        distanceCharge: number;
        minimumApply: boolean;
    };
}

/**
 * Calculates the exact fare for a ride based on distance and service type.
 * This runs on the CLIENT for estimation, but MUST be verified on Server for Order Creation.
 */
export const calculateFare = async (
    distanceKm: number,
    serviceType: 'food' | 'grocery' | 'parcel'
): Promise<PricingQuote | null> => {

    // 1. Fetch current pricing configuration from DB (cached)
    const { data: plan, error } = await (supabase as any)
        .from('pricing_plans')
        .select('*')
        .eq('service_type', serviceType)
        .single();

    if (error || !plan) {
        console.error('Pricing Plan not found:', error);
        return null;
    }

    // 2. Core Calculation
    const {
        base_fare,
        base_distance_km,
        per_km_rate,
        minimum_fare
    } = plan;

    // Distance Charge: (Total Dist - Base Dist) * Rate
    // If dist < base, charge is 0
    const chargeableDist = Math.max(0, distanceKm - base_distance_km);
    const distCharge = chargeableDist * per_km_rate;

    let totalFare = base_fare + distCharge;

    // 3. Apply Multipliers (Surge, Weather, Peak)
    // For now, hardcoded 1.0 until dynamic pricing engine is live
    const surgeMultiplier = 1.0;
    totalFare = totalFare * surgeMultiplier;

    // 4. Enforce Minimum Fare
    const minimumApply = totalFare < minimum_fare;
    totalFare = Math.max(totalFare, minimum_fare);

    // 5. Rounding (Ceil to nearest 10)
    totalFare = Math.ceil(totalFare / 10) * 10;

    return {
        serviceType,
        distanceKm,
        baseFare: base_fare,
        totalFare,
        surgeMultiplier,
        isPeakHour: false,
        breakdown: {
            base: base_fare,
            distanceCharge: distCharge,
            minimumApply
        }
    };
};

/**
 * Validates a quote hash from the server to prevent manipulation.
 * (Placeholder for HMAC implementation)
 */
export const validateQuote = (quoteId: string, fare: number): boolean => {
    // TODO: Implement server-side verification via Edge Function
    return true;
};
