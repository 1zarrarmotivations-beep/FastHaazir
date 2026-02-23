/**
 * useNavigationEngine — Route management separated from UI
 * ─────────────────────────────────────────────────────────────────
 * • Fetches OSRM route when rider + destination available
 * • Re-routes ONLY when deviation > 30 metres (not on every GPS tick)
 * • Debounces reroute requests (4s delay before re-fetch)
 * • Tracks current step index, ETA, distance remaining
 * • Prevents flicker: polyline only redrawn when route genuinely changes
 * • Full abort-controller cleanup (no dangling fetch promises)
 */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

export interface RouteStep {
    instruction: string;
    distance: number;     // metres
    duration: number;     // seconds
    bearing_before: number;
    bearing_after: number;
    type: string;
    modifier?: string;
}

export interface RouteInfo {
    steps: RouteStep[];
    totalDistanceM: number;
    totalDurationS: number;
    polyline: [number, number][]; // [lat, lng]
    fetchedAt: number;
}

interface UseNavigationEngineOptions {
    riderLat: number | null | undefined;
    riderLng: number | null | undefined;
    targetLat: number | null | undefined;
    targetLng: number | null | undefined;
    /** Deviation threshold in metres to trigger re-route. Default 30 */
    deviationThreshold?: number;
    /** Debounce delay before reroute fetch (ms). Default 4000 */
    rerouteDelay?: number;
    enabled?: boolean;
}

