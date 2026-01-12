import { ArrowLeft, Bell, MessageSquare, Gift, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useNotificationSettings, useUpsertNotificationSettings } from '@/hooks/useNotificationSettings';

interface NotificationSettingsScreenProps {
  onBack: () => void;
}

const NotificationSettingsScreen = ({ onBack }: NotificationSettingsScreenProps) => {
  const { data: settings, isLoading } = useNotificationSettings();
  const updateSettings = useUpsertNotificationSettings();

  const handleToggle = async (key: keyof typeof settings, value: boolean) => {
    try {
      await updateSettings.mutateAsync({ [key]: value });
      toast.success('Settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const settingsItems = [
    {
      key: 'order_updates' as const,
      icon: Bell,
      title: 'Order Updates',
      description: 'Get notified about order status changes',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      key: 'rider_messages' as const,
      icon: MessageSquare,
      title: 'Rider Messages',
      description: 'Receive messages from your delivery rider',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      key: 'promotions' as const,
      icon: Gift,
      title: 'Promotions & Offers',
      description: 'Get updates about discounts and special offers',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      key: 'system_alerts' as const,
      icon: AlertCircle,
      title: 'System Alerts',
      description: 'Important updates about your account',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Notification Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Control which notifications you receive from Fast Haazir
            </p>

            {settingsItems.map((item) => {
              const Icon = item.icon;
              const isEnabled = settings?.[item.key] ?? true;
              
              return (
                <Card key={item.key} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggle(item.key, checked)}
                      disabled={updateSettings.isPending}
                    />
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationSettingsScreen;
