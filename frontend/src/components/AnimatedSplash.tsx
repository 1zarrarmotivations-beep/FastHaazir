import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedSplashProps {
    onFinish: () => void;
}

export const AnimatedSplash = ({ onFinish }: AnimatedSplashProps) => {
    const [show, setShow] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShow(false);
            setTimeout(onFinish, 500); // Allow exit animation
        }, 3000);

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#062016]"
                    style={{
                        background: 'radial-gradient(circle at center, #065F46 0%, #062016 100%)'
                    }}
                >
                    {/* Speed Lines */}
                    <div className="absolute inset-0 flex flex-col justify-center gap-8 opacity-20">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <motion.div
                                key={i}
                                initial={{ x: '-100%' }}
                                animate={{ x: '200%' }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                    ease: "linear"
                                }}
                                className={`h-1 w-64 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-orange-500`}
                                style={{ marginLeft: `${Math.random() * 20}%` }}
                            />
                        ))}
                    </div>

                    <div className="relative flex flex-col items-center">
                        {/* Lightning Bolt (Drawing Effect) */}
                        <svg
                            width="120"
                            height="180"
                            viewBox="0 0 100 150"
                            className="relative z-10 filter drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                        >
                            <motion.path
                                d="M60 10 L20 80 L50 80 L40 140 L80 60 L50 60 L60 10"
                                fill="none"
                                stroke="#FBBF24"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 1.2, ease: "easeInOut", delay: 0.5 }}
                            />
                            <motion.path
                                d="M60 10 L20 80 L50 80 L40 140 L80 60 L50 60 L60 10"
                                fill="#FBBF24"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: 1.5 }}
                            />
                        </svg>

                        {/* Rider & Bike Placeholder (Styled Box for now, matching the prompt) */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 1.8, ease: "easeOut" }}
                            className="mt-4 flex flex-col items-center"
                        >
                            <div className="text-4xl font-black italic tracking-tighter text-white">
                                FAST <span className="text-[#FBBF24]">HAAZIR</span>
                            </div>
                            <motion.div
                                animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="mt-2 text-xs font-medium tracking-[0.3em] text-emerald-400 opacity-60"
                            >
                                QUICK • RELIABLE • SECURE
                            </motion.div>
                        </motion.div>

                        {/* Final Glow Pulse */}
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: [1, 1.5], opacity: [0, 0.3, 0] }}
                            transition={{ duration: 1.5, delay: 2.2, times: [0, 1] }}
                            className="absolute inset-0 rounded-full bg-yellow-400 blur-3xl"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
