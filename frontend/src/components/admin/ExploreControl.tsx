import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Tag, Trash2, Smartphone, Layout, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ExploreControl = () => {
    const queryClient = useQueryClient();
    const [isAddingOffer, setIsAddingOffer] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch all businesses for linking offers
    const { data: businesses } = useQuery({
        queryKey: ['admin-businesses-simple'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('businesses')
                .select('id, name')
                .eq('is_active', true);
            if (error) throw error;
            return data;
        }
    });

    // Fetch current offers
    const { data: offers, isLoading: offersLoading } = useQuery({
        queryKey: ['admin-offers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('offers')
                .select('*, store:businesses(name)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const handleDeleteOffer = async (id: string) => {
        if (!confirm('Are you sure you want to delete this offer?')) return;
        try {
            const { error } = await supabase.from('offers').delete().eq('id', id);
            if (error) throw error;
            toast.success('Offer deleted');
            queryClient.invalidateQueries({ queryKey: ['admin-offers'] });
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        <Smartphone className="w-6 h-6 text-primary" />
                        Explore Tab Control
                    </h2>
                    <p className="text-muted-foreground">Manage Discovery Engine content, Offers, and Featured sections.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Layout className="w-4 h-4" />
                        Preview Tab
                    </Button>
                    <Button onClick={() => setIsAddingOffer(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Flash Offer
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Offers Section */}
                <Card className="lg:col-span-2 shadow-xl border-primary/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="w-5 h-5 text-amber-500" />
                            Active Discovery Offers
                        </CardTitle>
                        <CardDescription>Flash deals displayed in the Explore tab best deals section.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {offersLoading ? (
                            <div className="h-40 flex items-center justify-center animate-pulse bg-muted rounded-xl" />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {offers?.length === 0 ? (
                                    <div className="col-span-full border-2 border-dashed border-border p-10 rounded-3xl text-center">
                                        <p className="text-muted-foreground font-medium mb-4">No active offers found</p>
                                        <Button variant="secondary" onClick={() => setIsAddingOffer(true)}>Create your first offer</Button>
                                    </div>
                                ) : (
                                    offers?.map((offer) => (
                                        <motion.div
                                            key={offer.id}
                                            layout
                                            className="p-4 rounded-2xl bg-muted/50 border border-border group relative transition-all hover:border-primary/50"
                                        >
                                            <button
                                                onClick={() => handleDeleteOffer(offer.id)}
                                                className="absolute top-2 right-2 p-2 rounded-full bg-destructive/10 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                                                    <Tag className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold leading-tight">{offer.title}</h4>
                                                    <p className="text-xs text-muted-foreground">{offer.store?.name || 'Global Offer'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-black rounded-full uppercase">
                                                    {offer.discount_value}{offer.discount_type === 'percent' ? '%' : ' OFF'}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                                    Expires: {new Date(offer.valid_until).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Configuration Panel */}
                <div className="space-y-6">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-widest">
                                <Sparkles className="w-4 h-4 text-primary" />
                                Discovery Algorithm
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Auto-Trending Stores</Label>
                                <Switch checked={true} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Personalized Recs</Label>
                                <Switch checked={true} />
                            </div>
                            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                <div className="flex gap-2 text-orange-600 mb-1">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span className="text-xs font-bold uppercase">Dynamic Ranking</span>
                                </div>
                                <p className="text-[10px] text-orange-600/80 font-medium">
                                    Stores are currently ranked by total orders and average rating in real-time.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ExploreControl;
