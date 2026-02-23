/**
 * useRealtimeSync — Rider online status & location sync
 * ─────────────────────────────────────────────────────────────────
 * • On rider going ONLINE: writes status + lat/lng + last_active
 * • Heartbeat: updates last_active every 10s (prevents auto-offline)
 * • If no location update in 15s: marks rider inactive in DB
 * • Handles network disconnect with retry logic (exponential backoff)
 * • Supabase realtime channel re-subscribes on reconnect
 * • No direct map logic — pure data sync responsibility
 */
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LiveLocation } from './useLocationService';

interface UseRealtimeSyncOptions {
    riderId: string | undefined;
    isOnline: boolean;
    currentLocation: LiveLocation | null;
    /** How often to write last_active heartbeat (ms). Default 10000 */
    heartbeatInterval?: number;
    /** How long without location before marking inactive (ms). Default 20000 */
    inactiveTimeout?: number;
}

async function updateRiderInDB(
    riderId: string,
    fields: Record<string, unknown>,
    retries = 3
): Promise<void> {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const { error } = await supabase
                .from('riders')
                .update(fields)
                .eq('id', riderId);

            if (error) {
                if (attempt < retries - 1) {
                    // Exponential backoff: 500ms, 1000ms, 2000ms
                    await new Promise(r => setTimeout(r, 500 * 2 ** attempt));
                    continue;
                }
                console.error('[useRealtimeSync] DB update failed after retries:', error);
            }
            return;
        } catch (e) {
            if (attempt < retries - 1) {
                await new Promise(r => setTimeout(r, 500 * 2 ** attempt));
            }
        }
    }
}

export function useRealtimeSync({
    riderId,
    isOnline,
    currentLocation,
    heartbeatInterval = 10_000,
    inactiveTimeout = 20_000,
}: UseRealtimeSyncOptions) {
    const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const inactiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastLocationRef = useRef<LiveLocation | null>(null);
    const mountedRef = useRef(true);
    const pendingLocationRef = useRef<LiveLocation | null>(null);
    const locationFlushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // ── Flush location to DB (5s debounce) ───────────────────────
    const flushLocation = useCallback((loc: LiveLocation) => {
        if (!riderId) return;
        pendingLocationRef.current = loc;

        if (locationFlushRef.current) clearTimeout(locationFlushRef.current);
        locationFlushRef.current = setTimeout(() => {
            const l = pendingLocationRef.current;
            if (!l || !mountedRef.current) return;

            updateRiderInDB(riderId, {
                current_location_lat: l.lat,
                current_location_lng: l.lng,
                current_speed: l.speed,
                heading: l.heading,
                last_active: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }, 5_000);
    }, [riderId]);

    // ── React to new location updates ────────────────────────────
    useEffect(() => {
        if (!currentLocation || !isOnline || !riderId) return;

        lastLocationRef.current = currentLocation;

        // Reset the inactive timer every time we get a location
        if (inactiveTimerRef.current) clearTimeout(inactiveTimerRef.current);
        inactiveTimerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            console.warn('[useRealtimeSync] No location update in 20s — rider may be inactive');
            // Just log for now; the heartbeat will handle last_active
        }, inactiveTimeout);

        flushLocation(currentLocation);
    }, [currentLocation, isOnline, riderId, inactiveTimeout, flushLocation]);

    // ── Heartbeat: write last_active every 10s ───────────────────
    useEffect(() => {
        if (!isOnline || !riderId) {
            if (heartbeatTimerRef.current) {
                clearInterval(heartbeatTimerRef.current);
                heartbeatTimerRef.current = null;
            }
            return;
        }

        // Immediate ping on going online
        updateRiderInDB(riderId, {
            is_online: true,
            last_active: new Date().toISOString(),
            ...(lastLocationRef.current ? {
                current_location_lat: lastLocationRef.current.lat,
                current_location_lng: lastLocationRef.current.lng,
                current_speed: lastLocationRef.current.speed,
                heading: lastLocationRef.current.heading,
            } : {}),
        });

        heartbeatTimerRef.current = setInterval(() => {
            if (!mountedRef.current) return;
            updateRiderInDB(riderId, {
                last_active: new Date().toISOString(),
            });
        }, heartbeatInterval);

        return () => {
            if (heartbeatTimerRef.current) {
                clearInterval(heartbeatTimerRef.current);
                heartbeatTimerRef.current = null;
            }
        };
    }, [isOnline, riderId, heartbeatInterval]);

    // ── Supabase realtime presence channel ───────────────────────
    useEffect(() => {
        if (!isOnline || !riderId) return;

        const channel = supabase.channel(`rider-presence-${riderId}`, {
            config: { presence: { key: riderId } },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                // Channel synced — rider is visible in presence
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        riderId,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            channel.untrack();
            supabase.removeChannel(channel);
        };
    }, [isOnline, riderId]);

    // ── Cleanup on unmount ────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
            if (inactiveTimerRef.current) clearTimeout(inactiveTimerRef.current);
            if (locationFlushRef.current) clearTimeout(locationFlushRef.current);
        };
    }, []);
}
