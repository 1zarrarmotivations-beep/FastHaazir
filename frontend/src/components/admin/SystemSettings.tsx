import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Settings,
    DollarSign,
    Percent,
    Wallet,
    ToggleLeft,
    ToggleRight,
    Package,
    ShoppingCart,
    UtensilsCrossed,
    Store,
    Save,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    Truck,
    Clock,
    Mail,
    Smartphone
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useAdmin";
import { toast } from "sonner";

interface SystemSetting {
    id: string;
    category: string;
    setting_key: string;
    setting_value: string;
    setting_type: string;
    description: string | null;
}

interface SettingsGroup {
    title: string;
    description: string;
    icon: React.ElementType;
    settings: string[];
}

const settingsGroups: SettingsGroup[] = [
    {
        title: "Delivery Fees",
        description: "Configure delivery pricing",
        icon: Truck,
        settings: ["base_fee", "per_km_fee", "max_free_distance_km"]
    },
    {
        title: "Minimum Orders",
        description: "Minimum order amounts by category",
        icon: ShoppingCart,
        settings: ["restaurant_min_order", "grocery_min_order", "bakery_min_order", "pharmacy_min_order", "shop_min_order"]
    },
    {
        title: "Commission Rates",
        description: "Platform commission percentages",
        icon: Percent,
        settings: ["default_rider_commission", "restaurant_commission", "grocery_commission", "bakery_commission", "pharmacy_commission", "shop_commission"]
    },
    {
        title: "Wallet Limits",
        description: "Balance and withdrawal constraints",
        icon: Wallet,
        settings: ["min_wallet_balance", "max_wallet_balance", "min_withdrawal", "max_withdrawal"]
    },
    {
        title: "Feature Toggles",
        description: "Enable/disable platform features",
        icon: ToggleLeft,
        settings: ["delivery_enabled", "pickup_enabled", "scheduled_delivery", "grocery_enabled", "pharmacy_enabled", "maintenance_mode"]
    },
    {
        title: "Order Settings",
        description: "Order processing configuration",
        icon: Clock,
        settings: ["order_timeout_minutes", "max_order_items", "allow_cod"]
    },
    {
        title: "Notifications",
        description: "Notification preferences",
        icon: Smartphone,
        settings: ["sms_notifications", "push_notifications", "email_notifications"]
    }
];

