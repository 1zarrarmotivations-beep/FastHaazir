/* ============================================================
 * SpeedMeter — Ultra-Premium Live GPS Speedometer v2.0
 * Real device GPS speed · Heading compass · Signal quality
 * ============================================================ */
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import {
    Compass,
    Zap,
    Satellite,
    Navigation,
    TrendingUp,
    Activity,
    Wifi,
    WifiOff,
    AlertTriangle,
    CheckCircle,
    Clock,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────── */
type GPSStatus =
    | 'idle'
    | 'acquiring'
    | 'calibrating'
    | 'tracking'
    | 'signal_lost'
    | 'permission_denied';

interface LiveGPS {
    speed: number;      // km/h
    heading: number;    // 0-360
    accuracy: number;   // metres
    altitude: number | null;
    lat: number | null;
    lng: number | null;
    timestamp: number;
}

interface SpeedMeterProps {
    /** Override from parent hook if already tracking */
    externalSpeed?: number | null;
    externalHeading?: number | null;
    externalAccuracy?: number | null;
    isTracking?: boolean;
}

/* ── Constants ─────────────────────────────────────────────── */
const MAX_SPEED = 180;
const ARC_START_DEG = -225;  // 7 o'clock position
const ARC_SWEEP_DEG = 270;   // 3/4 of circle

/* ── SVG arc helper ─────────────────────────────────────────── */
const polarToXY = (cx: number, cy: number, r: number, deg: number) => ({
    x: cx + r * Math.cos((deg * Math.PI) / 180),
    y: cy + r * Math.sin((deg * Math.PI) / 180),
});

const describeArc = (
    cx: number, cy: number, r: number,
    startDeg: number, endDeg: number
): string => {
    const start = polarToXY(cx, cy, r, startDeg - 90);
    const end = polarToXY(cx, cy, r, endDeg - 90);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
};

/* ── Speed to colour ────────────────────────────────────────── */
const speedColor = (speed: number): string => {
    if (speed < 40) return '#10b981';  // green  — safe
    if (speed < 80) return '#f59e0b';  // amber  — moderate
    if (speed < 120) return '#f97316';  // orange — fast
    return '#ef4444';                   // red    — very fast
};

/* ── Heading label ──────────────────────────────────────────── */
const headingLabel = (deg: number): string => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
};

/* ── Signal quality ─────────────────────────────────────────── */
const signalQuality = (acc: number): { label: string; color: string; bars: number } => {
    if (acc <= 5) return { label: 'Excellent', color: '#10b981', bars: 5 };
    if (acc <= 10) return { label: 'Very Good', color: '#34d399', bars: 4 };
    if (acc <= 20) return { label: 'Good', color: '#f59e0b', bars: 3 };
    if (acc <= 50) return { label: 'Fair', color: '#f97316', bars: 2 };
    return { label: 'Poor', color: '#ef4444', bars: 1 };
};

