import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowRight, Package, Truck, MapPin, CheckCircle2, ShoppingCart, Beef, RefreshCcw } from "lucide-react";
import logo from "@/assets/fast-haazir-logo-optimized.webp";

const ONBOARDING_KEY = "faast_haazir_onboarding_seen";

interface OnboardingStep {
    id: 'intro' | 'speed' | 'services' | 'tracking' | 'cta';
    titleEn: string;
    titleUr: string;
    subtextEn: string;
    subtextUr: string;
    image: string;
    color: string;
    icon?: React.ReactNode;
}

const steps: OnboardingStep[] = [
    {
        id: 'intro',
        titleEn: "Faast Haazir",
        titleUr: "کوئٹہ کی اپنی ڈیلیوری ایپ",
        subtextEn: "Everything, Anytime – Just a Tap Away",
        subtextUr: "ہر چیز، ہر وقت – بس ایک ٹیپ پر",
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1200", // Quetta/Mountains
        color: "from-brand-green-500 to-brand-green-800",
        icon: <MapPin className="w-10 h-10 text-white" />,
    },
    {
        id: 'speed',
        titleEn: "Fast Delivery",
        titleUr: "30 منٹ میں ڈیلیوری",
        subtextEn: "Fast, Safe, and Reliable",
        subtextUr: "تیز، محفوظ اور بھروسہ مند",
        image: "https://images.unsplash.com/photo-1619641782842-83f2f9c45014?auto=format&fit=crop&q=80&w=1200", // Delivery Rider
        color: "from-brand-orange-500 to-brand-orange-700",
        icon: <Truck className="w-10 h-10 text-white" />,
    },
    {
        id: 'services',
        titleEn: "Multiple Services",
        titleUr: "متعدد خدمات",
        subtextEn: "Grocery, Parcel, Qurbani Meat & Returns",
        subtextUr: "گراسری، پارسل، قربانی اور واپسی",
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200", // Market/Services
        color: "from-brand-green-600 to-brand-orange-500",
        icon: <Package className="w-10 h-10 text-white" />,
    },
    {
        id: 'tracking',
        titleEn: "Track Live",
        titleUr: "لائیو ٹریکنگ",
        subtextEn: "Track Your Order Live Every Moment",
        subtextUr: "ہر پل نظر رکھیں اپنے آرڈر پر",
        image: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?auto=format&fit=crop&q=80&w=1200", // Map/Phone
        color: "from-charcoal to-brand-green-800",
        icon: <ArrowRight className="w-10 h-10 text-white" />,
    },
    {
        id: 'cta',
        titleEn: "Ready to Start?",
        titleUr: "شروع کرنے کے لیے تیار ہیں؟",
        subtextEn: "Join Faast Haazir Today",
        subtextUr: "ابھی شروع کریں اور شامل ہوں",
        image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1200", // Handshake/Welcome
        color: "from-brand-green-500 via-brand-orange-500 to-brand-green-500",
        icon: <CheckCircle2 className="w-10 h-10 text-white" />,
    },
];

