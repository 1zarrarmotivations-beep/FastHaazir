import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useTransform, MotionValue } from 'framer-motion';
import {
    Save,
    MapPin,
    Navigation,
    Zap,
    RotateCcw,
    Settings,
    Activity,
    Wifi,
    Timer,
    AlertTriangle,
    Gauge,
    Loader2
} from 'lucide-react';
import { useSaveRiderTrip } from '@/hooks/useRiderTrips';
import { toast } from 'sonner';

interface SpeedMeterProps {
    isActive?: boolean;
    className?: string;
}

interface SpeedData {
    currentSpeed: number; // in km/h
    maxSpeed: number;
    avgSpeed: number;
    distance: number; // in meters
    direction: number; // in degrees
    isGpsConnected: boolean;
    accuracy: number;
    satellites: number;
    altitude: number;
}

interface Position {
    lat: number;
    lng: number;
    timestamp: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    altitude?: number;
}

const SpeedMeter: React.FC<SpeedMeterProps> = ({
    isActive = true,
    className = ''
}) => {
    // -- State --
    const [speedData, setSpeedData] = useState<SpeedData>({
        currentSpeed: 0,
        maxSpeed: 0,
        avgSpeed: 0,
        distance: 0,
        direction: 0,
        isGpsConnected: false,
        accuracy: 0,
        satellites: 0,
        altitude: 0
    });
    const [status, setStatus] = useState<'calibrating' | 'tracking' | 'signal_lost' | 'denied' | 'disabled' | 'inactive'>('inactive');
    const [unit, setUnit] = useState<'kmh' | 'mph'>('kmh');
    const [error, setError] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showNewRecord, setShowNewRecord] = useState(false);

    // -- Animation Springs --
    // Smooth speed value for the needle
    const smoothSpeed = useSpring(0, { stiffness: 60, damping: 15, mass: 0.5 });
    // Smooth speed value for digital display (slightly snappier)
    const smoothDigitalSpeed = useSpring(0, { stiffness: 100, damping: 20 });

    useEffect(() => {
        smoothSpeed.set(speedData.currentSpeed);
        smoothDigitalSpeed.set(speedData.currentSpeed);
    }, [speedData.currentSpeed, smoothSpeed, smoothDigitalSpeed]);

    const saveTripMutation = useSaveRiderTrip();

    // -- Refs for Calculation --
    const watchIdRef = useRef<number | null>(null);
    const previousPositionRef = useRef<Position | null>(null);
    const speedHistoryRef = useRef<number[]>([]);
    const totalDistanceRef = useRef(0);
    const maxSpeedRef = useRef(0);
    const lastMaxSpeedRef = useRef(0);
    const recordTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(Date.now());
    const startPosRef = useRef<Position | null>(null);

    // -- Helpers --
    const convertSpeed = (speedKmH: number) => unit === 'kmh' ? speedKmH : speedKmH * 0.621371;
    const speedUnitLabel = unit === 'kmh' ? 'KM/H' : 'MPH';

    const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }, []);

    const calculateBearing = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        const brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        return brng;
    }, []);

    const getDirectionText = (bearing: number): string => {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(bearing / 45) % 8;
        return directions[index];
    };

    // -- GPS Logic --
    const startTracking = useCallback(() => {
        setError(null);
        setStatus('calibrating');

        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            setStatus('disabled');
            return;
        }

        const handlePosition = (pos: GeolocationPosition) => {
            setStatus('tracking');
            const newSpeed = pos.coords.speed ? pos.coords.speed * 3.6 : 0; // m/s to km/h
            const currentPos: Position = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                timestamp: pos.timestamp,
                speed: newSpeed,
                heading: pos.coords.heading || 0,
                accuracy: pos.coords.accuracy || 0,
                altitude: pos.coords.altitude || 0
            };

            if (!startPosRef.current) {
                startPosRef.current = currentPos;
                startTimeRef.current = Date.now();
            }

            // Distance Calc
            if (previousPositionRef.current) {
                const dist = calculateDistance(
                    previousPositionRef.current.lat,
                    previousPositionRef.current.lng,
                    currentPos.lat,
                    currentPos.lng
                );
                // Filter GPS drift: only add if reasonable distance
                if (dist > 5 && dist < 500) {
                    totalDistanceRef.current += dist;
                }
            }

            // Max Speed Logic
            if (newSpeed > maxSpeedRef.current && newSpeed > 5) {
                maxSpeedRef.current = newSpeed;
                if (newSpeed > lastMaxSpeedRef.current + 2) {
                    setShowNewRecord(true);
                    lastMaxSpeedRef.current = newSpeed;
                    if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
                    recordTimeoutRef.current = setTimeout(() => setShowNewRecord(false), 3000);
                }
            }

            // Avg Speed Logic
            if (newSpeed > 1) { // Only count moving speed
                speedHistoryRef.current.push(newSpeed);
                if (speedHistoryRef.current.length > 500) speedHistoryRef.current.shift();
            }

            const avgSpeed = speedHistoryRef.current.length > 0
                ? speedHistoryRef.current.reduce((a, b) => a + b, 0) / speedHistoryRef.current.length
                : 0;

            // Heading fallback
            let direction = pos.coords.heading || 0;
            if (!direction && previousPositionRef.current && newSpeed > 2) {
                direction = calculateBearing(
                    previousPositionRef.current.lat,
                    previousPositionRef.current.lng,
                    currentPos.lat,
                    currentPos.lng
                );
            } else if (!direction && previousPositionRef.current) {
                direction = speedData.direction; // Keep last known heading if stopped
            }

            setSpeedData({
                currentSpeed: newSpeed,
                maxSpeed: maxSpeedRef.current,
                avgSpeed,
                distance: totalDistanceRef.current,
                direction,
                isGpsConnected: true,
                accuracy: pos.coords.accuracy || 0,
                satellites: 0,
                altitude: pos.coords.altitude || 0
            });

            previousPositionRef.current = currentPos;
        };

        const handleError = (err: GeolocationPositionError) => {
            if (err.code === err.PERMISSION_DENIED) {
                setError('GPS Permission Denied');
                setStatus('denied');
            } else {
                setError('GPS Signal Weak');
                setStatus('signal_lost');
            }
            setSpeedData(prev => ({ ...prev, isGpsConnected: false }));
        };

        navigator.geolocation.getCurrentPosition(handlePosition, handleError, { enableHighAccuracy: true });
        watchIdRef.current = navigator.geolocation.watchPosition(
            handlePosition,
            handleError,
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
    }, [calculateDistance, calculateBearing, speedData.direction]);

    const stopTracking = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isActive) startTracking();
        else stopTracking();
        return () => stopTracking();
    }, [isActive, startTracking, stopTracking]);

    const resetTrip = () => {
        speedHistoryRef.current = [];
        totalDistanceRef.current = 0;
        maxSpeedRef.current = 0;
        lastMaxSpeedRef.current = 0;
        setShowNewRecord(false);
        setSpeedData(prev => ({ ...prev, currentSpeed: 0, maxSpeed: 0, avgSpeed: 0, distance: 0 }));
    };

    const handleSaveTrip = async () => {
        if (totalDistanceRef.current < 50) { // < 50 meters
            toast.error('Trip too short to save (<50m)');
            return;
        }
        try {
            setIsSaving(true);
            await saveTripMutation.mutateAsync({
                start_time: new Date(startTimeRef.current).toISOString(),
                end_time: new Date().toISOString(),
                distance_km: totalDistanceRef.current / 1000,
                max_speed_kmh: maxSpeedRef.current,
                avg_speed_kmh: speedData.avgSpeed,
                start_lat: startPosRef.current?.lat || null,
                start_lng: startPosRef.current?.lng || null,
                end_lat: previousPositionRef.current?.lat || null,
                end_lng: previousPositionRef.current?.lng || null,
                metadata: { accuracy: speedData.accuracy, altitude: speedData.altitude, version: '3.0' }
            });
            resetTrip();
            startPosRef.current = null;
            startTimeRef.current = Date.now();
            toast.success('Trip saved successfully!');
        } catch (error) {
            console.error('Error saving trip:', error);
            toast.error('Failed to save trip');
        } finally {
            setIsSaving(false);
        }
    };

    // -- Visual Configuration --
    const MAX_SPEED = 180;
    const START_ANGLE = -135;
    const END_ANGLE = 135;

    // Map speed 0-180 to angle -135 to 135
    const needleAngle = useTransform(smoothSpeed, [0, MAX_SPEED], [START_ANGLE, END_ANGLE]);

    // Dynamic color for speed
    const speedColor = (s: number) => {
        if (s < 50) return '#10b981'; // Emerald
        if (s < 90) return '#3b82f6'; // Blue
        if (s < 120) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
    };

    return (
        <div className={`relative ${className}`}>
            {/* Dashboard Bezel & Case */}
            <div className="relative bg-[#09090b] rounded-[3rem] p-2 shadow-2xl border border-slate-800/80 overflow-hidden select-none">

                {/* Carbon Fiber Background Effect */}
                <div className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: 'radial-gradient(circle at center, #1e293b 2px, transparent 2.5px)',
                        backgroundSize: '12px 12px'
                    }}
                />

                {/* Main Dashboard Surface */}
                <div className="relative bg-gradient-to-b from-[#18181b] to-[#020617] rounded-[2.8rem] p-6 shadow-[inset_0_2px_20px_rgba(0,0,0,0.8)]">

                    {/* Status Bar */}
                    <div className="flex justify-between items-center mb-6 px-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${status === 'tracking' ? 'bg-emerald-500 shadow-emerald-500 animate-pulse' :
                                status === 'calibrating' ? 'bg-amber-400 shadow-amber-400 animate-pulse' :
                                    'bg-red-500 shadow-red-500'}`}
                            />
                            <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                                {status === 'tracking' ? 'GPS LIVE' : status}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setUnit(u => u === 'kmh' ? 'mph' : 'kmh')}
                                className="px-2 py-1 rounded bg-slate-800/50 border border-white/5 text-[10px] font-bold text-slate-400">
                                {unit.toUpperCase()}
                            </motion.button>
                            <motion.button whileTap={{ rotate: 180 }} onClick={resetTrip}
                                className="p-1 rounded bg-slate-800/50 border border-white/5 text-slate-400">
                                <RotateCcw className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveTrip} disabled={isSaving}
                                className="p-1 rounded bg-emerald-900/20 border border-emerald-500/20 text-emerald-400">
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </motion.button>
                        </div>
                    </div>

                    {/* Gauge Container */}
                    <div className="relative w-72 h-72 mx-auto">

                        {/* 1. Outer Chrome Ring */}
                        <div className="absolute inset-0 rounded-full border-[2px] border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-gradient-to-br from-slate-800 to-black p-1">
                            <div className="w-full h-full rounded-full bg-[#050505] border-[1px] border-white/5 shadow-inner" />
                        </div>

                        {/* 2. SVG Gauge Face */}
                        <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full overflow-visible">
                            <defs>
                                <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#10b981" />   {/* Green */}
                                    <stop offset="50%" stopColor="#3b82f6" />   {/* Blue */}
                                    <stop offset="80%" stopColor="#f59e0b" />   {/* Orange */}
                                    <stop offset="100%" stopColor="#ef4444" />  {/* Red */}
                                </linearGradient>
                                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>

                            {/* Tick Marks */}
                            {Array.from({ length: 41 }).map((_, i) => {
                                const tickSpeed = i * (MAX_SPEED / 40); // 180 / 40 = 4.5 steps
                                const isMajor = i % 5 === 0;
                                const angle = START_ANGLE + (tickSpeed / MAX_SPEED) * (END_ANGLE - START_ANGLE);
                                const rad = (angle - 90) * (Math.PI / 180);

                                // Dynamic highlighting of ticks
                                const isActive = tickSpeed <= speedData.currentSpeed;
                                const tickColor = isActive ? (tickSpeed > 140 ? '#ef4444' : '#e2e8f0') : '#334155';
                                const tickOpacity = isActive ? 1 : 0.4;

                                const innerR = isMajor ? 110 : 115;
                                const outerR = 125;

                                const x1 = 150 + innerR * Math.cos(rad);
                                const y1 = 150 + innerR * Math.sin(rad);
                                const x2 = 150 + outerR * Math.cos(rad);
                                const y2 = 150 + outerR * Math.sin(rad);

                                // Number Labels
                                const labelR = 95;
                                const labelX = 150 + labelR * Math.cos(rad);
                                const labelY = 150 + labelR * Math.sin(rad);

                                return (
                                    <g key={i}>
                                        <line x1={x1} y1={y1} x2={x2} y2={y2}
                                            stroke={tickColor}
                                            strokeWidth={isMajor ? 3 : 1.5}
                                            strokeOpacity={tickOpacity}
                                            strokeLinecap="round"
                                        />
                                        {isMajor && (
                                            <text x={labelX} y={labelY}
                                                textAnchor="middle" dominantBaseline="middle"
                                                fill={isActive ? '#ffffff' : '#475569'}
                                                className={`text-[12px] font-bold ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : ''}`}
                                                style={{ fontFamily: 'Inter, sans-serif' }}
                                            >
                                                {Math.round(unit === 'kmh' ? tickSpeed : tickSpeed * 0.62)}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}

                            {/* Redline Zone Arc */}
                            <path d="M 238.3 238.3 A 125 125 0 0 0 275 150"
                                fill="none" stroke="#ef4444" strokeWidth="4" strokeOpacity="0.8" transform="rotate(0 150 150)"
                            />
                        </svg>

                        {/* 3. Center Info & Digital Speed */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 pointer-events-none">
                            {/* Gears / Zone */}
                            <div className="mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${speedData.currentSpeed === 0 ? 'bg-slate-800 text-slate-400' :
                                    speedData.currentSpeed > 120 ? 'bg-red-500/20 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' :
                                        'bg-emerald-500/20 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                                    }`}>
                                    {speedData.currentSpeed === 0 ? 'PARK' : speedData.currentSpeed > 120 ? 'SPORT' : 'DRIVE'}
                                </span>
                            </div>

                            {/* Digital Number */}
                            <div className="relative">
                                <SpeedNumber displayValue={smoothDigitalSpeed} color={speedColor(speedData.currentSpeed)} />
                            </div>

                            {/* Unit Label */}
                            <span className="text-xs font-bold text-slate-500 tracking-[0.3em] mt-0">
                                {speedUnitLabel}
                            </span>
                        </div>

                        {/* 4. Realistic Needle */}
                        {/* Needle Container - Rotated by FrameMotion */}
                        <motion.div
                            className="absolute inset-0 pointer-events-none z-20"
                            style={{ rotate: needleAngle }}
                        >
                            <div className="w-full h-full relative">
                                {/* The Needle itself: pointing vertically up (0 deg), needs to be aligned with range */}
                                {/* Since we use Framer Motion 'rotate', 0 deg is 12 o'clock. 
                                    Our range is -135deg (approx 7:30) to +135deg (approx 4:30).
                                    A vertical needle at 0deg is correct for 12 o'clock.
                                */}
                                <div className="absolute left-1/2 top-1/2 -ml-[3px] -mt-[110px] w-[6px] h-[110px] origin-bottom">
                                    <div className="w-full h-full bg-gradient-to-t from-red-600 via-red-500 to-transparent rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
                                    {/* Glint at tip */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full blur-[2px]" />
                                </div>
                            </div>
                        </motion.div>

                        {/* 5. Center Hub Cap */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#18181b] border-4 border-[#27272a] shadow-2xl z-30 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-black border border-slate-700/50 shadow-inner flex items-center justify-center">
                                <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                            </div>
                        </div>
                    </div>

                    {/* Lower Dashboard Params (Sub-dials simulation style) */}
                    <div className="grid grid-cols-2 gap-4 mt-8 px-2">
                        {/* Data Card 1 */}
                        <div className="bg-slate-900/40 rounded-xl p-3 border border-white/5 flex items-center justify-between shadow-lg">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">TRIP DIST</span>
                                <span className="text-lg font-mono font-bold text-emerald-400">
                                    {(convertSpeed(speedData.distance) / 1000).toFixed(1)} <span className="text-xs text-slate-600">{unit === 'kmh' ? 'km' : 'mi'}</span>
                                </span>
                            </div>
                            <MapPin className="w-5 h-5 text-slate-700" />
                        </div>
                        {/* Data Card 2 */}
                        <div className="bg-slate-900/40 rounded-xl p-3 border border-white/5 flex items-center justify-between shadow-lg">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">MAX SPEED</span>
                                <span className="text-lg font-mono font-bold text-orange-400">
                                    {Math.round(convertSpeed(speedData.maxSpeed))} <span className="text-xs text-slate-600">{unit.toLowerCase()}</span>
                                </span>
                            </div>
                            <TrendingUpArrow />
                        </div>
                    </div>

                    {/* Toggle Diagnostics */}
                    <div className="flex justify-center mt-4">
                        <button onClick={() => setShowDetails(!showDetails)} className="text-slate-600 hover:text-slate-400 transition-colors py-2">
                            <div className="w-12 h-1 bg-slate-800 rounded-full" />
                        </button>
                    </div>

                    <AnimatePresence>
                        {showDetails && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 pt-4 border-t border-slate-800/50 grid grid-cols-3 gap-2">
                                    <DetailItem label="AVG" value={Math.round(convertSpeed(speedData.avgSpeed)).toString()} sub={unit} />
                                    <DetailItem label="ALTITUDE" value={Math.round(speedData.altitude).toString()} sub="m" />
                                    <DetailItem label="ACCURACY" value={`±${Math.round(speedData.accuracy)}`} sub="m" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* New Record Popup */}
                    <AnimatePresence>
                        {showNewRecord && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                                className="absolute top-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-4 py-1.5 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.6)] z-50 flex items-center gap-2 whitespace-nowrap pointer-events-none"
                            >
                                <Zap className="w-3.5 h-3.5 fill-white" />
                                <span className="text-xs font-black italic tracking-wider">NEW RECORD!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error Toast */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 20, opacity: 0 }}
                                className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/20 backdrop-blur-md p-3 rounded-xl flex items-center gap-3 z-50"
                            >
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <span className="text-[10px] font-bold text-red-400 uppercase">{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Simulated Glass Reflection Overlay */}
                <div className="absolute inset-2 rounded-[2.8rem] pointer-events-none bg-gradient-to-tr from-white/5 to-transparent z-40 mix-blend-overlay" />
                <div className="absolute inset-2 rounded-[2.8rem] pointer-events-none bg-gradient-to-b from-white/10 via-transparent to-transparent z-40 opacity-30" />
                {/* Specular Highlight */}
                <div className="absolute top-4 right-4 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            </div>
        </div>
    );
};

// -- Sub Components --

const TrendingUpArrow = () => (
    <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const DetailItem = ({ label, value, sub }: { label: string, value: string, sub: string }) => (
    <div className="flex flex-col items-center bg-slate-900/30 rounded-xl p-2 border border-white/5">
        <span className="text-[8px] font-bold text-slate-500 mb-0.5">{label}</span>
        <div className="text-sm font-mono font-bold text-slate-300">
            {value}<span className="text-[10px] text-slate-600 ml-0.5 font-sans">{sub}</span>
        </div>
    </div>
);

// Component to render the digital speed number using the motion value
// Note: We use a React functional component wrapper to listen to the motion value update
const SpeedNumber = ({ displayValue, color }: { displayValue: MotionValue<number>, color: string }) => {
    const [val, setVal] = useState(0);

    useEffect(() => {
        // Subscribe to changes in the spring
        const unsubscribe = displayValue.on("change", (latest: number) => {
            setVal(Math.round(latest));
        });
        return unsubscribe;
    }, [displayValue]);

    return (
        <span className="text-7xl font-black italic tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            style={{
                color,
                fontFamily: '"Orbitron", "Segoe UI", sans-serif'
            }}
        >
            {val}
        </span>
    );
};

export default SpeedMeter;
