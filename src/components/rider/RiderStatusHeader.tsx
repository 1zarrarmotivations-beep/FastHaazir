import { motion, AnimatePresence } from 'framer-motion';
import { 
  Power, 
  PowerOff, 
  Star, 
  MapPin, 
  Wallet,
  TrendingUp,
  Bike,
  User
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RiderProfile } from '@/hooks/useRiderDashboard';

interface RiderStatusHeaderProps {
  riderProfile: RiderProfile;
  isOnline: boolean;
  onToggleOnline: (checked: boolean) => void;
  isToggling: boolean;
  todayEarnings: number;
  walletBalance: number;
  completedToday: number;
}

const RiderStatusHeader = ({
  riderProfile,
  isOnline,
  onToggleOnline,
  isToggling,
  todayEarnings,
  walletBalance,
  completedToday
}: RiderStatusHeaderProps) => {
  return (
    <div className="relative overflow-hidden">
      {/* Gradient Background */}
      <div className={`absolute inset-0 transition-all duration-500 ${
        isOnline 
          ? 'bg-gradient-to-br from-accent/20 via-accent/10 to-background' 
          : 'bg-gradient-to-br from-muted via-muted/50 to-background'
      }`} />
      
      {/* Live Pulse Effect when Online */}
      {isOnline && (
        <motion.div
          className="absolute top-4 right-4"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-3 h-3 rounded-full bg-accent" />
        </motion.div>
      )}

      <div className="relative px-4 pt-4 pb-6">
        {/* Profile Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              className={`relative w-16 h-16 rounded-2xl overflow-hidden shadow-card ${
                isOnline ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {riderProfile.image ? (
                <img 
                  src={riderProfile.image} 
                  alt={riderProfile.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
              )}
              {/* Online Indicator */}
              <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-background ${
                isOnline ? 'bg-accent' : 'bg-muted-foreground'
              }`} />
            </motion.div>
            
            <div>
              <h1 className="text-xl font-bold text-foreground">{riderProfile.name}</h1>
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-semibold text-foreground">
                  {riderProfile.rating?.toFixed(1) || '4.5'}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {riderProfile.total_trips || 0} trips
                </span>
              </div>
            </div>
          </div>

          {/* Online/Offline Toggle - Large & Prominent */}
          <motion.div
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 ${
              isOnline 
                ? 'bg-accent/20 shadow-lg shadow-accent/20' 
                : 'bg-muted'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Power className="w-5 h-5 text-accent" />
              ) : (
                <PowerOff className="w-5 h-5 text-muted-foreground" />
              )}
              <Switch
                checked={isOnline}
                onCheckedChange={onToggleOnline}
                disabled={isToggling}
                className="data-[state=checked]:bg-accent"
              />
            </div>
            <span className={`text-xs font-semibold ${
              isOnline ? 'text-accent' : 'text-muted-foreground'
            }`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </motion.div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <QuickStatCard
            icon={<Wallet className="w-5 h-5" />}
            label="Today"
            value={`Rs ${todayEarnings}`}
            color="primary"
          />
          <QuickStatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Balance"
            value={`Rs ${walletBalance}`}
            color="accent"
          />
          <QuickStatCard
            icon={<Bike className="w-5 h-5" />}
            label="Deliveries"
            value={completedToday.toString()}
            color="secondary"
          />
        </div>
      </div>
    </div>
  );
};

interface QuickStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'primary' | 'accent' | 'secondary';
}

const QuickStatCard = ({ icon, label, value, color }: QuickStatCardProps) => {
  const colorStyles = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    secondary: 'bg-secondary/10 text-secondary-foreground',
  };

  return (
    <motion.div
      className="bg-card rounded-2xl p-3 shadow-soft"
      whileTap={{ scale: 0.98 }}
    >
      <div className={`w-10 h-10 rounded-xl ${colorStyles[color]} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </motion.div>
  );
};

export default RiderStatusHeader;