const Onboarding = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const navigate = useNavigate();
    const touchStart = useRef(0);
    const touchEnd = useRef(0);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleFinish();
        }
    };

    const handleSkip = () => {
        handleFinish();
    };

    const handleFinish = () => {
        localStorage.setItem(ONBOARDING_KEY, "true");
        navigate("/auth");
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
            if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
        }

        if (touchStart.current - touchEnd.current < -75) {
            // Swipe Right -> Previous
            if (currentStep > 0) setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div
            className="relative h-screen w-full overflow-hidden bg-white font-sans touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Background with Glassmorphism Header */}
            <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-6 backdrop-blur-md bg-white/30 border-b border-white/20">
                <div className="flex items-center gap-2">
                    <img src={logo} alt="Faast Haazir" className="h-10 w-auto object-contain drop-shadow-sm" />
                </div>
                {currentStep < steps.length - 1 && (
                    <Button variant="ghost" className="text-charcoal/80 font-medium hover:bg-white/20" onClick={handleSkip}>
                        Skip / چھوڑیں
                    </Button>
                )}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.5, ease: "circOut" }}
                    className="h-full flex flex-col items-center"
                >
                    {/* Visual Container (VH based for responsiveness) */}
                    <div className="relative h-[55vh] w-full shrink-0 overflow-hidden">
                        {/* Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${steps[currentStep].color} opacity-90 transition-colors duration-700`} />

                        {/* Background Image */}
                        <motion.img
                            initial={{ scale: 1.1 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 6, ease: "linear" }}
                            src={steps[currentStep].image}
                            alt={steps[currentStep].titleEn}
                            className="w-full h-full object-cover mix-blend-overlay opacity-60"
                        />

                        {/* Landscape elements hinted - Bottom Fade */}
                        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent" />

                        {/* Top corner branding logo watermark */}
                        <div className="absolute top-24 right-6 opacity-20 pointer-events-none">
                            <img src={logo} alt="" className="w-24 h-24 object-contain grayscale invert" />
                        </div>

                        {/* Centered Animated Icon */}
                        <motion.div
                            initial={{ scale: 0, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-20 h-20 bg-white/20 backdrop-blur-2xl rounded-3xl border border-white/40 flex items-center justify-center shadow-elevated"
                        >
                            {steps[currentStep].icon}
                        </motion.div>
                    </div>

                    {/* Content Container */}
                    <div className="flex-1 w-full px-8 pt-4 pb-12 flex flex-col items-center justify-between z-10">
                        {/* Text Content */}
                        <div className="text-center space-y-6 w-full max-w-md mx-auto">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="space-y-1"
                            >
                                <h2 className="text-3xl font-bold text-charcoal tracking-tight">
                                    {steps[currentStep].titleEn}
                                </h2>
                                <h2 className="text-2xl font-urdu text-brand-orange-500 font-bold leading-normal pt-1">
                                    {steps[currentStep].titleUr}
                                </h2>
                            </motion.div>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="space-y-3"
                            >
                                <p className="text-muted-foreground text-lg font-medium leading-relaxed">
                                    {steps[currentStep].subtextEn}
                                </p>
                                <p className="text-muted-foreground text-xl font-urdu leading-relaxed">
                                    {steps[currentStep].subtextUr}
                                </p>
                            </motion.div>

                            {/* Special Grid for Services Step */}
                            {steps[currentStep].id === 'services' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="grid grid-cols-4 gap-3 mt-4"
                                >
                                    {[
                                        { Icon: Package, label: "Parcel" },
                                        { Icon: ShoppingCart, label: "Grocery" },
                                        { Icon: Beef, label: "Qurbani" },
                                        { Icon: RefreshCcw, label: "Returns" },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex flex-col items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                                            <item.Icon className="w-5 h-5 text-brand-green-600" />
                                            <span className="text-[10px] font-medium text-charcoal">{item.label}</span>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </div>

                        {/* Footer Controls */}
                        <div className="w-full flex flex-col items-center gap-6 mt-auto">
                            {/* Indicators */}
                            <div className="flex gap-2.5">
                                {steps.map((_, index) => (
                                    <motion.div
                                        key={index}
                                        className={`h-2.5 rounded-full transition-all duration-300 ${currentStep === index ? "w-8 bg-brand-green-600" : "w-2.5 bg-gray-200"}`}
                                        animate={{ width: currentStep === index ? 32 : 10 }}
                                    />
                                ))}
                            </div>

                            {/* Main Button */}
                            <Button
                                className={`w-full h-14 rounded-2xl text-lg font-bold shadow-elevated transition-all duration-300 transform active:scale-95 ${currentStep === steps.length - 1
                                        ? "bg-brand-green-500 hover:bg-brand-green-600 text-white"
                                        : "bg-brand-orange-500 hover:bg-brand-orange-600 text-white"
                                    }`}
                                onClick={handleNext}
                            >
                                {currentStep === steps.length - 1 ? (
                                    <span className="flex items-center gap-2">Login / Sign Up <ChevronRight className="w-5 h-5" /></span>
                                ) : (
                                    <span className="flex items-center gap-2">Next / آگے بڑھیں <ChevronRight className="w-5 h-5" /></span>
                                )}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default Onboarding;
