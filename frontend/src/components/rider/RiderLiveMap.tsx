/* ============================================================
 * RiderLiveMap  —  Ultra-Premium Navigation Module v2.0
 * Uber/Google-Maps-level experience on Leaflet
 * ============================================================ */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Navigation,
    ZoomIn,
    ZoomOut,
    Compass,
    Locate,
    MapPin,
    Route,
    Clock,
    Zap,
    Layers,
    X,
    Maximize2,
    Minimize2,
    ChevronRight,
    Volume2,
    VolumeX,
    RotateCcw,
    AlertTriangle,
    CheckCircle,
} from 'lucide-react';
import { calculateDistance } from './DeliveryMap';

/* ── Types ─────────────────────────────────────────────────── */
interface RiderLiveMapProps {
    riderLat?: number | null;
    riderLng?: number | null;
    riderHeading?: number | null;   // degrees 0-360 from GPS
    riderSpeed?: number | null;      // km/h from GPS
    riderAccuracy?: number | null;   // metres accuracy radius
    pickupLat?: number | null;
    pickupLng?: number | null;
    dropoffLat?: number | null;
    dropoffLng?: number | null;
    pickupAddress?: string;
    dropoffAddress?: string;
    deliveryStatus?: 'placed' | 'preparing' | 'on_way' | 'delivered' | null;
    vehicleType?: 'bike' | 'car' | 'van' | string;
    currentSpeed?: number;  // legacy prop (km/h)
    isFullscreen?: boolean;
    height?: string;
    onRouteInfoUpdate?: (info: { eta: string; distance: string }) => void;
}


interface RouteStep {
    instruction: string;
    distance: number;     // metres
    duration: number;     // seconds
    bearing_before: number;
    bearing_after: number;
    type: string;
    modifier?: string;
}

interface RouteInfo {
    steps: RouteStep[];
    totalDistance: number;   // metres
    totalDuration: number;   // seconds
    polyline: L.LatLngExpression[];
}

/* ── Tile layers ────────────────────────────────────────────── */
const TILE_LAYERS = {
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '© OpenStreetMap © CARTO',
        label: 'Dark',
        icon: '🌙',
    },
    standard: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap',
        label: 'Streets',
        icon: '🗺️',
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Esri',
        label: 'Satellite',
        icon: '🛰️',
    },
} as const;
type TileKey = keyof typeof TILE_LAYERS;

/* ── Turn icon helper ───────────────────────────────────────── */
const TURN_ICONS: Record<string, string> = {
    'turn-left': '↰',
    'turn-right': '↱',
    'turn-sharp-left': '⬅',
    'turn-sharp-right': '➡',
    'turn-slight-left': '↖',
    'turn-slight-right': '↗',
    'roundabout': '🔄',
    'rotary': '🔄',
    'continue': '⬆',
    'merge': '↗',
    'arrive': '📍',
    'depart': '🏁',
};

const getTurnIcon = (step: RouteStep): string => {
    const key = step.modifier
        ? `${step.type}-${step.modifier}`.replace(/ /g, '-')
        : step.type;
    return TURN_ICONS[key] || TURN_ICONS[step.type] || '⬆';
};

