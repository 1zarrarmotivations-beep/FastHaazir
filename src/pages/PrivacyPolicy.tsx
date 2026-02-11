import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Lock, Eye, FileText, Server } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 mb-6"
    >
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        </div>
        <div className="text-muted-foreground leading-relaxed space-y-4">
            {children}
        </div>
    </motion.div>
);

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-primary/5 pb-12 pt-8 px-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="container max-w-4xl mx-auto relative z-10">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="mb-6 hover:bg-background/50"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center space-y-4"
                    >
                        <div className="w-16 h-16 bg-background rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Privacy Policy</h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            At Fast Haazir, we take your privacy seriously. This document explains how we collect, use, and protect your personal information.
                        </p>
                        <p className="text-sm text-muted-foreground/80">
                            Last updated: February 2026
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Content */}
            <div className="container max-w-3xl mx-auto px-4 -mt-8 relative z-20 pb-20">
                <Section title="Information We Collect" icon={FileText}>
                    <p>
                        We collect information that you provide directly to us, including:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Name, phone number, and email address when you create an account</li>
                        <li>Delivery addresses and location data for order fulfillment</li>
                        <li>Order history and preferences</li>
                        <li>Communications with our support team or riders</li>
                    </ul>
                </Section>

                <Section title="How We Use Your Data" icon={Eye}>
                    <p>
                        Your information is used to provide and improve our services:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Processing and delivering your orders</li>
                        <li>Connecting you with riders and nearby businesses</li>
                        <li>Sending order updates and important notifications</li>
                        <li>Improving our app functionality and user experience</li>
                        <li>Ensuring the safety and security of our platform</li>
                    </ul>
                </Section>

                <Section title="Data Security" icon={Lock}>
                    <p>
                        We implement industry-standard security measures to protect your data. Your personal information is encrypted and stored securely. We do not share your personal details with third parties for marketing purposes without your consent.
                    </p>
                </Section>

                <Section title="Location Services" icon={Server}>
                    <p>
                        Fast Haazir requires access to your location to:
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Show you nearby restaurants and stores</li>
                        <li>Allow riders to find your delivery address accurately</li>
                        <li>Track your order in real-time</li>
                    </ul>
                    <p className="mt-2 text-sm bg-muted p-3 rounded-lg">
                        Note: You can control location permissions through your device settings at any time.
                    </p>
                </Section>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="text-center pt-8 border-t border-border"
                >
                    <p className="text-muted-foreground mb-4">
                        Have questions about our privacy practices?
                    </p>
                    <Button onClick={() => navigate('/pages/contact')} variant="outline">
                        Contact Support
                    </Button>
                </motion.div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
