import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Bike,
    Package,
    Utensils,
    PlusSquare,
    ShoppingBag,
    MapPin,
    ShieldCheck,
    ChevronRight,
    Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingStep {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    icon: any;
    gradient: string;
    iconColor: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: 1,
        title: "FastHaazir – Anything, Anytime",
        subtitle: "Premium Delivery Service",
        description: "Your local personal assistant for everything you need in Quetta. Parcel, Food, Medical, Grocery & Bakery.",
        icon: Bike,
        gradient: "from-emerald-600 to-emerald-900",
        iconColor: "text-white"
    },
    {
        id: 2,
        title: "Parcel Pick & Drop",
        subtitle: "📦 Parcel Delivery",
        description: "Pick & Drop anything anywhere. Live rider tracking and secure handling for your peace of mind.",
        icon: Package,
        gradient: "from-blue-600 to-indigo-900",
        iconColor: "text-blue-100"
    },
    {
        id: 3,
        title: "Food Delivery",
        subtitle: "🍔 Food Delivery",
        description: "Order from top-rated restaurants. Get hot and fresh food delivered right to your doorstep.",
        icon: Utensils,
        gradient: "from-orange-500 to-red-600",
        iconColor: "text-orange-100"
    },
    {
        id: 4,
        title: "Medical & Pharmacy",
        subtitle: "💊 Medical Emergency",
        description: "Essential medicines delivered fast. Trusted pharmacies and emergency support 24/7.",
        icon: PlusSquare,
        gradient: "from-rose-500 to-purple-700",
        iconColor: "text-rose-100"
    },
    {
        id: 5,
        title: "Grocery & Bakery",
        subtitle: "🛒 Daily Essentials",
        description: "Fresh bakery items and daily grocery needs. Scheduled delivery at your convenience.",
        icon: ShoppingBag,
        gradient: "from-green-500 to-emerald-800",
        iconColor: "text-emerald-100"
    },
    {
        id: 6,
        title: "Live Tracking & Support",
        subtitle: "📍 Real-time Monitoring",
        description: "Real-time rider tracking and in-app support. Stay informed every second of the way.",
        icon: MapPin,
        gradient: "from-cyan-500 to-blue-700",
        iconColor: "text-cyan-100"
    },
    {
        id: 7,
        title: "Safe, Fast & Reliable",
        subtitle: "⭐ Why FastHaazir?",
        description: "Verified riders, secure payments, and high trust. Quetta's most reliable delivery partner.",
        icon: ShieldCheck,
        gradient: "from-amber-500 to-orange-700",
        iconColor: "text-amber-100"
    }
];

interface OnboardingFlowProps {
    onComplete?: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(0);
    const navigate = useNavigate();

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setDirection(1);
            setCurrentStep(prev => prev + 1);
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const completeOnboarding = () => {
        localStorage.setItem('fasthaazir_onboarding_completed', 'true');
        if (onComplete) {
            onComplete();
        } else {
            navigate('/auth');
        }
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9
        })
    };

    const step = ONBOARDING_STEPS[currentStep];
    const Icon = step.icon;

    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden">
            {/* Skip Button */}
            <div className="absolute top-安全-area-inset-top right-4 p-4 z-50">
                <button
                    onClick={handleSkip}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    Skip
                </button>
            </div>

            <div className="flex-1 relative flex flex-col">
                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        className="absolute inset-0 flex flex-col items-center justify-center p-8 pt-20"
                    >
                        {/* Visual Part */}
                        <div className={cn(
                            "w-64 h-64 rounded-[3rem] bg-gradient-to-br flex items-center justify-center mb-12 shadow-elevated relative overflow-hidden",
                            step.gradient
                        )}>
                            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm opacity-50" />
                            <motion.div
                                initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                            >
                                <Icon size={100} className={cn("relative z-10", step.iconColor)} />
                            </motion.div>

                            {/* Decorative particles */}
                            <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-white/20 animate-pulse" />
                            <div className="absolute bottom-8 right-8 w-6 h-6 rounded-full bg-white/10 animate-pulse delay-75" />
                        </div>

                        {/* Text Part */}
                        <div className="text-center space-y-4 max-w-sm">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <span className="text-primary font-bold tracking-wider text-xs uppercase bg-primary/10 px-3 py-1 rounded-full">
                                    {step.subtitle}
                                </span>
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-3xl font-extrabold text-foreground leading-tight"
                            >
                                {step.title}
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="text-lg text-muted-foreground leading-relaxed"
                            >
                                {step.description}
                            </motion.p>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="p-8 pb-安全-area-inset-bottom flex flex-col items-center space-y-8 bg-gradient-to-t from-background via-background to-transparent pt-12">
                {/* Progress Dots */}
                <div className="flex gap-2">
                    {ONBOARDING_STEPS.map((_, index) => (
                        <div
                            key={index}
                            className={cn(
                                "h-2 rounded-full transition-all duration-300",
                                currentStep === index ? "w-8 bg-primary" : "w-2 bg-primary/20"
                            )}
                        />
                    ))}
                </div>

                {/* Buttons */}
                <div className="w-full max-w-sm">
                    <Button
                        onClick={handleNext}
                        className="w-full h-16 rounded-2xl text-lg font-bold gradient-primary shadow-brand gap-2 group"
                    >
                        {currentStep === ONBOARDING_STEPS.length - 1 ? (
                            "Get Started"
                        ) : (
                            <>
                                Next
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
