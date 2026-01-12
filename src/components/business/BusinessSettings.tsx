import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Power, 
  Clock, 
  Megaphone,
  AlertCircle,
  Bell,
  Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  BusinessProfile,
  useToggleBusinessOnline,
  useUpdateBusinessProfile 
} from "@/hooks/useBusinessDashboard";

interface BusinessSettingsProps {
  business: BusinessProfile;
}

export const BusinessSettings = ({ business }: BusinessSettingsProps) => {
  const toggleOnlineMutation = useToggleBusinessOnline();
  const updateMutation = useUpdateBusinessProfile();
  
  const [announcement, setAnnouncement] = useState('');
  const [openingTime, setOpeningTime] = useState('09:00');
  const [closingTime, setClosingTime] = useState('22:00');
  const [busyMode, setBusyMode] = useState(false);

  const handleToggleOnline = () => {
    toggleOnlineMutation.mutate({
      businessId: business.id,
      isActive: !business.is_active,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">Control your business operations</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Online Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`border-2 ${business.is_active ? 'border-accent' : 'border-destructive'}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                Online Status
              </CardTitle>
              <CardDescription>
                When offline, your business won't appear to customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${business.is_active ? 'bg-accent animate-pulse-live' : 'bg-destructive'}`} />
                  <span className="font-medium">
                    {business.is_active ? 'Online - Accepting Orders' : 'Offline - Hidden from Customers'}
                  </span>
                </div>
                <Switch
                  checked={business.is_active}
                  onCheckedChange={handleToggleOnline}
                  disabled={toggleOnlineMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Busy Mode */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Busy Mode
              </CardTitle>
              <CardDescription>
                Enable to increase estimated delivery time during rush hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={busyMode ? 'destructive' : 'secondary'}>
                    {busyMode ? 'Busy' : 'Normal'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {busyMode ? '+15 min added to ETA' : 'Standard delivery times'}
                  </span>
                </div>
                <Switch
                  checked={busyMode}
                  onCheckedChange={setBusyMode}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Operating Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operating Hours
              </CardTitle>
              <CardDescription>
                Set your business opening and closing times
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Opening Time</Label>
                  <Input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Closing Time</Label>
                  <Input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                  />
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Save Hours
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Announcement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Announcement
              </CardTitle>
              <CardDescription>
                Display a message to customers (e.g., "Fresh items available!")
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter your announcement..."
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                rows={3}
              />
              <Button variant="outline" className="w-full">
                Update Announcement
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure how you receive order notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Order Alerts</p>
                  <p className="text-sm text-muted-foreground">Sound notification for new orders</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order Cancelled</p>
                  <p className="text-sm text-muted-foreground">Alert when order is cancelled</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Low Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">Notify when items run low</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Security Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-accent" />
                You can only see your own business data
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-accent" />
                Commission rate is set by admin
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-accent" />
                Completed orders cannot be deleted
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-accent" />
                Customer reviews are managed by admin
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
