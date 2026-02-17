import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    ChevronRight,
    ArrowRight,
    Package,
    Truck,
    MapPin,
    CheckCircle2,
    ShoppingCart,
    Utensils,
    RefreshCcw,
    Sparkles,
    Shield
} from "lucide-react";
import logo from "@/assets/fast-haazir-logo-optimized.webp";

const ONBOARDING_KEY = "fasthaazir_onboarding_completed";

interface OnboardingStep {
    id: 'intro' | 'speed' | 'services' | 'tracking' | 'cta';
    titleEn: string;
    titleUr: string;
    subtextEn: string;
    subtextUr: string;
    image: string;
    color: string;
    icon?: React.ReactNode;
    accentColor: string;
}

const steps: OnboardingStep[] = [
    {
        id: 'intro',
        titleEn: "Faast Haazir",
        titleUr: "کوئٹہ کی اپنی ڈیلیوری ایپ",
        subtextEn: "Everything, Anytime – Just a Tap Away in Quetta",
        subtextUr: "کوئٹہ میں ہر چیز، ہر وقت – بس ایک ٹیپ پر",
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200", // Quetta/Mountains
        color: "from-emerald-600 to-emerald-950",
        accentColor: "bg-emerald-500",
        icon: <MapPin className="w-10 h-10 text-white" />,
    },
    {
        id: 'speed',
        titleEn: "Fastest in Quetta",
        titleUr: "سب سے تیز ڈیلیوری",
        subtextEn: "30-Minute Guaranteed Delivery Across the City",
        subtextUr: "پورے شہر میں 30 منٹ کی یقینی ڈیلیوری",
        image: "https://images.unsplash.com/photo-1619641782842-83f2f9c45014?auto=format&fit=crop&q=80&w=1200", // Delivery Rider
        color: "from-amber-500 to-orange-700",
        accentColor: "bg-amber-500",
        icon: <Truck className="w-10 h-10 text-white" />,
    },
    {
        id: 'services',
        titleEn: "Complete Services",
        titleUr: "ہمہ گیر خدمات",
        subtextEn: "Food, Grocery, Parcel & Returns at Your Door",
        subtextUr: "کھانا، گراسری، پارسل اور واپسی اب آپ کی دہلیز پر",
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200", // Local Market vibe
        color: "from-emerald-600 to-orange-500",
        accentColor: "bg-emerald-500",
        icon: <Package className="w-10 h-10 text-white" />,
    },
    {
        id: 'tracking',
        titleEn: "Live Real-time Tracking",
        titleUr: "براہ راست ٹریکنگ",
        subtextEn: "Know Exactly Where Your Rider is in Quetta",
        subtextUr: "کوئٹہ میں اپنے رائیڈر کی مکمل لوکیشن جانیں",
        image: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&q=80&w=1200", // Map
        color: "from-slate-800 to-emerald-900",
        accentColor: "bg-emerald-400",
        icon: <ArrowRight className="w-10 h-10 text-white" />,
    },
    {
        id: 'cta',
        titleEn: "Ready for Better?",
        titleUr: "آغاز کرنے کے لیے تیار؟",
        subtextEn: "Join Thousands of Happy Customers in Quetta",
        subtextUr: "کوئٹہ کے ہزاروں خوشگوار صارفین میں شامل ہوں",
        image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1200", // Success
        color: "from-emerald-500 via-orange-500 to-emerald-500",
        accentColor: "bg-orange-500",
        icon: <CheckCircle2 className="w-10 h-10 text-white" />,
    },
];

