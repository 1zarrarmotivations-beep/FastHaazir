import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings, DollarSign, Route, Loader2 } from 'lucide-react';
import { usePaymentSettings, useUpdatePaymentSettings } from '@/hooks/useRiderPayments';

const PaymentSettingsManager = () => {
  const { data: settings, isLoading } = usePaymentSettings();
  const updateSettings = useUpdatePaymentSettings();

  const [baseFee, setBaseFee] = useState(80);
  const [perKmRate, setPerKmRate] = useState(30);
  const [minPayment, setMinPayment] = useState(100);

  useEffect(() => {
    if (settings) {
      setBaseFee(settings.base_fee);
      setPerKmRate(settings.per_km_rate);
      setMinPayment(settings.min_payment);
    }
  }, [settings]);

  const handleSave = () => {
    if (!settings) return;
    updateSettings.mutate({
      id: settings.id,
      base_fee: baseFee,
      per_km_rate: perKmRate,
      min_payment: minPayment,
    });
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
          Payment Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Base Fee (PKR)
            </Label>
            <Input
              type="number"
              value={baseFee}
              onChange={(e) => setBaseFee(Number(e.target.value))}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Fixed fee for every delivery
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Route className="w-4 h-4 text-muted-foreground" />
              Per KM Rate (PKR)
            </Label>
            <Input
              type="number"
              value={perKmRate}
              onChange={(e) => setPerKmRate(Number(e.target.value))}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Additional fee per kilometer
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Minimum Payment (PKR)
            </Label>
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

        <div className="pt-4 border-t border-border">
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <h4 className="font-medium mb-2">Payment Formula</h4>
            <code className="text-sm text-primary">
              Total = {baseFee} + (Distance × {perKmRate}) PKR
            </code>
            <p className="text-sm text-muted-foreground mt-1">
              Minimum payment: {minPayment} PKR
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={updateSettings.isPending}
            className="w-full md:w-auto"
          >
            {updateSettings.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentSettingsManager;
