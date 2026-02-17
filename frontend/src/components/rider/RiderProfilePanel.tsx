import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Phone,
  Car,
  CreditCard,
  Star,
  Settings,
  Bell,
  Volume2,
  VolumeX,
  Globe,
  ChevronRight,
  Shield,
  HelpCircle,
  LogOut,
  X,
  Loader2,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RiderProfile, useUpdateRiderProfile } from '@/hooks/useRiderDashboard';
import LanguageToggle from '@/components/LanguageToggle';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ImageUploadField } from '@/components/common/ImageUploadField';
import { useQueryClient } from '@tanstack/react-query';

interface RiderProfilePanelProps {
  riderProfile: RiderProfile;
  isOpen: boolean;
  onClose: () => void;
  totalDistance: number;
  onLogout?: () => void;
}

const RiderProfilePanel = ({
  riderProfile,
  isOpen,
  onClose,
  totalDistance,
  onLogout
}: RiderProfilePanelProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const queryClient = useQueryClient();
  const updateProfile = useUpdateRiderProfile();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // useAuth.signOut now handles both Supabase and Firebase
      await signOut(navigate);
      toast.success("لاگ آؤٹ ہو گیا");
    } catch (error) {
      console.error("[RiderProfilePanel] Logout error:", error);
      toast.error("Logout failed");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handle image change
  const handleImageChange = async (url: string | null) => {
    try {
      await updateProfile.mutateAsync({ image: url });
      toast.success('پروفائل تصویر اپڈیٹ ہو گئی!');
    } catch (error) {
      console.error('[RiderProfilePanel] Image update error:', error);
      toast.error('تصویر اپڈیٹ نہیں ہو سکی');
    }
  };

  // Type assertion to access cnic which exists in DB but not typed
  const riderData = riderProfile as RiderProfile & { cnic?: string };

  const menuItems = [
    {
      section: 'Account',
      items: [
        { icon: CreditCard, label: 'CNIC / Documents', value: riderData.cnic ? 'Verified' : 'Not Added', status: riderData.cnic ? 'success' : 'warning' },
        { icon: Car, label: 'Vehicle Info', value: riderProfile.vehicle_type || 'Bike' },
        { icon: Phone, label: 'Phone Number', value: riderProfile.phone },
      ]
    },
    {
      section: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', toggle: true, value: soundEnabled, onChange: setSoundEnabled },
        { icon: soundEnabled ? Volume2 : VolumeX, label: 'Sound Alerts', toggle: true, value: soundEnabled, onChange: setSoundEnabled },
        { icon: vibrationEnabled ? Volume2 : VolumeX, label: 'Vibration', toggle: true, value: vibrationEnabled, onChange: setVibrationEnabled },
      ]
    },
    {
      section: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & Support', action: true, onClick: () => { onClose(); navigate('/rider-support'); } },
        { icon: Shield, label: 'Privacy Policy', action: true, onClick: () => { onClose(); navigate('/privacy-policy'); } },
      ]
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      {/* Header with gradient background */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-primary/20 via-primary/10 to-background p-4 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-primary/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="p-5 rounded-2xl shadow-card border border-primary/10">
          <div className="flex items-center gap-4">
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
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-primary/50" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground">{riderProfile.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-foreground">
                  {riderProfile.rating?.toFixed(1) || '4.5'}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {riderProfile.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{riderProfile.total_trips || 0}</p>
              <p className="text-xs text-muted-foreground">Total Trips</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{totalDistance.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Total km</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground flex items-center justify-center">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mr-1" />
                {riderProfile.rating?.toFixed(1) || '4.5'}
              </p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="p-4 space-y-4">
        {/* Language Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Language</p>
                <p className="text-xs text-muted-foreground">English / اردو</p>
              </div>
            </div>
            <LanguageToggle variant="compact" />
          </div>
        </Card>

        {/* Menu Sections */}
        {menuItems.map((section) => (
          <div key={section.section}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              {section.section}
            </p>
            <Card className="overflow-hidden">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between p-4 ${itemIndex < section.items.length - 1 ? 'border-b border-border' : ''
                      } ${item.onClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    onClick={item.onClick}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        {item.value && typeof item.value === 'string' && (
                          <p className={`text-xs ${item.status === 'success' ? 'text-accent' :
                            item.status === 'warning' ? 'text-yellow-500' :
                              'text-muted-foreground'
                            }`}>
                            {item.value}
                          </p>
                        )}
                      </div>
                    </div>
                    {item.toggle ? (
                      <Switch
                        checked={item.value as boolean}
                        onCheckedChange={item.onChange}
                      />
                    ) : item.action ? (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    ) : null}
                  </div>
                );
              })}
            </Card>
          </div>
        ))}

        {/* Switch to Customer App */}
        <Button
          variant="outline"
          className="w-full h-14 text-primary border-primary/30 hover:bg-primary/10 mb-2"
          onClick={() => {
            sessionStorage.setItem('preferred_view', 'customer');
            navigate('/');
            onClose();
          }}
        >
          <Home className="w-5 h-5 mr-2" />
          Switch to Customer App
        </Button>

        {/* Logout Button */}
        <Button
          variant="outline"
          className="w-full h-14 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="w-5 h-5 mr-2" />
          {isLoggingOut ? "لاگ آؤٹ ہو رہا ہے..." : "لاگ آؤٹ"}
        </Button>

        {/* Spacer for bottom nav */}
        <div className="h-20" />
      </div>
    </motion.div>
  );
};

export default RiderProfilePanel;
