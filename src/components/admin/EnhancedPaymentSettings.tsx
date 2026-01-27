import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  DollarSign, 
  Route, 
  Loader2,
  MapPin,
  Wallet,
  ShoppingCart
} from 'lucide-react';
import { usePaymentSettings, useUpdatePaymentSettings } from '@/hooks/useRiderPayments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EnhancedPaymentSettings = () => {
  const { data: settings, isLoading } = usePaymentSettings();

  const [baseFee, setBaseFee] = useState(80);
  const [perKmRate, setPerKmRate] = useState(30);
  const [minPayment, setMinPayment] = useState(100);
  const [maxRadius, setMaxRadius] = useState(15);
  const [minOrderValue, setMinOrderValue] = useState(200);
  const [riderBaseEarning, setRiderBaseEarning] = useState(50);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setBaseFee(settings.base_fee);
      setPerKmRate(settings.per_km_rate);
      setMinPayment(settings.min_payment);
    }
    // Fetch extended settings
    fetchExtendedSettings();
  }, [settings]);

  const fetchExtendedSettings = async () => {
    const { data } = await supabase
      .from('rider_payment_settings')
      .select('max_delivery_radius_km, min_order_value, rider_base_earning')
      .eq('is_active', true)
      .maybeSingle();
    
    if (data) {
      setMaxRadius(data.max_delivery_radius_km || 15);
      setMinOrderValue(data.min_order_value || 200);
      setRiderBaseEarning(data.rider_base_earning || 50);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('rider_payment_settings')
        .update({
          base_fee: baseFee,
          per_km_rate: perKmRate,
          min_payment: minPayment,
          max_delivery_radius_km: maxRadius,
          min_order_value: minOrderValue,
          rider_base_earning: riderBaseEarning,
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Payment & Delivery Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Fee Settings */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2 text-foreground">
            <DollarSign className="w-4 h-4 text-primary" />
            Delivery Fee Structure
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Base Delivery Fee (PKR)</Label>
              <Input
                type="number"
                value={baseFee}
                onChange={(e) => setBaseFee(Number(e.target.value))}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Fixed fee charged to customer
              </p>
            </div>

            <div className="space-y-2">
              <Label>Per KM Rate (PKR)</Label>
              <Input
                type="number"
                value={perKmRate}
                onChange={(e) => setPerKmRate(Number(e.target.value))}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Additional charge per kilometer
              </p>
            </div>

            <div className="space-y-2">
              <Label>Minimum Delivery Fee (PKR)</Label>
              <Input
                type="number"
                value={minPayment}
                onChange={(e) => setMinPayment(Number(e.target.value))}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Minimum amount per delivery
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Rider Earnings Settings */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2 text-foreground">
            <Wallet className="w-4 h-4 text-primary" />
            Rider Earnings
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rider Base Earning (PKR)</Label>
              <Input
                type="number"
                value={riderBaseEarning}
                onChange={(e) => setRiderBaseEarning(Number(e.target.value))}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Fixed earning per delivery for rider
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Delivery Constraints */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2 text-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            Delivery Constraints
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Delivery Radius (KM)</Label>
              <Input
                type="number"
                value={maxRadius}
                onChange={(e) => setMaxRadius(Number(e.target.value))}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Maximum distance for deliveries
              </p>
            </div>

            <div className="space-y-2">
              <Label>Min Order Value (PKR)</Label>
              <Input
                type="number"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(Number(e.target.value))}
                min={0}
              />
              <p className="text-xs text-muted-foreground">
                Minimum order subtotal required
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Formula Preview */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Payment Formula Preview</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer Delivery Fee:</span>
              <code className="text-primary">{baseFee} + (Distance × {perKmRate}) PKR</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rider Earning:</span>
              <code className="text-primary">{riderBaseEarning} + (Distance × {perKmRate}) PKR</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minimum Payment:</span>
              <code className="text-primary">{minPayment} PKR</code>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full md:w-auto"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Save All Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default EnhancedPaymentSettings;