/* ══════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ══════════════════════════════════════════════════════════════ */
const SpeedMeter = ({
    externalSpeed,
    externalHeading,
    externalAccuracy,
    isTracking: externalTracking,
}: SpeedMeterProps) => {

    /* ── State ───────────────────────────────────────────── */
    const [gpsStatus, setGpsStatus] = useState<GPSStatus>('idle');
    const [liveGPS, setLiveGPS] = useState<LiveGPS>({
        speed: 0, heading: 0, accuracy: 0,
        altitude: null, lat: null, lng: null, timestamp: 0,
    });
    const [maxSpeedSession, setMaxSpeedSession] = useState(0);
    const [avgSpeedSession, setAvgSpeedSession] = useState(0);
    const [distance, setDistance] = useState(0);   // km this session
    const [sessionTime, setSessionTime] = useState(0); // seconds
    const [speedHistory, setSpeedHistory] = useState<number[]>([]);
    const [permissionGranted, setPermissionGranted] = useState(false);

    const watchIdRef = useRef<number | null>(null);
    const sessionStartRef = useRef<number | null>(null);
    const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);
    const speedSamples = useRef<number[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const calibCountRef = useRef(0);

    /* ── Use external speed if parent already has GPS ─── */
    const displaySpeed = externalSpeed != null
        ? Math.round(externalSpeed)
        : Math.round(liveGPS.speed);

    const displayHeading = externalHeading != null
        ? externalHeading
        : liveGPS.heading;

    const displayAccuracy = externalAccuracy != null
        ? externalAccuracy
        : liveGPS.accuracy;

    /* ── Framer spring for needle animation ──────────── */
    const springSpeed = useSpring(0, { stiffness: 80, damping: 20, mass: 0.5 });
    const needleRotation = useTransform(
        springSpeed,
        [0, MAX_SPEED],
        [ARC_START_DEG, ARC_START_DEG + ARC_SWEEP_DEG]
    );

    useEffect(() => {
        springSpeed.set(displaySpeed);
    }, [displaySpeed, springSpeed]);

    /* ── Start / stop own GPS (only if no external) ──── */
    const startOwnGPS = useCallback(() => {
        if (externalSpeed != null) return; // use parent's GPS
        if (!('geolocation' in navigator)) {
            setGpsStatus('signal_lost');
            return;
        }
        setGpsStatus('acquiring');

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, speed, heading, accuracy, altitude } = pos.coords;
                const kmh = speed != null ? speed * 3.6 : 0;

                // First few reads = calibrating
                calibCountRef.current += 1;
                if (calibCountRef.current <= 3) {
                    setGpsStatus('calibrating');
                } else {
                    setGpsStatus('tracking');
                    setPermissionGranted(true);
                }

                setLiveGPS({
                    speed: kmh,
                    heading: heading ?? 0,
                    accuracy,
                    altitude,
                    lat: latitude,
                    lng: longitude,
                    timestamp: pos.timestamp,
                });

                // Session stats
                if (!sessionStartRef.current) sessionStartRef.current = Date.now();

                speedSamples.current.push(kmh);
                if (kmh > maxSpeedSession) setMaxSpeedSession(kmh);
                setAvgSpeedSession(
                    speedSamples.current.reduce((a, b) => a + b, 0) / speedSamples.current.length
                );

                // Crude distance estimate
                if (lastPosRef.current) {
                    const dlat = latitude - lastPosRef.current.lat;
                    const dlng = longitude - lastPosRef.current.lng;
                    const d = Math.sqrt(dlat ** 2 + dlng ** 2) * 111; // ~km
                    setDistance(prev => prev + d);
                }
                lastPosRef.current = { lat: latitude, lng: longitude };

                // Speed history for mini graph (keep last 30)
                setSpeedHistory(prev => [...prev.slice(-29), kmh]);
            },
            (err) => {
                if (err.code === 1) setGpsStatus('permission_denied');
                else setGpsStatus('signal_lost');
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 10000,
            }
        );

        // Session timer
        timerRef.current = setInterval(() => {
            if (sessionStartRef.current) {
                setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
            }
        }, 1000);
    }, [externalSpeed, maxSpeedSession]);

    useEffect(() => {
        // If external GPS is provided, don't start own
        if (externalSpeed != null) {
            setGpsStatus(externalTracking ? 'tracking' : 'idle');
            return;
        }
        startOwnGPS();
        return () => {
            if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [externalSpeed, externalTracking, startOwnGPS]);

    /* ── Derived ─────────────────────────────────────── */
    const sig = signalQuality(displayAccuracy || 999);
    const arcColor = speedColor(displaySpeed);
    const arcFraction = Math.min(displaySpeed / MAX_SPEED, 1);
    const arcEndDeg = ARC_START_DEG + ARC_SWEEP_DEG * arcFraction;

    const formatTime = (secs: number) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const statusInfo: Record<GPSStatus, { label: string; color: string; icon: JSX.Element }> = {
        idle: { label: 'Waiting…', color: '#6b7280', icon: <Clock size={12} /> },
        acquiring: { label: 'Acquiring GPS…', color: '#8b5cf6', icon: <Satellite size={12} /> },
        calibrating: { label: 'Calibrating…', color: '#f59e0b', icon: <Activity size={12} /> },
        tracking: { label: 'GPS Live', color: '#10b981', icon: <CheckCircle size={12} /> },
        signal_lost: { label: 'Signal Lost', color: '#ef4444', icon: <WifiOff size={12} /> },
        permission_denied: { label: 'Permission Denied', color: '#ef4444', icon: <AlertTriangle size={12} /> },
    };

    const { label: statusLabel, color: statusColor, icon: statusIcon } = statusInfo[gpsStatus];

    /* SVG dimensions */
    const CX = 150, CY = 150, R = 120;
    const TRACK_R = R;
    const TICK_R_OUT = R + 8;
    const TICK_R_IN_MAJOR = R - 14;
    const TICK_R_IN_MINOR = R - 8;

    /* Speed ticks */
    const ticks = Array.from({ length: 19 }, (_, i) => {
        const speed = i * 10;
        const deg = ARC_START_DEG + (speed / MAX_SPEED) * ARC_SWEEP_DEG;
        const isMajor = i % 3 === 0;
        return { speed, deg, isMajor };
    });

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(160deg, #060614 0%, #0f0f24 50%, #06061a 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px 16px 120px',
            gap: 16,
            fontFamily: "'Inter', sans-serif",
        }}>

            {/* ── HEAD BAR ── */}
            <div style={{
                width: '100%', maxWidth: 420,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0 4px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: statusColor,
                        boxShadow: `0 0 10px ${statusColor}`,
                    }} />
                    <span style={{ color: statusColor, fontSize: 12, fontWeight: 700, letterSpacing: '0.5px' }}>
                        {statusLabel}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Signal bars */}
                    {[1, 2, 3, 4, 5].map(b => (
                        <div key={b} style={{
                            width: 4,
                            height: 4 + b * 3,
                            borderRadius: 2,
                            background: b <= sig.bars ? sig.color : 'rgba(255,255,255,0.12)',
                            alignSelf: 'flex-end',
                        }} />
                    ))}
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginLeft: 4 }}>
                        {displayAccuracy > 0 ? `±${Math.round(displayAccuracy)}m` : '---'}
                    </span>
                </div>
            </div>

            {/* ── MAIN GAUGE ── */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                style={{ position: 'relative', width: 300, height: 300 }}
            >
                <svg width={300} height={300} viewBox="0 0 300 300">
                    <defs>
                        {/* Glow filter */}
                        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        <filter id="strongGlow" x="-60%" y="-60%" width="220%" height="220%">
                            <feGaussianBlur stdDeviation="8" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>

                        {/* Arc gradient  */}
                        <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="45%" stopColor="#f59e0b" />
                            <stop offset="75%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>

                        {/* Needle gradient */}
                        <linearGradient id="needleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#fff" />
                            <stop offset="100%" stopColor={arcColor} />
                        </linearGradient>

                        {/* Clipping mask for arc up to current speed */}
                        <clipPath id="arcClip">
                            <path d={arcFraction > 0
                                ? describeArc(CX, CY, TRACK_R, ARC_START_DEG, arcEndDeg)
                                : ''}
                            />
                        </clipPath>
                    </defs>

                    {/* Outer ring - decorative */}
                    <circle cx={CX} cy={CY} r={140} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={2} />

                    {/* Background track arc */}
                    <path
                        d={describeArc(CX, CY, TRACK_R, ARC_START_DEG, ARC_START_DEG + ARC_SWEEP_DEG)}
                        fill="none"
                        stroke="rgba(255,255,255,0.07)"
                        strokeWidth={14}
                        strokeLinecap="round"
                    />

                    {/* Gradient colored arc (full track tinted) */}
                    <path
                        d={describeArc(CX, CY, TRACK_R, ARC_START_DEG, ARC_START_DEG + ARC_SWEEP_DEG)}
                        fill="none"
                        stroke="url(#arcGrad)"
                        strokeWidth={14}
                        strokeLinecap="round"
                        opacity={0.15}
                    />

                    {/* Live speed arc */}
                    {arcFraction > 0.005 && (
                        <motion.path
                            d={describeArc(CX, CY, TRACK_R, ARC_START_DEG, arcEndDeg)}
                            fill="none"
                            stroke={arcColor}
                            strokeWidth={14}
                            strokeLinecap="round"
                            filter="url(#glow)"
                            style={{ transition: 'd 0.3s ease' }}
                        />
                    )}

                    {/* Tick marks */}
                    {ticks.map(({ speed, deg, isMajor }) => {
                        const rad = (deg - 90) * Math.PI / 180;
                        const x1 = CX + TICK_R_OUT * Math.cos(rad);
                        const y1 = CY + TICK_R_OUT * Math.sin(rad);
                        const r2 = isMajor ? TICK_R_IN_MAJOR : TICK_R_IN_MINOR;
                        const x2 = CX + r2 * Math.cos(rad);
                        const y2 = CY + r2 * Math.sin(rad);
                        const isLit = speed <= displaySpeed;
                        return (
                            <g key={speed}>
                                <line
                                    x1={x1} y1={y1} x2={x2} y2={y2}
                                    stroke={isLit ? arcColor : 'rgba(255,255,255,0.18)'}
                                    strokeWidth={isMajor ? 2.5 : 1.5}
                                    strokeLinecap="round"
                                />
                                {isMajor && (
                                    <text
                                        x={CX + (r2 - 16) * Math.cos(rad)}
                                        y={CY + (r2 - 16) * Math.sin(rad)}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fontSize={9}
                                        fill={isLit ? arcColor : 'rgba(255,255,255,0.35)'}
                                        fontWeight={700}
                                    >
                                        {speed}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Center glass circle */}
                    <circle cx={CX} cy={CY} r={85}
                        fill="rgba(15,15,40,0.9)"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={1}
                    />
                    <circle cx={CX} cy={CY - 30} r={85}
                        fill="rgba(255,255,255,0.015)"
                    />

                    {/* Needle */}
                    <motion.g
                        style={{ originX: `${CX}px`, originY: `${CY}px`, rotate: needleRotation }}
                    >
                        <line
                            x1={CX} y1={CY}
                            x2={CX} y2={CY - 95}
                            stroke="url(#needleGrad)"
                            strokeWidth={3}
                            strokeLinecap="round"
                            filter="url(#glow)"
                        />
                        {/* Needle base tiny circle */}
                        <circle cx={CX} cy={CY} r={7}
                            fill={arcColor}
                            filter="url(#strongGlow)"
                        />
                        <circle cx={CX} cy={CY} r={4} fill="#fff" />
                    </motion.g>

                    {/* Center readout */}
                    <text
                        x={CX} y={CY + 14}
                        textAnchor="middle"
                        fontSize={44}
                        fontWeight={900}
                        fill="#fff"
                        letterSpacing={-2}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                        {displaySpeed}
                    </text>
                    <text
                        x={CX} y={CY + 34}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={700}
                        fill="rgba(255,255,255,0.35)"
                        letterSpacing="2"
                    >
                        KM / H
                    </text>
                </svg>

                {/* Status icon overlay - bottom of gauge */}
                <div style={{
                    position: 'absolute', bottom: 28, left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(0,0,0,0.5)',
                    border: `1px solid ${statusColor}33`,
                    borderRadius: 20, padding: '3px 10px',
                }}>
                    <span style={{ color: statusColor }}>{statusIcon}</span>
                    <span style={{ color: statusColor, fontSize: 10, fontWeight: 700 }}>{statusLabel}</span>
                </div>
            </motion.div>

            {/* ── SPEED CATEGORY LABEL ── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={Math.floor(displaySpeed / 20)}
                    initial={{ opacity: 0, y: -8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.9 }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: `${arcColor}18`,
                        border: `1px solid ${arcColor}44`,
                        borderRadius: 20, padding: '6px 16px',
                    }}
                >
                    <Zap size={14} style={{ color: arcColor }} />
                    <span style={{ color: arcColor, fontSize: 13, fontWeight: 800 }}>
                        {displaySpeed === 0 ? 'Stationary' :
                            displaySpeed < 20 ? 'Walking Pace' :
                                displaySpeed < 40 ? 'City Speed' :
                                    displaySpeed < 60 ? 'Normal Speed' :
                                        displaySpeed < 80 ? 'Fast Riding' :
                                            displaySpeed < 120 ? 'Highway Speed' :
                                                'Extreme Speed ⚠️'}
                    </span>
                </motion.div>
            </AnimatePresence>

            {/* ── STATS GRID ── */}
            <div style={{
                width: '100%', maxWidth: 420,
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 10,
            }}>
                {/* Heading compass */}
                <StatCard
                    icon={<Compass size={18} style={{ color: '#6366f1' }} />}
                    label="Heading"
                    value={`${Math.round(displayHeading)}°`}
                    sub={headingLabel(displayHeading)}
                    accent="#6366f1"
                    right={
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            border: '2px solid rgba(99,102,241,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative',
                        }}>
                            <Navigation
                                size={14}
                                style={{
                                    color: '#6366f1',
                                    transform: `rotate(${displayHeading}deg)`,
                                    transition: 'transform 0.4s ease',
                                }}
                            />
                        </div>
                    }
                />

                {/* Max speed */}
                <StatCard
                    icon={<TrendingUp size={18} style={{ color: '#f59e0b' }} />}
                    label="Max Speed"
                    value={`${Math.round(externalSpeed != null ? Math.max(externalSpeed, maxSpeedSession) : maxSpeedSession)}`}
                    sub="km/h this session"
                    accent="#f59e0b"
                />

                {/* Signal quality */}
                <StatCard
                    icon={sig.bars >= 3 ? <Wifi size={18} style={{ color: sig.color }} /> : <WifiOff size={18} style={{ color: sig.color }} />}
                    label="GPS Signal"
                    value={sig.label}
                    sub={displayAccuracy > 0 ? `±${Math.round(displayAccuracy)}m accuracy` : 'Waiting…'}
                    accent={sig.color}
                />

                {/* Session time */}
                <StatCard
                    icon={<Clock size={18} style={{ color: '#10b981' }} />}
                    label="Session"
                    value={formatTime(sessionTime)}
                    sub={`Avg ${Math.round(avgSpeedSession)} km/h`}
                    accent="#10b981"
                />
            </div>

            {/* ── SPEED GRAPH ── */}
            {speedHistory.length > 2 && (
                <div style={{
                    width: '100%', maxWidth: 420,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 16, padding: '12px 16px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                            Live Speed Graph
                        </span>
                        <Activity size={14} style={{ color: arcColor, opacity: 0.7 }} />
                    </div>
                    <svg width="100%" height={48} viewBox={`0 0 ${speedHistory.length * 10} 60`} preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={arcColor} stopOpacity="0.4" />
                                <stop offset="100%" stopColor={arcColor} stopOpacity="0.0" />
                            </linearGradient>
                        </defs>
                        {/* Fill */}
                        <path
                            d={`M 0 60 ${speedHistory.map((s, i) =>
                                `L ${i * 10} ${60 - (s / MAX_SPEED) * 55}`
                            ).join(' ')} L ${(speedHistory.length - 1) * 10} 60 Z`}
                            fill="url(#graphFill)"
                        />
                        {/* Line */}
                        <polyline
                            points={speedHistory.map((s, i) =>
                                `${i * 10},${60 - (s / MAX_SPEED) * 55}`
                            ).join(' ')}
                            fill="none"
                            stroke={arcColor}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
            )}

            {/* Permission denied help */}
            <AnimatePresence>
                {gpsStatus === 'permission_denied' && externalSpeed == null && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        style={{
                            width: '100%', maxWidth: 420,
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: 16, padding: 16,
                            display: 'flex', gap: 12, alignItems: 'flex-start',
                        }}
                    >
                        <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                        <div>
                            <p style={{ color: '#f87171', fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>
                                Location Permission Required
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0 }}>
                                Enable location in your browser settings, then reload. Your device GPS is needed for real-time speed.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ── Stat Card ──────────────────────────────────────────────── */
const StatCard = ({
    icon, label, value, sub, accent, right,
}: {
    icon: JSX.Element;
    label: string;
    value: string;
    sub: string;
    accent: string;
    right?: JSX.Element;
}) => (
    <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        overflow: 'hidden',
    }}>
        {/* Subtle accent glow top-left */}
        <div style={{
            position: 'absolute', top: 0, left: 0,
            width: 60, height: 60,
            background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
            borderRadius: '0 0 100% 0',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {icon}
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {label}
                </span>
            </div>
            {right}
        </div>
        <div>
            <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
                {value}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '2px 0 0', fontWeight: 600 }}>
                {sub}
            </p>
        </div>
    </div>
);

export default SpeedMeter;