// Haversine distance in metres
function hdist(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6_371_000;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchOSRMRoute(
    fromLat: number, fromLng: number,
    toLat: number, toLng: number,
    signal: AbortSignal
): Promise<RouteInfo | null> {
    try {
        const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${fromLng},${fromLat};${toLng},${toLat}` +
            `?overview=full&geometries=geojson&steps=true&annotations=false`;

        const res = await fetch(url, { signal });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.routes?.length) return null;

        const route = data.routes[0];
        const steps: RouteStep[] = [];

        for (const leg of route.legs) {
            for (const step of leg.steps) {
                steps.push({
                    instruction: step.maneuver?.instruction || step.name || 'Continue',
                    distance: step.distance,
                    duration: step.duration,
                    bearing_before: step.maneuver?.bearing_before ?? 0,
                    bearing_after: step.maneuver?.bearing_after ?? 0,
                    type: step.maneuver?.type || 'continue',
                    modifier: step.maneuver?.modifier,
                });
            }
        }

        const polyline: [number, number][] = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
        );

        return {
            steps,
            totalDistanceM: route.distance,
            totalDurationS: route.duration,
            polyline,
            fetchedAt: Date.now(),
        };
    } catch {
        return null;
    }
}

/** Find minimum distance (metres) from point to polyline */
function minDistToPolyline(lat: number, lng: number, polyline: [number, number][]): number {
    let min = Infinity;
    for (const [plat, plng] of polyline) {
        const d = hdist(lat, lng, plat, plng);
        if (d < min) min = d;
    }
    return min;
}

export function useNavigationEngine({
    riderLat,
    riderLng,
    targetLat,
    targetLng,
    deviationThreshold = 50,
    rerouteDelay = 6_000,
    enabled = true,
}: UseNavigationEngineOptions) {
    const [route, setRoute] = useState<RouteInfo | null>(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState(false);
    const [offRoute, setOffRoute] = useState(false);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [etaMin, setEtaMin] = useState<number | null>(null);
    const [distRemKm, setDistRemKm] = useState<number | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const rerouteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRouteFetchKey = useRef<string>('');
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            abortRef.current?.abort();
            if (rerouteTimerRef.current) clearTimeout(rerouteTimerRef.current);
        };
    }, []);

    // ── Fetch initial route when target changes ──────────────────
    useEffect(() => {
        if (!enabled) return;
        if (riderLat == null || riderLng == null || targetLat == null || targetLng == null) {
            setRoute(null);
            setDistRemKm(null);
            setEtaMin(null);
            return;
        }

        // Avoid refetching for same target (within 5m)
        const key = `${targetLat.toFixed(5)},${targetLng.toFixed(5)}`;
        if (key === lastRouteFetchKey.current && route) return;
        lastRouteFetchKey.current = key;

        abortRef.current?.abort();
        abortRef.current = new AbortController();

        setRouteLoading(true);
        setRouteError(false);
        setOffRoute(false);
        setCurrentStepIdx(0);

        fetchOSRMRoute(riderLat, riderLng, targetLat, targetLng, abortRef.current.signal)
            .then((r) => {
                if (!mountedRef.current) return;
                setRouteLoading(false);
                if (!r) {
                    setRouteError(true);
                    return;
                }
                setRoute(r);
                const mins = Math.round(r.totalDurationS / 60);
                setEtaMin(mins < 1 ? 1 : mins);
                setDistRemKm(r.totalDistanceM / 1000);
            })
            .catch(() => {
                if (!mountedRef.current) return;
                setRouteLoading(false);
                setRouteError(true);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, targetLat, targetLng]);

    // ── On each GPS tick: step tracking + off-route detection ───
    useEffect(() => {
        if (!route || riderLat == null || riderLng == null) return;

        // Minimum distance to polyline
        const distToRoute = minDistToPolyline(riderLat, riderLng, route.polyline);
        const isOff = distToRoute > deviationThreshold;

        if (isOff !== offRoute) setOffRoute(isOff);

        // Advance step: within 25m of step endpoint
        let newStep = currentStepIdx;
        for (let i = currentStepIdx; i < route.steps.length; i++) {
            const endIdx = Math.min(i + 1, route.polyline.length - 1);
            const [eLat, eLng] = route.polyline[endIdx];
            if (hdist(riderLat, riderLng, eLat, eLng) < 25) {
                newStep = i;
            }
        }
        if (newStep !== currentStepIdx) setCurrentStepIdx(newStep);

        // Update live ETA from remaining distance
        if (targetLat != null && targetLng != null) {
            const distM = hdist(riderLat, riderLng, targetLat, targetLng);
            setDistRemKm(distM / 1000);
            // ETA: assume 20 km/h average if speed unknown
            const etaMins = Math.round((distM / 1000 / 20) * 60);
            setEtaMin(Math.max(etaMins, 1));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [riderLat, riderLng, route]);

    // ── Re-route when off-route (debounced 4s) ──────────────────
    const triggerReroute = useCallback(() => {
        if (!offRoute || riderLat == null || riderLng == null || targetLat == null || targetLng == null) return;

        if (rerouteTimerRef.current) clearTimeout(rerouteTimerRef.current);
        rerouteTimerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;

            abortRef.current?.abort();
            abortRef.current = new AbortController();
            setRouteLoading(true);

            fetchOSRMRoute(riderLat, riderLng, targetLat, targetLng, abortRef.current.signal)
                .then((r) => {
                    if (!mountedRef.current) return;
                    setRouteLoading(false);
                    if (!r) { setRouteError(true); return; }
                    setRoute(r);
                    setCurrentStepIdx(0);
                    setOffRoute(false);
                    lastRouteFetchKey.current = `${targetLat.toFixed(5)},${targetLng.toFixed(5)}`;
                })
                .catch(() => {
                    if (!mountedRef.current) return;
                    setRouteLoading(false);
                });
        }, rerouteDelay);
    }, [offRoute, riderLat, riderLng, targetLat, targetLng, rerouteDelay]);

    useEffect(() => {
        if (offRoute) triggerReroute();
    }, [offRoute, triggerReroute]);

    const currentStep = route?.steps[currentStepIdx] ?? null;
    const nextStep = route?.steps[currentStepIdx + 1] ?? null;

    return useMemo(() => ({
        route,
        routeLoading,
        routeError,
        offRoute,
        currentStepIdx,
        currentStep,
        nextStep,
        etaMin,
        distRemKm,
    }), [route, routeLoading, routeError, offRoute, currentStepIdx, currentStep, nextStep, etaMin, distRemKm]);
}