interface OnboardingFlowProps {
    onComplete?: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(0);
    const navigate = useNavigate();
    const touchStart = useRef(0);
    const touchEnd = useRef(0);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setDirection(1);
            setCurrentStep(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const handleSkip = () => {
        handleFinish();
    };

    const handleFinish = () => {
        localStorage.setItem(ONBOARDING_KEY, "true");
        if (onComplete) {
            onComplete();
        } else {
            navigate("/auth");
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEnd.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (touchStart.current - touchEnd.current > 75) {
            // Swipe Left -> Next
            if (currentStep < steps.length - 1) {
                setDirection(1);
                setCurrentStep(prev => prev + 1);
            }
        }

        if (touchStart.current - touchEnd.current < -75) {
            // Swipe Right -> Previous
            if (currentStep > 0) {
                setDirection(-1);
                setCurrentStep(prev => prev - 1);
            }
        }
    };

    const step = steps[currentStep];

    return (
        <div
            className="fixed inset-0 z-[100] h-screen w-full overflow-hidden bg-background font-sans touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Background Layers */}
            <div className="absolute inset-0 z-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0"
                    >
                        {/* Gradient Base */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-40`} />

                        {/* High Quality Background Image */}
                        <motion.img
                            initial={{ scale: 1.2, filter: "blur(4px)" }}
                            animate={{ scale: 1, filter: "blur(0px)" }}
                            transition={{ duration: 8, ease: "linear" }}
                            src={step.image}
                            alt=""
                            className="w-full h-full object-cover"
                        />

                        {/* Modern Overlays */}
                        <div className="absolute inset-0 bg-black/40 backdrop-contrast-[1.1] backdrop-brightness-[0.9]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/20 to-transparent" />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Header / Logo Section */}
            <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-6 pt-12">
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-3"
                >
                    <div className="p-2 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl">
                        <img src={logo} alt="Faast Haazir" className="h-8 w-auto object-contain brightness-0 invert" />
                    </div>
                </motion.div>

                {currentStep < steps.length - 1 && (
                    <motion.button
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        onClick={handleSkip}
                        className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white/80 text-sm font-medium hover:bg-white/20 active:scale-95 transition-all"
                    >
                        Skip / چھوڑیں
                    </motion.button>
                )}
            </div>

            {/* Main Content Area */}
            <div className="relative h-full w-full flex flex-col items-center justify-end z-10 px-6 pb-安全-area-bottom pb-12">

                {/* Floating Content Card (Glassmorphism) */}
                <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl rounded-[3rem] p-8 border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden mb-8">
                    {/* Decorative Background Glows inside card */}
                    <div className={`absolute -top-20 -right-20 w-40 h-40 ${step.accentColor} opacity-20 blur-[60px] rounded-full`} />
                    <div className={`absolute -bottom-10 -left-10 w-24 h-24 ${step.accentColor} opacity-10 blur-[40px] rounded-full`} />

                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="flex flex-col items-center text-center space-y-6"
                        >
                            {/* Animated Icon Container */}
                            <motion.div
                                initial={{ scale: 0.5, rotate: -15 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className={`w-20 h-20 ${step.accentColor} rounded-3xl flex items-center justify-center shadow-[0_12px_24px_-4px_rgba(0,0,0,0.3)] border border-white/20 relative cursor-pointer group overflow-hidden`}
                                whileHover={{ scale: 1.05 }}
                                onClick={handleNext}
                            >
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative z-10">{step.icon}</div>
                                <motion.div
                                    className="absolute -top-1 -right-1"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                >
                                    <Sparkles className="w-4 h-4 text-white/40" />
                                </motion.div>
                            </motion.div>

                            {/* Text Content */}
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black text-white tracking-tighter leading-none">
                                        {step.titleEn}
                                    </h2>
                                    <h2 className="text-2xl font-urdu text-orange-400 font-bold leading-normal">
                                        {step.titleUr}
                                    </h2>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-white/70 text-base font-medium leading-relaxed px-4">
                                        {step.subtextEn}
                                    </p>
                                    <p className="text-white/60 text-lg font-urdu leading-relaxed px-4">
                                        {step.subtextUr}
                                    </p>
                                </div>
                            </div>

                            {/* Step Specific Features */}
                            {step.id === 'services' && (
                                <div className="grid grid-cols-4 gap-3 w-full mt-4">
                                    {[
                                        { Icon: Package, label: "Parcel" },
                                        { Icon: ShoppingCart, label: "Grocery" },
                                        { Icon: Utensils, label: "Food" },
                                        { Icon: RefreshCcw, label: "Returns" },
                                    ].map((item, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 * idx }}
                                            className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors"
                                        >
                                            <item.Icon className="w-5 h-5 text-orange-400" />
                                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">{item.label}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {step.id === 'cta' && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex items-center gap-2 py-2 px-4 bg-emerald-500/10 rounded-full border border-emerald-500/20"
                                >
                                    <Shield className="w-4 h-4 text-emerald-400" />
                                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-none mt-0.5">Secure • Trusted • Reliable</span>
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Footer Controls INSIDE the card for modern look */}
                    <div className="w-full flex flex-col items-center gap-6 mt-10">
                        {/* Indicators */}
                        <div className="flex gap-2">
                            {steps.map((_, index) => (
                                <motion.div
                                    key={index}
                                    className={`h-1.5 rounded-full ${currentStep === index ? "bg-white" : "bg-white/20"}`}
                                    animate={{
                                        width: currentStep === index ? 24 : 8,
                                        opacity: currentStep === index ? 1 : 0.5
                                    }}
                                />
                            ))}
                        </div>

                        {/* Button with ripple effect */}
                        <Button
                            onClick={handleNext}
                            className={`w-full h-16 rounded-[2rem] text-lg font-bold shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 overflow-hidden relative group ${currentStep === steps.length - 1
                                    ? "bg-emerald-500 hover:bg-emerald-400 text-white border-0"
                                    : "bg-orange-500 hover:bg-orange-400 text-white border-0"
                                }`}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {currentStep === steps.length - 1 ? (
                                    <>Get Started / شروع کریں <CheckCircle2 className="w-5 h-5" /></>
                                ) : (
                                    <>Next / آگے بڑھیں <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </span>
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                        </Button>
                    </div>
                </div>

                {/* Footer Legal Mini Text */}
                <p className="text-white/20 text-[10px] uppercase tracking-[0.2em] font-bold text-center">
                    Trusted personal assistant for Quetta
                </p>
            </div>
        </div>
    );
}


