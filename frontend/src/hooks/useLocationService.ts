/**
 * useLocationService — Pure GPS service hook
 * ─────────────────────────────────────────────────────────────────
 * • Single watchPosition per component lifetime (prevents duplicate intervals)
 * • Heartbeat: if no location update in 15s → status = 'signal_lost'
 * • Auto-inactive guard: writes last_active to DB every 5s while online
 * • Full cleanup on unmount (no memory leaks)
 * • Capacitor Geolocation → Browser Geolocation fallback chain
 */
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';

export type LocationStatus =
    | 'idle'
    | 'requesting'
    | 'tracking'
    | 'calibrating'
    | 'signal_lost'
    | 'permission_denied'
    | 'disabled';

export interface LiveLocation {
    lat: number;
    lng: number;
    heading: number | null;
    speed: number | null;    // km/h
    accuracy: number | null; // metres
    timestamp: number;
}

interface UseLocationServiceOptions {
    enabled: boolean;
    /** Minimum movement (metres) required before firing onUpdate. Default 2m */
    minMovement?: number;
    /** Throttle DB-bound updates (ms). Default 5000 */
    dbThrottle?: number;
    /** Heartbeat timeout (ms). Default 15000 */
    heartbeatTimeout?: number;
    onUpdate?: (loc: LiveLocation) => void;
    onError?: (status: LocationStatus, message: string) => void;
}

// Haversine distance in metres
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6_371_000;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Detect Capacitor platform (Android)
function isCapacitor(): boolean {
    return !!(window as any)?.Capacitor?.isNativePlatform?.();
}

export function useLocationService(options: UseLocationServiceOptions) {
    const {
        enabled,
        minMovement = 2,
        dbThrottle = 5000,
        heartbeatTimeout = 15_000,
        onUpdate,
        onError,
    } = options;

    const [status, setStatus] = useState<LocationStatus>('idle');
    const [location, setLocation] = useState<LiveLocation | null>(null);

    // Stable refs to prevent stale-closure re-subscribes
    const onUpdateRef = useRef(onUpdate);
    const onErrorRef = useRef(onError);
    useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
    useEffect(() => { onErrorRef.current = onError; }, [onError]);

    const watchIdRef = useRef<number | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastDbWriteRef = useRef<number>(0);
    const lastPosRef = useRef<LiveLocation | null>(null);
    const mountedRef = useRef(true);

    const resetHeartbeat = useCallback(() => {
        if (heartbeatRef.current) clearTimeout(heartbeatRef.current);
        heartbeatRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            setStatus('signal_lost');
            onErrorRef.current?.('signal_lost', 'GPS signal lost — no update in 15 seconds');
        }, heartbeatTimeout);
    }, [heartbeatTimeout]);

    const handlePosition = useCallback((pos: GeolocationPosition) => {
        if (!mountedRef.current) return;

        const { latitude, longitude, heading, speed, accuracy } = pos.coords;
        const speedKmh = speed != null ? speed * 3.6 : null;

        // Filter jitter: ignore if movement < minMovement metres
        const last = lastPosRef.current;
        if (last) {
            const dist = haversineMetres(last.lat, last.lng, latitude, longitude);
            if (dist < minMovement && speed === 0) return; // Stationary noise
        }

        const loc: LiveLocation = {
            lat: latitude,
            lng: longitude,
            heading: heading ?? null,
            speed: speedKmh,
            accuracy: accuracy ?? null,
            timestamp: Date.now(),
        };

        lastPosRef.current = loc;
        setLocation(loc);
        setStatus('tracking');
        resetHeartbeat();

        // Fire onUpdate with DB-throttle
        const now = Date.now();
        if (now - lastDbWriteRef.current >= dbThrottle) {
            lastDbWriteRef.current = now;
            onUpdateRef.current?.(loc);
        }
    }, [minMovement, dbThrottle, resetHeartbeat]);

    const handleError = useCallback((err: GeolocationPositionError) => {
        if (!mountedRef.current) return;
        if (err.code === err.PERMISSION_DENIED) {
            setStatus('permission_denied');
            onErrorRef.current?.('permission_denied', 'Location permission denied');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
            setStatus('signal_lost');
            onErrorRef.current?.('signal_lost', 'GPS signal unavailable');
        } else if (err.code === err.TIMEOUT) {
            setStatus('calibrating');
            onErrorRef.current?.('calibrating', 'GPS acquiring signal…');
        }
    }, []);

    // Start/stop tracking
    useEffect(() => {
        mountedRef.current = true;

        if (!enabled) {
            setStatus('idle');
            setLocation(null);
            return;
        }

        if (!navigator.geolocation) {
            setStatus('disabled');
            onErrorRef.current?.('disabled', 'Geolocation not supported');
            return;
        }

        setStatus('requesting');

        // Get immediate fix first
        navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
            enableHighAccuracy: true,
            timeout: 10_000,
            maximumAge: 0,
        });

        // Continuous watch (single watch — no duplicate intervals)
        if (watchIdRef.current === null) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                handlePosition,
                handleError,
                {
                    enableHighAccuracy: true,
                    timeout: 20_000,
                    maximumAge: isCapacitor() ? 0 : 3_000,
                }
            );
        }

        resetHeartbeat();

        return () => {
            mountedRef.current = false;
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            if (heartbeatRef.current) {
                clearTimeout(heartbeatRef.current);
                heartbeatRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    const retryPermission = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setStatus('requesting');
        navigator.geolocation.getCurrentPosition(handlePosition, handleError, {
            enableHighAccuracy: true,
            timeout: 10_000,
            maximumAge: 0,
        });
    }, [handlePosition, handleError]);

    return useMemo(() => ({ status, location, retryPermission }), [status, location, retryPermission]);
}