export function SystemSettings() {
    const queryClient = useQueryClient();
    const { data: userRole } = useUserRole();
    const [activeTab, setActiveTab] = useState("delivery_fees");
    const [settings, setSettings] = useState<Record<string, SystemSetting>>({});
    const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Fetch settings
    const { data: fetchedSettings, isLoading, refetch } = useQuery({
        queryKey: ['system-settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('system_settings')
                .select('*')
                .eq('is_active', true)
                .order('category', { ascending: true });

            if (error) {
                console.error('[SystemSettings] Error fetching settings:', error);
                toast.error('Failed to load system settings');
                return [];
            }

            // Convert to map
            const settingsMap: Record<string, SystemSetting> = {};
            data?.forEach((s: SystemSetting) => {
                settingsMap[s.setting_key] = s;
            });
            setSettings(settingsMap);
            return data as SystemSetting[];
        }
    });

    // Save setting mutation
    const saveSetting = useMutation({
        mutationFn: async ({ key, value }: { key: string; value: string }) => {
            const { error } = await supabase
                .from('system_settings')
                .update({
                    setting_value: value,
                    updated_at: new Date().toISOString(),
                    updated_by: userRole?.id || null
                })
                .eq('setting_key', key);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-settings'] });
            toast.success('Setting saved successfully');
        },
        onError: (error: Error) => {
            console.error('[SystemSettings] Error saving setting:', error);
            toast.error('Failed to save setting');
        }
    });

    // Bulk save mutation
    const bulkSave = useMutation({
        mutationFn: async (changes: Record<string, string>) => {
            const updates = Object.entries(changes).map(([key, value]) => ({
                setting_key: key,
                setting_value: value,
                updated_at: new Date().toISOString(),
                updated_by: userRole?.id || null
            }));

            // Update each setting
            for (const update of updates) {
                const { error } = await supabase
                    .from('system_settings')
                    .update({
                        setting_value: update.setting_value,
                        updated_at: update.updated_at,
                        updated_by: update.updated_by
                    })
                    .eq('setting_key', update.setting_key);

                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-settings'] });
            setPendingChanges({});
            toast.success('All settings saved successfully');
            setIsSaving(false);
        },
        onError: (error: Error) => {
            console.error('[SystemSettings] Error saving settings:', error);
            toast.error('Failed to save settings');
            setIsSaving(false);
        }
    });

    const handleValueChange = (key: string, value: string) => {
        const setting = settings[key];
        if (!setting) return;

        // Track pending change
        setPendingChanges(prev => ({
            ...prev,
            [key]: value
        }));

        // Update local state for immediate feedback
        setSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], setting_value: value }
        }));
    };

    const handleToggleChange = (key: string, checked: boolean) => {
        handleValueChange(key, checked.toString());
    };

    const handleSaveAll = () => {
        if (Object.keys(pendingChanges).length === 0) {
            toast.info('No changes to save');
            return;
        }
        setIsSaving(true);
        bulkSave.mutate(pendingChanges);
    };

    const handleReset = () => {
        setPendingChanges({});
        refetch();
        toast.info('Settings reset to saved values');
    };

    const getSettingValue = (key: string, defaultValue: string = ""): string => {
        // Check pending changes first
        if (pendingChanges[key] !== undefined) {
            return pendingChanges[key];
        }
        return settings[key]?.setting_value || defaultValue;
    };

    const hasChanges = Object.keys(pendingChanges).length > 0;

    const categoryMap: Record<string, string> = {
        delivery_fees: "delivery_fees",
        min_orders: "min_orders",
        commissions: "commissions",
        wallet_limits: "wallet_limits",
        features: "features",
        order_settings: "order_settings",
        notifications: "notifications"
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">System Settings</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Configure global platform settings and parameters
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            {Object.keys(pendingChanges).length} pending changes
                        </Badge>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={!hasChanges || isSaving}
                    >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Reset
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSaveAll}
                        disabled={!hasChanges || isSaving}
                        className="gap-2"
                    >
                        {isSaving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save All Changes
                    </Button>
                </div>
            </div>

            {/* Maintenance Mode Warning */}
            {getSettingValue('maintenance_mode') === 'true' && (
                <Card className="bg-amber-500/10 border-amber-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            <div>
                                <p className="font-medium text-amber-600">Maintenance Mode Active</p>
                                <p className="text-sm text-amber-600/80">
                                    The platform is currently in maintenance mode. Users may see a warning when accessing the app.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Settings Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 md:grid-cols-7 h-auto p-1">
                    {settingsGroups.map((group) => {
                        const Icon = group.icon;
                        return (
                            <TabsTrigger
                                key={group.title}
                                value={categoryMap[group.title.toLowerCase().replace(' ', '_')] || group.title.toLowerCase()}
                                className="flex flex-col gap-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            >
                                <Icon className="w-4 h-4" />
                                <span className="text-xs">{group.title.split(' ')[0]}</span>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {settingsGroups.map((group) => {
                    const categoryKey = categoryMap[group.title.toLowerCase().replace(' ', '_')] || group.title.toLowerCase();

                    return (
                        <TabsContent key={group.title} value={categoryKey}>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <group.icon className="w-5 h-5 text-primary" />
                                        {group.title}
                                    </CardTitle>
                                    <CardDescription>{group.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {group.settings.map((settingKey) => {
                                        const setting = settings[settingKey];
                                        if (!setting) return null;

                                        const isBoolean = setting.setting_type === 'boolean';
                                        const isNumber = setting.setting_type === 'number';
                                        const currentValue = getSettingValue(settingKey);

                                        return (
                                            <div key={settingKey} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                                                <div className="flex-1">
                                                    <Label className="font-medium">
                                                        {settingKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                    </Label>
                                                    {setting.description && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {setting.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    {isBoolean ? (
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                checked={currentValue === 'true'}
                                                                onCheckedChange={(checked) => handleToggleChange(settingKey, checked)}
                                                            />
                                                            <span className="text-sm text-muted-foreground">
                                                                {currentValue === 'true' ? 'Enabled' : 'Disabled'}
                                                            </span>
                                                        </div>
                                                    ) : isNumber ? (
                                                        <Input
                                                            type="number"
                                                            value={currentValue}
                                                            onChange={(e) => handleValueChange(settingKey, e.target.value)}
                                                            className="w-32 text-right"
                                                        />
                                                    ) : (
                                                        <Input
                                                            type="text"
                                                            value={currentValue}
                                                            onChange={(e) => handleValueChange(settingKey, e.target.value)}
                                                            className="w-48 text-right"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}
