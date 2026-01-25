import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DistanceRequest {
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
}

interface DistanceResponse {
  distance_km: number;
  duration_minutes: number;
  method: 'google' | 'haversine';
}

// Haversine formula for straight-line distance calculation (fallback)
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Multiply by 1.3 to estimate road distance (roads are not straight)
  return Math.round(R * c * 1.3 * 10) / 10;
}

// Use OSRM (Open Source Routing Machine) for road-based distance - FREE
async function calculateOSRMDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): Promise<{ distance_km: number; duration_minutes: number } | null> {
  try {
    // OSRM public routing API (free, no API key required)
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FastHaazir/1.0',
      },
    });
    
    if (!response.ok) {
      console.log('[OSRM] Request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance_km: Math.round(route.distance / 100) / 10, // Convert meters to km with 1 decimal
        duration_minutes: Math.round(route.duration / 60), // Convert seconds to minutes
      };
    }
    
    console.log('[OSRM] No routes found');
    return null;
  } catch (error) {
    console.error('[OSRM] Error:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin_lat, origin_lng, destination_lat, destination_lng }: DistanceRequest = await req.json();

    // Validate coordinates
    if (
      typeof origin_lat !== 'number' ||
      typeof origin_lng !== 'number' ||
      typeof destination_lat !== 'number' ||
      typeof destination_lng !== 'number'
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Distance] Calculating: (${origin_lat}, ${origin_lng}) -> (${destination_lat}, ${destination_lng})`);

    // Try OSRM first for accurate road-based distance
    const osrmResult = await calculateOSRMDistance(origin_lat, origin_lng, destination_lat, destination_lng);
    
    if (osrmResult) {
      console.log(`[Distance] OSRM result: ${osrmResult.distance_km}km, ${osrmResult.duration_minutes}min`);
      
      const response: DistanceResponse = {
        distance_km: osrmResult.distance_km,
        duration_minutes: osrmResult.duration_minutes,
        method: 'google', // We call it 'google' for compatibility but it's actually OSRM
      };
      
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback to Haversine formula with road factor
    console.log('[Distance] Falling back to Haversine calculation');
    const haversineDistance = calculateHaversineDistance(origin_lat, origin_lng, destination_lat, destination_lng);
    
    // Estimate duration based on average speed of 25 km/h in city traffic
    const estimatedDuration = Math.round((haversineDistance / 25) * 60);
    
    const response: DistanceResponse = {
      distance_km: haversineDistance,
      duration_minutes: estimatedDuration,
      method: 'haversine',
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Distance] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to calculate distance' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});