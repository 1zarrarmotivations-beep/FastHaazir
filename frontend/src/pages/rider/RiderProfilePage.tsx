import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    User,
    CreditCard,
    Car,
    Phone,
    Wallet,
    Moon,
    Bell,
    Volume2,
    VolumeX,
    HelpCircle,
    Shield,
    Globe,
    Home,
    LogOut,
    Star,
    ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// Hooks
import {
    RiderProfile,
    useUpdateRiderProfile
} from '@/hooks/useRiderDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';

// Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import LanguageToggle from '@/components/LanguageToggle';
import { ImageUploadField } from '@/components/common/ImageUploadField';

interface OutletContext {
    riderProfile: RiderProfile | null;
    isOnline: boolean;
    onToggleOnline: (checked: boolean) => void;
    isToggling: boolean;
    currentSpeed: number;
    isTracking: boolean;
    locationStatus: string;
    lastLocation: any;
    pendingCount: number;
    activeCount: number;
    profileLoading: boolean;
    handleAccept: (id: string, type: 'rider_request' | 'order') => Promise<void>;
    handleReject: (id: string) => void;
}

const RiderProfilePage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { signOut, user } = useAuth();
    const { riderProfile, profileLoading } = useOutletContext<OutletContext>();
    const updateProfile = useUpdateRiderProfile();
    const { theme, toggleTheme } = useTheme();

    const [soundEnabled, setSoundEnabled] = React.useState(true);
    const [vibrationEnabled, setVibrationEnabled] = React.useState(true);
    const [isLoggingOut, setIsLoggingOut] = React.useState(false);

    if (profileLoading || !riderProfile) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await signOut(navigate);
            toast.success("Successfully logged out");
        } catch (error) {
            toast.error("Logout failed");
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleImageChange = async (url: string | null) => {
        try {
            await updateProfile.mutateAsync({ image: url });
            toast.success('Profile image updated!');
        } catch (error) {
            toast.error('Failed to update image');
        }
    };

    const riderData = riderProfile as any;

    const menuSections = [
        {
            title: 'Account',
            items: [
                { icon: CreditCard, label: 'CNIC / Documents', value: riderData.cnic ? 'Verified' : 'Not Added', status: riderData.cnic ? 'success' : 'warning' },
                { icon: Car, label: 'Vehicle Info', value: riderProfile.vehicle_type || 'Bike' },
                { icon: Phone, label: 'Phone Number', value: riderProfile.phone },
            ]
        },
        {
            title: 'Settings',
            items: [
                { icon: Moon, label: 'Dark Mode', toggle: true, value: theme === 'dark', onChange: toggleTheme },
                { icon: Bell, label: 'Notifications', toggle: true, value: soundEnabled, onChange: setSoundEnabled },
                { icon: vibrationEnabled ? Volume2 : VolumeX, label: 'Vibration', toggle: true, value: vibrationEnabled, onChange: setVibrationEnabled },
            ]
        },
        {
            title: 'Support',
            items: [
                { icon: HelpCircle, label: 'Help & Support', action: true, onClick: () => navigate('/rider-support') },
                { icon: Shield, label: 'Privacy Policy', action: true, onClick: () => navigate('/privacy-policy') },
            ]
        }
    ];

    return (
        <div className="min-h-full pb-32 pt-4 bg-black">
            <div className="px-4 mb-6">
                <h1 className="text-2xl font-black text-white mb-6">Profile</h1>

                {/* Profile Information */}
                <Card className="bg-[#0A0A0A] border-white/5 p-6 rounded-3xl mb-6">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            {user?.id ? (
                                <ImageUploadField
                                    value={riderProfile.image}
                                    onChange={handleImageChange}
                                    userId={user.id}
                                    bucket="profiles"
                                    folder="riders"
                                    maxSizeMB={2}
                                    variant="avatar"
                                    size="lg"
                                    placeholder="user"
                                    disabled={updateProfile.isPending}
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                                    <User className="w-10 h-10 text-white/20" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-black text-white">{riderProfile.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm font-bold text-white/60">
                                    {riderProfile.rating?.toFixed(1) || '5.0'}
                                </span>
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] h-5 px-2">
                                    {riderProfile.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
                        <div className="text-center border-r border-white/5">
                            <p className="text-xl font-black text-white">{riderProfile.total_trips || 0}</p>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total Trips</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-black text-white">4.8</p>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Perf. Score</p>
                        </div>
                    </div>
                </Card>

                {/* Language Toggle */}
                <Card className="bg-[#0A0A0A] border-white/5 p-4 rounded-2xl mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-white/40" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Language</p>
                                <p className="text-[10px] font-bold text-white/40">English / اردو</p>
                            </div>
                        </div>
                        <LanguageToggle variant="compact" />
                    </div>
                </Card>

                {/* Menu Sections */}
                <div className="space-y-6">
                    {menuSections.map((section) => (
                        <div key={section.title}>
                            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3 px-1">
                                {section.title}
                            </h3>
                            <Card className="bg-[#0A0A0A] border-white/5 overflow-hidden rounded-2xl">
                                {section.items.map((item, index) => {
                                    const Icon = item.icon;
                                    return (
                                        <div
                                            key={item.label}
                                            className={`flex items-center justify-between p-4 ${index < section.items.length - 1 ? 'border-b border-white/5' : ''
                                                } ${item.onClick ? 'cursor-pointer hover:bg-white/[0.02]' : ''}`}
                                            onClick={item.onClick}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-5 h-5 flex items-center justify-center text-white/40">
                                                    <Icon className="w-full h-full" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white/80">{item.label}</p>
                                                    {item.value && typeof item.value === 'string' && (
                                                        <p className="text-[10px] font-bold text-white/30">{item.value}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {item.toggle ? (
                                                <Switch
                                                    checked={item.value as boolean}
                                                    onCheckedChange={item.onChange}
                                                    className="scale-75"
                                                />
                                            ) : item.action ? (
                                                <ChevronRight className="w-4 h-4 text-white/20" />
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </Card>
                        </div>
                    ))}
                </div>

                <div className="mt-10 space-y-3">
                    <Button
                        variant="ghost"
                        className="w-full h-14 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl flex items-center gap-3 justify-start px-6"
                        onClick={() => navigate('/')}
                    >
                        <Home className="w-5 h-5" />
                        <span className="font-bold">Switch to Customer App</span>
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full h-14 text-red-500 hover:text-red-400 hover:bg-red-500/5 rounded-2xl flex items-center gap-3 justify-start px-6"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-bold">{isLoggingOut ? "Logging out..." : "Log Out"}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default RiderProfilePage;
