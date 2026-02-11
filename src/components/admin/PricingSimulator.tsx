import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Calculator, MapPin, ArrowRight, DollarSign, CloudRain, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { calculateFare } from '@/utils/PricingCalculator';

const PricingSimulator = () => {
    const [distance, setDistance] = useState<string>('5');
    const [serviceType, setServiceType] = useState<'food' | 'grocery' | 'parcel'>('food');
    const [loading, setLoading] = useState(false);
    const [quote, setQuote] = useState<any>(null);

    // Fetch current plan for display
    const { data: currentPlan } = useQuery({
        queryKey: ['pricing-plan', serviceType],
        queryFn: async () => {
            const { data } = await (supabase as any)
                .from('pricing_plans')
                .select('*')
                .eq('service_type', serviceType)
                .single();
            return data as any;
        }
    });

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const dist = parseFloat(distance);
            if (isNaN(dist) || dist < 0) {
                toast.error('Invalid distance');
                return;
            }

            const result = await calculateFare(dist, serviceType);
            setQuote(result);
            if (!result) toast.error('Failed to calculate fare');
        } catch (error) {
            console.error(error);
            toast.error('Calculation error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            {/* Input Section */}
            <Card className="h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-primary" />
                        Fare Simulator
                    </CardTitle>
                    <CardDescription>Test pricing logic with different scenarios.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Service Type</Label>
                        <div className="flex gap-2">
                            {(['food', 'grocery', 'parcel'] as const).map((type) => (
                                <Button
                                    key={type}
                                    variant={serviceType === type ? 'default' : 'outline'}
                                    onClick={() => setServiceType(type)}
                                    className="capitalize flex-1"
                                >
                                    {type}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Distance (km)</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={distance}
                                onChange={(e) => setDistance(e.target.value)}
                                className="pl-10 text-lg"
                            />
                        </div>
                    </div>

                    {/* Future: Dynamic Multipliers Inputs */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="bg-muted/30 p-3 rounded-lg border border-dashed flex items-center justify-between opacity-50 cursor-not-allowed" title="Coming Soon">
                            <div className="flex items-center gap-2 text-sm">
                                <CloudRain className="w-4 h-4" /> Rain Mode
                            </div>
                            <span className="text-xs font-mono">OFF</span>
                        </div>
                        <div className="bg-muted/30 p-3 rounded-lg border border-dashed flex items-center justify-between opacity-50 cursor-not-allowed" title="Coming Soon">
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4" /> High Demand
                            </div>
                            <span className="text-xs font-mono">1.0x</span>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        onClick={handleCalculate}
                        disabled={loading}
                        className="w-full font-bold text-lg"
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" /> : <Calculator className="mr-2" />}
                        Calculate Fare
                    </Button>

                    {currentPlan && (
                        <div className="text-xs text-muted-foreground mt-4 text-center">
                            Based on live plan: Base {currentPlan.base_fare} PKR + {currentPlan.per_km_rate}/km
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Result Section */}
            <Card className="h-full bg-slate-50 border-2 border-primary/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        Estimated Quote
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {quote ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col items-center justify-center py-6 bg-white rounded-xl shadow-sm border">
                                <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Total Customer Fare</span>
                                <div className="text-5xl font-extrabold text-primary mt-2">
                                    <span className="text-2xl align-top mr-1">PKR</span>
                                    {quote.totalFare}
                                </div>
                                {quote.breakdown.minimumApply && (
                                    <Badge variant="secondary" className="mt-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                                        Minimum Fare Applied
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-muted-foreground px-1">Cost Breakdown</h4>
                                <div className="bg-white p-4 rounded-lg border space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Base Fare</span>
                                        <span className="font-mono">{quote.breakdown.base.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Distance Charge ({quote.distanceKm} km)</span>
                                        <span className="font-mono">{quote.breakdown.distanceCharge.toFixed(2)}</span>
                                    </div>
                                    <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                                        <span>Subtotal</span>
                                        <span>{(quote.breakdown.base + quote.breakdown.distanceCharge).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pro-Forma Invoice Concept */}
                            <div className="flex gap-2 text-xs text-muted-foreground justify-center">
                                <Badge variant="outline" className="font-mono">
                                    QUOTE ID: Not Generated
                                </Badge>
                                <Badge variant="outline" className="font-mono text-green-600 bg-green-50 border-green-200">
                                    COMMISSION: ~{(quote.totalFare * 0.15).toFixed(0)} PKR
                                </Badge>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 min-h-[300px]">
                            <ArrowRight className="w-12 h-12 mb-4 rotate-180 md:rotate-0" />
                            <p>Enter details and hit calculate</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default PricingSimulator;