/* ── OSRM routing ────────────────────────────────────────────── */
const fetchRoute = async (
    from: [number, number],
    to: [number, number]
): Promise<RouteInfo | null> => {
    try {
        const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${from[1]},${from[0]};${to[1]},${to[0]}` +
            `?overview=full&geometries=geojson&steps=true&annotations=false`;

        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
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

        const coords: L.LatLngExpression[] = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
        );

        return {
            steps,
            totalDistance: route.distance,
            totalDuration: route.duration,
            polyline: coords,
        };
    } catch {
        return null;
    }
};

/* ── SVG Marker factories ────────────────────────────────────── */
const createRiderIcon = (vehicleType: string, heading: number = 0) => {
    const isBike = vehicleType !== 'car' && vehicleType !== 'van';
    const color = isBike ? '#ff6a00' : '#6366f1';
    const glow = isBike ? 'rgba(255,106,0,0.6)' : 'rgba(99,102,241,0.6)';
    const emoji = isBike ? '🏍️' : '🚗';

    return L.divIcon({
        html: `
<div style="
  position:relative;
  width:56px; height:56px;
  display:flex; align-items:center; justify-content:center;
">
  <!-- Accuracy ring handled separately via L.circle -->
  <!-- Outer pulse ring -->
  <div style="
    position:absolute; inset:-8px;
    border-radius:50%;
    border:2px solid ${color}44;
    animation:riderRingPulse 2s ease-in-out infinite;
  "></div>
  <!-- Direction arrow wrapper — rotates with heading -->
  <div style="
    position:absolute; inset:0;
    transform:rotate(${heading}deg);
    transition:transform 0.4s cubic-bezier(.25,.46,.45,.94);
    display:flex; align-items:flex-start; justify-content:center;
    padding-top:2px;
  ">
    <!-- Direction cone -->
    <div style="
      width:0; height:0;
      border-left:8px solid transparent;
      border-right:8px solid transparent;
      border-bottom:14px solid ${color};
      filter:drop-shadow(0 0 4px ${glow});
      opacity:0.9;
    "></div>
  </div>
  <!-- Main icon circle -->
  <div style="
    width:38px; height:38px;
    border-radius:50%;
    background:radial-gradient(circle at 35% 35%, ${color}ee, ${color});
    border:2.5px solid #fff;
    box-shadow:0 0 16px ${glow}, 0 2px 8px rgba(0,0,0,0.5);
    display:flex; align-items:center; justify-content:center;
    font-size:18px;
    z-index:1;
    position:relative;
  ">${emoji}</div>
  <!-- Bottom dot -->
  <div style="
    position:absolute; bottom:-4px; left:50%;
    transform:translateX(-50%);
    width:6px; height:6px; border-radius:50%;
    background:${color};
    box-shadow:0 0 8px ${glow};
  "></div>
</div>`,
        className: '',
        iconSize: [56, 60],
        iconAnchor: [28, 30],
    });
};

const createPickupIcon = () =>
    L.divIcon({
        html: `
<div style="
  width:44px; height:52px;
  position:relative;
  display:flex; flex-direction:column; align-items:center;
">
  <div style="
    width:44px; height:44px;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    background:linear-gradient(135deg,#10b981,#059669);
    border:3px solid #fff;
    box-shadow:0 4px 20px rgba(16,185,129,0.6);
    display:flex; align-items:center; justify-content:center;
  ">
    <span style="transform:rotate(45deg);color:#fff;font-weight:900;font-size:15px;">P</span>
  </div>
  <div style="width:2px;height:8px;background:linear-gradient(#10b981,transparent);"></div>
</div>`,
        className: '',
        iconSize: [44, 52],
        iconAnchor: [22, 52],
    });

const createDropoffIcon = () =>
    L.divIcon({
        html: `
<div style="
  width:44px; height:52px;
  position:relative;
  display:flex; flex-direction:column; align-items:center;
">
  <div style="
    width:44px; height:44px;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    background:linear-gradient(135deg,#ef4444,#dc2626);
    border:3px solid #fff;
    box-shadow:0 4px 20px rgba(239,68,68,0.6);
    display:flex; align-items:center; justify-content:center;
  ">
    <span style="transform:rotate(45deg);color:#fff;font-weight:900;font-size:15px;">D</span>
  </div>
  <div style="width:2px;height:8px;background:linear-gradient(#ef4444,transparent);"></div>
</div>`,
        className: '',
        iconSize: [44, 52],
        iconAnchor: [22, 52],
    });

/* ── Lerp helper ─────────────────────────────────────────────── */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => {
    const diff = ((b - a + 540) % 360) - 180;
    return a + diff * t;
};



/* ══════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ══════════════════════════════════════════════════════════════ */
const RiderLiveMap = ({
    riderLat,
    riderLng,
    riderHeading,
    riderSpeed,
    riderAccuracy,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    pickupAddress = 'Pickup Point',
    dropoffAddress = 'Dropoff Point',
    deliveryStatus = null,
    vehicleType = 'bike',
    currentSpeed = 0,
    height = '340px',
    isFullscreen = false,
    onRouteInfoUpdate,
}: RiderLiveMapProps) => {


    /* ── DOM refs ───────────────────────────────────── */
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const riderMarkerRef = useRef<L.Marker | null>(null);
    const accuracyCircleRef = useRef<L.Circle | null>(null);
    const pickupMarkerRef = useRef<L.Marker | null>(null);
    const dropoffMarkerRef = useRef<L.Marker | null>(null);
    const routePolylineRef = useRef<L.Polyline | null>(null);
    const straightLineRef = useRef<L.Polyline | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);

    /* ── Animation refs ─────────────────────────────── */
    const animFrameRef = useRef<number>(0);
    const currentPosRef = useRef<{ lat: number; lng: number } | null>(null);
    const targetPosRef = useRef<{ lat: number; lng: number } | null>(null);
    const currentHeadingRef = useRef<number>(0);
    const targetHeadingRef = useRef<number>(0);
    const lastSpokenStepRef = useRef<number>(-1);
    const prevRiderPos = useRef<{ lat: number; lng: number } | null>(null);

    /* ── Route state ─────────────────────────────────── */
    const [route, setRoute] = useState<RouteInfo | null>(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState(false);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [offRoute, setOffRoute] = useState(false);
    const routeAbort = useRef<AbortController | null>(null);
    // Debounce: prevent redrawing polyline on every GPS tick
    const polylineRedrawRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* ── UI state ────────────────────────────────────── */
    const [tileMode, setTileMode] = useState<TileKey>('dark');
    const [showLayerPicker, setShowLayerPicker] = useState(false);
    const [isAutoFollow, setIsAutoFollow] = useState(true);
    const [fullscreen, setFullscreen] = useState(isFullscreen);
    const [mapReady, setMapReady] = useState(false);
    const [compassDeg, setCompassDeg] = useState(0);
    const [voiceEnabled, setVoiceEnabled] = useState(() => {
        const saved = localStorage.getItem('rider_voice_enabled');
        return saved === null ? true : saved === 'true';
    });

    useEffect(() => {
        if (voiceEnabled) {
            localStorage.setItem('rider_voice_enabled', 'true');
        } else {
            localStorage.setItem('rider_voice_enabled', 'false');
        }
    }, [voiceEnabled]);

    // Ensure map size is correct on mount/visible
    useEffect(() => {
        if (mapReady && mapRef.current) {
            const timer = setTimeout(() => {
                mapRef.current?.invalidateSize();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [mapReady]);

    const speak = useCallback((text: string) => {
        if (!voiceEnabled || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 1.05;
        window.speechSynthesis.speak(utt);
    }, [voiceEnabled]);

    const [eta, setEta] = useState('');
    const [distKm, setDistKm] = useState(0);
    const [showStepPanel, setShowStepPanel] = useState(true);

    const liveSpeed = (riderSpeed ?? currentSpeed ?? 0);

    /* ── Derived helpers ────────────────────────────────────── */
    const hasRider = riderLat != null && riderLng != null;

    const targetPoint = useMemo((): [number, number] | null => {
        if (deliveryStatus === 'placed' && pickupLat != null && pickupLng != null)
            return [pickupLat, pickupLng];
        if (dropoffLat != null && dropoffLng != null)
            return [dropoffLat, dropoffLng];
        if (pickupLat != null && pickupLng != null)
            return [pickupLat, pickupLng];
        return null;
    }, [deliveryStatus, pickupLat, pickupLng, dropoffLat, dropoffLng]);

    const destinationLabel =
        deliveryStatus === 'placed' ? 'Head to Pickup' :
            deliveryStatus === 'preparing' ? 'Head to Dropoff' :
                deliveryStatus === 'on_way' ? 'Delivering to Customer' :
                    'Live Navigation';

    /* ── 1. Initialise map (once) ─────────────────────────────── */
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const initLat = riderLat ?? 30.1798;
        const initLng = riderLng ?? 66.975;

        const map = L.map(containerRef.current, {
            center: [initLat, initLng],
            zoom: 16,
            zoomControl: false,
            attributionControl: false,
            dragging: true,
            touchZoom: true,
            doubleClickZoom: true,
            scrollWheelZoom: true,
            boxZoom: true,
            keyboard: true,
        });

        // Default dark tile
        tileLayerRef.current = L.tileLayer(TILE_LAYERS.dark.url, {
            maxZoom: 20,
            attribution: TILE_LAYERS.dark.attribution,
        }).addTo(map);

        mapRef.current = map;
        setMapReady(true);

        // Disable auto-follow when user manually pans
        map.on('dragstart', () => setIsAutoFollow(false));

        // Compass from device orientation
        const onOrientation = (e: DeviceOrientationEvent) => {
            if (e.alpha != null) setCompassDeg(360 - e.alpha);
        };
        window.addEventListener('deviceorientation', onOrientation);

        // Resize handler
        const handleResize = () => {
            if (mapRef.current) mapRef.current.invalidateSize();
        };
        window.addEventListener('resize', handleResize);


        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('deviceorientation', onOrientation);
            cancelAnimationFrame(animFrameRef.current);

            if (polylineRedrawRef.current) clearTimeout(polylineRedrawRef.current);
            map.remove();
            mapRef.current = null;
            riderMarkerRef.current = null;
            accuracyCircleRef.current = null;
            pickupMarkerRef.current = null;
            dropoffMarkerRef.current = null;
            routePolylineRef.current = null;
            straightLineRef.current = null;
            tileLayerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── 2. Tile layer switcher ─────────────────────────────── */
    useEffect(() => {
        if (!mapRef.current || !tileLayerRef.current) return;
        tileLayerRef.current.remove();
        tileLayerRef.current = L.tileLayer(TILE_LAYERS[tileMode].url, {
            maxZoom: 20,
            attribution: TILE_LAYERS[tileMode].attribution,
        }).addTo(mapRef.current);

        // Ensure tiles are correctly aligned after layer swap
        mapRef.current.invalidateSize();
    }, [tileMode]);

    /* ── 3. Handle size changes (fullscreen, height) ────────── */
    useEffect(() => {
        if (!mapRef.current) return;

        // Delay slightly to allow CSS transitions/layouts to settle
        const timer = setTimeout(() => {
            mapRef.current?.invalidateSize();
        }, 300);

        return () => clearTimeout(timer);
    }, [height, isFullscreen]);


    /* ── 3. Smooth animation loop ───────────────────────────── */
    const startAnimLoop = useCallback(() => {
        const SPEED = 0.12; // lerp factor per frame

        const tick = () => {
            animFrameRef.current = requestAnimationFrame(tick);
            if (!mapRef.current || !targetPosRef.current) return;

            // Lerp position
            const cur = currentPosRef.current ?? targetPosRef.current;
            const nextLat = lerp(cur.lat, targetPosRef.current.lat, SPEED);
            const nextLng = lerp(cur.lng, targetPosRef.current.lng, SPEED);
            currentPosRef.current = { lat: nextLat, lng: nextLng };

            // Lerp heading
            const nextH = lerpAngle(currentHeadingRef.current, targetHeadingRef.current, SPEED * 1.5);
            currentHeadingRef.current = nextH;

            // Update marker
            if (riderMarkerRef.current) {
                riderMarkerRef.current.setLatLng([nextLat, nextLng]);
                riderMarkerRef.current.setIcon(createRiderIcon(vehicleType, nextH));
            }

            // Auto-follow
            if (isAutoFollow && mapRef.current) {
                mapRef.current.setView([nextLat, nextLng], mapRef.current.getZoom(), {
                    animate: true,
                    duration: 0.3,
                    noMoveStart: true,
                });
            }

            // Accuracy circle
            if (accuracyCircleRef.current) {
                accuracyCircleRef.current.setLatLng([nextLat, nextLng]);
            }
        };
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(tick);
    }, [vehicleType, isAutoFollow]);

    /* ── 4. Update rider position & heading ─────────────────── */
    useEffect(() => {
        if (!mapRef.current || !mapReady) return;
        if (riderLat == null || riderLng == null) return;

        // Compute heading from movement if GPS heading not provided
        let headingToUse = riderHeading ?? 0;
        if (riderHeading == null && prevRiderPos.current) {
            const dx = riderLng - prevRiderPos.current.lng;
            const dy = riderLat - prevRiderPos.current.lat;
            if (Math.abs(dx) > 0.00001 || Math.abs(dy) > 0.00001) {
                headingToUse = (Math.atan2(dx, dy) * 180) / Math.PI;
            }
        }
        prevRiderPos.current = { lat: riderLat, lng: riderLng };

        targetPosRef.current = { lat: riderLat, lng: riderLng };
        targetHeadingRef.current = headingToUse;

        // Create marker on first call
        if (!riderMarkerRef.current) {
            currentPosRef.current = { lat: riderLat, lng: riderLng };
            currentHeadingRef.current = headingToUse;

            riderMarkerRef.current = L.marker([riderLat, riderLng], {
                icon: createRiderIcon(vehicleType, headingToUse),
                zIndexOffset: 1000,
            }).addTo(mapRef.current);

            // Accuracy circle
            const acc = riderAccuracy ?? 20;
            accuracyCircleRef.current = L.circle([riderLat, riderLng], {
                radius: acc,
                color: '#ff6a00',
                fillColor: '#ff6a00',
                fillOpacity: 0.08,
                weight: 1.5,
                opacity: 0.4,
            }).addTo(mapRef.current);

            startAnimLoop();
        } else {
            // Update accuracy
            if (accuracyCircleRef.current && riderAccuracy != null) {
                accuracyCircleRef.current.setRadius(riderAccuracy);
            }
        }
    }, [riderLat, riderLng, riderHeading, riderAccuracy, vehicleType, mapReady, startAnimLoop]);

    /* ── 5. Restart animation loop when isAutoFollow changes ── */
    useEffect(() => {
        if (riderMarkerRef.current) startAnimLoop();
    }, [isAutoFollow, startAnimLoop]);

    /* ── 6. Pickup / Dropoff markers ────────────────────────── */
    useEffect(() => {
        if (!mapRef.current || !mapReady) return;

        if (pickupLat != null && pickupLng != null) {
            if (!pickupMarkerRef.current) {
                pickupMarkerRef.current = L.marker([pickupLat, pickupLng], {
                    icon: createPickupIcon(),
                }).addTo(mapRef.current).bindPopup(`<b>📦 Pickup</b><br>${pickupAddress}`);
            } else {
                pickupMarkerRef.current.setLatLng([pickupLat, pickupLng]);
            }
        } else {
            pickupMarkerRef.current?.remove();
            pickupMarkerRef.current = null;
        }

        if (dropoffLat != null && dropoffLng != null) {
            if (!dropoffMarkerRef.current) {
                dropoffMarkerRef.current = L.marker([dropoffLat, dropoffLng], {
                    icon: createDropoffIcon(),
                }).addTo(mapRef.current).bindPopup(`<b>🎯 Dropoff</b><br>${dropoffAddress}`);
            } else {
                dropoffMarkerRef.current.setLatLng([dropoffLat, dropoffLng]);
            }
        } else {
            dropoffMarkerRef.current?.remove();
            dropoffMarkerRef.current = null;
        }
    }, [pickupLat, pickupLng, dropoffLat, dropoffLng, pickupAddress, dropoffAddress, mapReady]);

    /* ── 7. OSRM Route fetching ─────────────────────────────── */
    useEffect(() => {
        if (!mapReady) return;
        if (!hasRider) return;
        if (!targetPoint) {
            // No delivery — clear route
            routePolylineRef.current?.remove();
            routePolylineRef.current = null;
            setRoute(null);
            return;
        }

        // Cancel previous request
        routeAbort.current?.abort();
        routeAbort.current = new AbortController();

        setRouteLoading(true);
        setRouteError(false);

        fetchRoute(
            [riderLat!, riderLng!],
            targetPoint
        ).then((r) => {
            setRouteLoading(false);
            if (!r) {
                setRouteError(true);
                // Fallback: straight dashed line
                if (mapRef.current) {
                    straightLineRef.current?.remove();
                    straightLineRef.current = L.polyline(
                        [[riderLat!, riderLng!], targetPoint],
                        { color: '#ff6a00', weight: 3, dashArray: '10,8', opacity: 0.6 }
                    ).addTo(mapRef.current);
                }
                return;
            }
            setRoute(r);
            setCurrentStepIdx(0);
            lastSpokenStepRef.current = -1;
            straightLineRef.current?.remove();
            straightLineRef.current = null;

            // Draw route polyline
            if (mapRef.current) {
                routePolylineRef.current?.remove();
                routePolylineRef.current = L.polyline(r.polyline, {
                    color: '#ff6a00',
                    weight: 6,
                    opacity: 0.85,
                    lineCap: 'round',
                    lineJoin: 'round',
                }).addTo(mapRef.current);

                // Border / shadow layer
                const border = L.polyline(r.polyline, {
                    color: '#000',
                    weight: 10,
                    opacity: 0.25,
                    lineCap: 'round',
                    lineJoin: 'round',
                });
                border.addTo(mapRef.current);
                border.bringToBack();
            }

            // ETA
            const mins = Math.round(r.totalDuration / 60);
            const newEta = mins < 1 ? '< 1 min' : `${mins} min`;
            const dLeft = r.totalDistance / 1000;
            const newDist = dLeft < 1 ? `${(dLeft * 1000).toFixed(0)} m` : `${dLeft.toFixed(1)} km`;

            setEta(newEta);
            setDistKm(dLeft);
            onRouteInfoUpdate?.({ eta: newEta, distance: newDist });

        });

        return () => routeAbort.current?.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [riderLat, riderLng, targetPoint?.[0], targetPoint?.[1], mapReady]);

    /* ── 8. Off-route detection & step tracking ─────────────── */
    useEffect(() => {
        if (!route || !hasRider) return;

        // Find closest step
        const ridPos = L.latLng(riderLat!, riderLng!);

        let closestDist = Infinity;
        let closestIdx = currentStepIdx;
        route.steps.forEach((step, i) => {
            // step has bearing_after — use it conceptually
            // Simple: advance step when within 25m of its endpoint
            const endIdx = Math.min(i + 1, route.polyline.length - 1);
            const endLL = route.polyline[endIdx] as [number, number];
            const d = ridPos.distanceTo(L.latLng(endLL[0], endLL[1]));
            if (d < closestDist) {
                closestDist = d;
                closestIdx = i;
            }
        });

        if (closestIdx !== currentStepIdx) {
            setCurrentStepIdx(closestIdx);
            // Voice next step
            if (voiceEnabled && closestIdx > lastSpokenStepRef.current && closestIdx < route.steps.length) {
                const step = route.steps[closestIdx];
                const dist = step.distance < 1000
                    ? `in ${Math.round(step.distance)} metres`
                    : `in ${(step.distance / 1000).toFixed(1)} kilometres`;
                speak(`${step.instruction} ${dist}`);
                lastSpokenStepRef.current = closestIdx;
            }
        }

        // Off-route detection: point-to-segment distance is more accurate than point-to-point
        // but for performance, we'll check against all points with a safer threshold
        let minD = Infinity;
        for (let i = 0; i < route.polyline.length; i++) {
            const p = route.polyline[i] as [number, number];
            const d = ridPos.distanceTo(L.latLng(p[0], p[1]));
            if (d < minD) minD = d;
        }

        // Use 60m threshold to be safe against GPS jitter in high-rise areas
        setOffRoute(minD > 60);

        // Live ETA update using live speed
        const speed = Math.max(liveSpeed, 5);
        const distLeft = targetPoint
            ? calculateDistance(riderLat!, riderLng!, targetPoint[0], targetPoint[1])
            : 0;
        const mins = Math.round((distLeft / speed) * 60);
        const newEta = mins < 1 ? '< 1 min' : `${mins} min`;
        const newDist = distLeft < 1 ? `${(distLeft * 1000).toFixed(0)} m` : `${distLeft.toFixed(1)} km`;

        setEta(newEta);
        setDistKm(distLeft);
        onRouteInfoUpdate?.({ eta: newEta, distance: newDist });


    }, [riderLat, riderLng, route, currentStepIdx, voiceEnabled, liveSpeed, hasRider, targetPoint]);

    /* ── 9. Re-route when off-route ─────────────────────────── */
    useEffect(() => {
        if (!offRoute || !hasRider || !targetPoint) return;
        const timer = setTimeout(() => {
            setRoute(null);
            routePolylineRef.current?.remove();
            routePolylineRef.current = null;
            setRouteLoading(true);
            fetchRoute([riderLat!, riderLng!], targetPoint).then((r) => {
                setRouteLoading(false);
                if (!r) { setRouteError(true); return; }
                setRoute(r);
                setCurrentStepIdx(0);
                lastSpokenStepRef.current = -1;
                setOffRoute(false);
                if (mapRef.current) {
                    routePolylineRef.current = L.polyline(r.polyline, {
                        color: '#ff6a00',
                        weight: 6,
                        opacity: 0.85,
                        lineCap: 'round',
                        lineJoin: 'round',
                    }).addTo(mapRef.current);
                }
                if (voiceEnabled) speak('Route recalculated');
            });
        }, 6000);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [offRoute]);

    /* ── Controls ────────────────────────────────────────────── */
    const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
    const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);

    const handleRecenter = useCallback(() => {
        if (!mapRef.current || riderLat == null || riderLng == null) return;
        setIsAutoFollow(true);
        mapRef.current.setView([riderLat, riderLng], 17, { animate: true, duration: 0.6 });
    }, [riderLat, riderLng]);

    const handleFitAll = useCallback(() => {
        if (!mapRef.current) return;
        const pts: L.LatLngExpression[] = [];
        if (riderLat != null && riderLng != null) pts.push([riderLat, riderLng]);
        if (pickupLat != null && pickupLng != null) pts.push([pickupLat, pickupLng]);
        if (dropoffLat != null && dropoffLng != null) pts.push([dropoffLat, dropoffLng]);
        if (pts.length > 1) {
            setIsAutoFollow(false);
            mapRef.current.fitBounds(pts as L.LatLngBoundsExpression, {
                padding: [60, 60], maxZoom: 16, animate: true, duration: 0.8,
            });
        }
    }, [riderLat, riderLng, pickupLat, pickupLng, dropoffLat, dropoffLng]);

    const mapH = fullscreen ? '100vh' : height;
    const currentStep = route?.steps[currentStepIdx] ?? null;
    const nextStep = route?.steps[currentStepIdx + 1] ?? null;

    return (
        <>
            {/* ── Global keyframes ── */}
            <style>{`
        @keyframes riderRingPulse {
          0%,100% { transform:scale(1); opacity:.6; }
          50% { transform:scale(1.4); opacity:0; }
        }
        @keyframes routeShimmer {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -40; }
        }
        .leaflet-container { background:#0d0d1a !important; }
        .leaflet-popup-content-wrapper {
          background:rgba(13,13,26,0.97) !important;
          color:#fff !important;
          border:1px solid rgba(255,106,0,0.35) !important;
          border-radius:14px !important;
          backdrop-filter:blur(16px);
          box-shadow:0 8px 32px rgba(0,0,0,0.6);
        }
        .leaflet-popup-tip { background:rgba(13,13,26,0.97) !important; }
        .leaflet-popup-close-button { color:#ff6a00 !important; top:8px!important; right:10px!important; }
        .leaflet-popup-content { margin:12px 16px; font-size:13px; font-weight:600; }
      `}</style>

            <div
                style={{
                    position: fullscreen ? 'fixed' : 'relative',
                    inset: fullscreen ? 0 : undefined,
                    zIndex: fullscreen ? 9999 : undefined,
                    height: mapH,
                    width: '100%',
                    borderRadius: fullscreen ? 0 : 20,
                    overflow: 'hidden',
                    background: '#0d0d1a',
                    // Use 'layout' only — 'paint' can break Leaflet canvas on some devices
                    contain: 'layout style',
                }}
            >
                {/* Map canvas */}
                <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

                {/* ── TOP HUD ────────────────────────────────────── */}
                <div style={{
                    position: 'absolute', top: 12, left: 12, right: 12,
                    zIndex: 1000, pointerEvents: 'none',
                    display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                    {/* Title bar */}
                    <motion.div
                        initial={{ opacity: 0, y: -14 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'rgba(10,10,20,0.88)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: 16,
                            padding: '9px 14px',
                            border: '1px solid rgba(255,106,0,0.2)',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                            pointerEvents: 'auto',
                        }}
                    >
                        {/* GPS dot */}
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: hasRider ? '#10b981' : '#6b7280',
                            boxShadow: hasRider ? '0 0 10px #10b981' : undefined,
                        }} />
                        <Navigation size={14} style={{ color: '#ff6a00', flexShrink: 0 }} />
                        <span style={{
                            color: '#fff', fontSize: 13, fontWeight: 700,
                            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {destinationLabel}
                        </span>

                        {/* Speed pill */}
                        <div style={{
                            background: 'rgba(255,106,0,0.12)', border: '1px solid rgba(255,106,0,0.35)',
                            borderRadius: 8, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                            <Zap size={10} style={{ color: '#ff6a00' }} />
                            <span style={{ color: '#ff6a00', fontSize: 12, fontWeight: 800 }}>
                                {Math.round(liveSpeed)} km/h
                            </span>
                        </div>

                        {/* Route loading / error badges */}
                        {routeLoading && (
                            <div style={{
                                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
                                borderRadius: 8, padding: '2px 8px',
                            }}>
                                <span style={{ color: '#818cf8', fontSize: 11, fontWeight: 700 }}>Routing…</span>
                            </div>
                        )}
                        {routeError && !routeLoading && (
                            <div style={{
                                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
                                borderRadius: 8, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                                <AlertTriangle size={10} style={{ color: '#f87171' }} />
                                <span style={{ color: '#f87171', fontSize: 11, fontWeight: 700 }}>Offline</span>
                            </div>
                        )}
                        {offRoute && !routeLoading && (
                            <div style={{
                                background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
                                borderRadius: 8, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                                <RotateCcw size={10} style={{ color: '#fbbf24' }} />
                                <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700 }}>Re-routing</span>
                            </div>
                        )}

                        {/* Fullscreen */}
                        <button
                            onClick={() => setFullscreen(f => !f)}
                            style={{
                                background: 'rgba(255,255,255,0.07)', border: 'none',
                                borderRadius: 8, padding: '4px 6px', cursor: 'pointer',
                                color: '#fff', display: 'flex', alignItems: 'center',
                            }}
                        >
                            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                        </button>
                    </motion.div>

                    {/* Turn-by-turn panel */}
                    <AnimatePresence>
                        {currentStep && showStepPanel && (
                            <motion.div
                                key="step"
                                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                                style={{
                                    background: 'rgba(10,10,20,0.92)',
                                    backdropFilter: 'blur(20px)',
                                    borderRadius: 16,
                                    padding: '10px 14px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
                                    pointerEvents: 'auto',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {/* Big turn icon */}
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                        background: 'linear-gradient(135deg,#ff6a00,#ee0979)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20,
                                        boxShadow: '0 4px 14px rgba(255,106,0,0.4)',
                                    }}>
                                        {getTurnIcon(currentStep)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ color: '#fff', fontSize: 16, fontWeight: 900, margin: 0, lineHeight: 1.2, letterSpacing: '-0.3px' }}>
                                            {currentStep.instruction || 'Continue ahead'}
                                        </p>
                                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: '4px 0 0', fontWeight: 700 }}>
                                            {currentStep.distance < 1000
                                                ? `${Math.round(currentStep.distance)}m`
                                                : `${(currentStep.distance / 1000).toFixed(1)} km`}
                                        </p>
                                    </div>
                                    {nextStep && (
                                        <div style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                            padding: '4px 8px',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: 10,
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            gap: 2,
                                        }}>
                                            <span style={{ fontSize: 14 }}>{getTurnIcon(nextStep)}</span>
                                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600 }}>NEXT</span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setShowStepPanel(false)}
                                        style={{
                                            background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                                            cursor: 'pointer', padding: 4, display: 'flex',
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                        {!showStepPanel && currentStep && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowStepPanel(true)}
                                style={{
                                    background: 'rgba(255,106,0,0.15)',
                                    border: '1px solid rgba(255,106,0,0.35)',
                                    borderRadius: 12, padding: '6px 12px',
                                    color: '#ff6a00', fontSize: 12, fontWeight: 700,
                                    cursor: 'pointer', pointerEvents: 'auto',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    alignSelf: 'flex-start',
                                }}
                            >
                                <Route size={12} />
                                Show directions
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── RIGHT CONTROL PANEL ─────────────────────── */}
                <div style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                    <CtrlBtn onClick={handleZoomIn} title="Zoom in"><ZoomIn size={18} /></CtrlBtn>
                    <CtrlBtn onClick={handleZoomOut} title="Zoom out"><ZoomOut size={18} /></CtrlBtn>
                    <CtrlBtn
                        onClick={handleRecenter}
                        title={isAutoFollow ? 'Following you' : 'Re-center'}
                        active={isAutoFollow}
                        accent="#10b981"
                    >
                        <Locate size={18} />
                    </CtrlBtn>
                    <CtrlBtn onClick={handleFitAll} title="Fit all markers">
                        <MapPin size={18} />
                    </CtrlBtn>
                    {/* Compass */}
                    <CtrlBtn
                        onClick={() => { setCompassDeg(0); }}
                        title="North up"
                    >
                        <Compass
                            size={18}
                            style={{ transform: `rotate(${compassDeg}deg)`, transition: 'transform 0.3s', color: '#ef4444' }}
                        />
                    </CtrlBtn>
                    {/* Voice */}
                    <CtrlBtn
                        onClick={() => setVoiceEnabled(v => !v)}
                        title={voiceEnabled ? 'Voice on' : 'Voice off'}
                        active={voiceEnabled}
                        accent="#8b5cf6"
                    >
                        {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </CtrlBtn>
                    {/* Layers */}
                    <CtrlBtn onClick={() => setShowLayerPicker(s => !s)} title="Map style">
                        <Layers size={18} />
                    </CtrlBtn>
                </div>

                {/* ── LAYER PICKER ────────────────────────────── */}
                <AnimatePresence>
                    {showLayerPicker && (
                        <motion.div
                            key="layers"
                            initial={{ opacity: 0, x: 20, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            style={{
                                position: 'absolute', right: 60, top: '50%',
                                transform: 'translateY(-50%)',
                                zIndex: 1001,
                                background: 'rgba(10,10,20,0.97)',
                                backdropFilter: 'blur(24px)',
                                borderRadius: 16, padding: 12,
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                                display: 'flex', flexDirection: 'column', gap: 6,
                            }}
                        >
                            {(Object.keys(TILE_LAYERS) as TileKey[]).map(key => (
                                <button
                                    key={key}
                                    onClick={() => { setTileMode(key); setShowLayerPicker(false); }}
                                    style={{
                                        background: tileMode === key ? 'rgba(255,106,0,0.18)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${tileMode === key ? 'rgba(255,106,0,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                        borderRadius: 10,
                                        padding: '7px 14px',
                                        color: tileMode === key ? '#ff6a00' : 'rgba(255,255,255,0.65)',
                                        fontSize: 13, fontWeight: tileMode === key ? 700 : 500,
                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <span>{TILE_LAYERS[key].icon}</span>
                                    {TILE_LAYERS[key].label}
                                    {tileMode === key && <CheckCircle size={12} style={{ color: '#ff6a00', marginLeft: 'auto' }} />}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── BOTTOM ETA + DISTANCE CARD ──────────────── */}
                <AnimatePresence>
                    {hasRider && eta && (
                        <motion.div
                            key="eta"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 24 }}
                            style={{
                                position: 'absolute',
                                bottom: fullscreen ? 24 : 110, left: 12, right: 12,
                                zIndex: 1000,
                                background: 'rgba(10,10,20,0.95)',
                                backdropFilter: 'blur(30px)',
                                borderRadius: 24,
                                padding: '14px 20px',
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
                                display: 'flex', alignItems: 'center', gap: 0,
                            }}
                        >
                            {/* ETA */}
                            <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                    <Clock size={15} style={{ color: '#ff6a00' }} />
                                    <span style={{ color: '#fff', fontSize: 24, fontWeight: 900, letterSpacing: '-1px' }}>{eta}</span>
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}>ETA</span>
                            </div>
                            {/* Distance */}
                            <div style={{ flex: 1, textAlign: 'center', paddingLeft: 14, borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                    <Route size={13} style={{ color: '#8b5cf6' }} />
                                    <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px' }}>
                                        {distKm < 1
                                            ? `${Math.round(distKm * 1000)}m`
                                            : `${distKm.toFixed(1)}km`}
                                    </span>
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600, letterSpacing: '0.5px' }}>
                                    to {deliveryStatus === 'placed' ? 'PICKUP' : 'DROPOFF'}
                                </span>
                            </div>
                            {/* Speed */}
                            <div style={{ flex: 1, textAlign: 'center', paddingLeft: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                    <Zap size={13} style={{ color: '#10b981' }} />
                                    <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px' }}>
                                        {Math.round(liveSpeed)}
                                    </span>
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600, letterSpacing: '0.5px' }}>KM/H</span>
                            </div>

                            {/* Google Maps button */}
                            {targetPoint && (
                                <button
                                    onClick={() => {
                                        const [tlat, tlng] = targetPoint;
                                        const origin = hasRider ? `${riderLat},${riderLng}` : '';
                                        window.open(
                                            `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${tlat},${tlng}&travelmode=driving`,
                                            '_blank'
                                        );
                                    }}
                                    style={{
                                        marginLeft: 12,
                                        width: 36, height: 36,
                                        borderRadius: 10, flexShrink: 0,
                                        background: 'linear-gradient(135deg,#4285f4,#34a853)',
                                        border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 4px 12px rgba(66,133,244,0.4)',
                                    }}
                                    title="Open in Google Maps"
                                >
                                    <ChevronRight size={18} style={{ color: '#fff' }} />
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── GPS ACQUIRING OVERLAY ────────────────────── */}
                {!hasRider && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 1001,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        background: 'radial-gradient(circle at center, rgba(10,10,25,0.92) 0%, rgba(5,5,15,0.98) 100%)',
                        backdropFilter: 'blur(12px)',
                        gap: 20,
                    }}>
                        <div style={{ position: 'relative' }}>
                            <motion.div
                                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                style={{
                                    position: 'absolute', inset: -20,
                                    borderRadius: '50%', background: 'rgba(255,106,0,0.15)',
                                    filter: 'blur(10px)',
                                }}
                            />
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                style={{
                                    width: 80, height: 80, borderRadius: '50%',
                                    border: '3px solid transparent',
                                    borderTopColor: '#ff6a00',
                                    borderRightColor: 'rgba(255,106,0,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                <Locate size={32} style={{ color: '#ff6a00' }} />
                            </motion.div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: '#fff', fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: '0.5px' }}>
                                Searching GPS…
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '8px 0 0', maxWidth: '240px', lineHeight: 1.4 }}>
                                Please ensure you are under open sky for live navigation
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

/* ── Reusable control button ────────────────────────────────── */
interface CtrlBtnProps {
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    active?: boolean;
    accent?: string;
}
const CtrlBtn = ({ onClick, title, children, active, accent = '#ff6a00' }: CtrlBtnProps) => {
    const accentRGB = accent === '#10b981' ? '16,185,129' :
        accent === '#8b5cf6' ? '139,92,246' : '255,106,0';
    return (
        <motion.button
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.05 }}
            onClick={onClick}
            title={title}
            style={{
                width: 42, height: 42, borderRadius: 13,
                background: active
                    ? `rgba(${accentRGB},0.2)`
                    : 'rgba(10,10,20,0.88)',
                backdropFilter: 'blur(14px)',
                border: `1px solid ${active ? accent : 'rgba(255,255,255,0.1)'}`,
                color: active ? accent : 'rgba(255,255,255,0.75)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active
                    ? `0 0 14px ${accent}55, 0 2px 8px rgba(0,0,0,0.4)`
                    : '0 2px 8px rgba(0,0,0,0.4)',
                transition: 'all 0.2s',
            }}
        >
            {children}
        </motion.button>
    );
};

export default RiderLiveMap;
