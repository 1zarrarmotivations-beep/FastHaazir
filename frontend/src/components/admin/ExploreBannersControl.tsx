import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Image as ImageIcon, Layout, Link as LinkIcon, Palette, Eye, Edit, Layers, Megaphone, Smartphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Type definitions matching DB schema
interface PromoBanner {
    id: string;
    title: string;
    subtitle: string | null;
    image_url: string;
    location: 'home' | 'category';
    category_id: string | null;
    style_config: {
        gradient?: string;
        overlayOpacity?: number;
        textColor?: string;
        icon?: string;
    };
    action_type: 'link' | 'store' | 'product';
    action_value: string | null;
    is_active: boolean;
    display_order: number;
}

const PRESET_GRADIENTS = [
    { name: 'None', value: '' },
    { name: 'Sunset', value: 'linear-gradient(to right, #ffbe0b, #fb5607)' },
    { name: 'Ocean', value: 'linear-gradient(to right, #00b4db, #0083b0)' },
    { name: 'Forest', value: 'linear-gradient(to right, #11998e, #38ef7d)' },
    { name: 'Berry', value: 'linear-gradient(to right, #833ab4, #fd1d1d, #fcb045)' },
    { name: 'Dark', value: 'linear-gradient(to right, #232526, #414345)' },
];

const ExploreBannersControl = () => {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');

    // Form State
    const [formData, setFormData] = useState<Partial<PromoBanner>>({
        title: '',
        subtitle: '',
        image_url: '',
        location: 'home',
        category_id: null,
        style_config: {
            gradient: '',
            overlayOpacity: 0.4,
            textColor: '#ffffff',
            icon: 'Megaphone'
        },
        action_type: 'link',
        action_value: '',
        is_active: true,
        display_order: 0
    });

    // Fetch Banners
    const { data: banners, isLoading } = useQuery({
        queryKey: ['admin-banners'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('promo_banners')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;

            // Transform style_config from jsonb
            return data.map(b => ({
                ...b,
                style_config: typeof b.style_config === 'string'
                    ? JSON.parse(b.style_config)
                    : (b.style_config || {})
            })) as PromoBanner[];
        }
    });

    // Fetch Categories for selection
    const { data: categories } = useQuery({
        queryKey: ['admin-categories-simple'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name')
                .order('name');
            if (error) throw error;
            return data;
        }
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (newBanner: Partial<PromoBanner>) => {
            const { data, error } = await supabase
                .from('promo_banners')
                .insert([{
                    title: newBanner.title,
                    subtitle: newBanner.subtitle,
                    image_url: newBanner.image_url,
                    location: newBanner.location,
                    category_id: newBanner.category_id,
                    style_config: newBanner.style_config, // Supabase handles JSONB
                    action_type: newBanner.action_type,
                    action_value: newBanner.action_value,
                    is_active: newBanner.is_active,
                    display_order: newBanner.display_order
                }]);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Banner created successfully');
            setIsAdding(false);
            setFormData({
                title: '',
                subtitle: '',
                image_url: '',
                location: 'home',
                style_config: { gradient: '', overlayOpacity: 0.4, textColor: '#ffffff', icon: 'Megaphone' },
                is_active: true
            });
            queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
        },
        onError: (error: any) => toast.error(`Error: ${error.message}`)
    });

    const updateMutation = useMutation({
        mutationFn: async (banner: Partial<PromoBanner>) => {
            if (!banner.id) throw new Error("Missing ID");
            const { error } = await supabase
                .from('promo_banners')
                .update({
                    title: banner.title,
                    subtitle: banner.subtitle,
                    image_url: banner.image_url,
                    location: banner.location,
                    category_id: banner.category_id,
                    style_config: banner.style_config,
                    action_type: banner.action_type,
                    action_value: banner.action_value,
                    is_active: banner.is_active,
                    display_order: banner.display_order
                })
                .eq('id', banner.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Banner updated successfully');
            setIsAdding(false);
            setEditingBanner(null);
            queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
        },
        onError: (error: any) => toast.error(`Error: ${error.message}`)
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('promo_banners').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Banner deleted');
            queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
        }
    });

    const handleSubmit = () => {
        if (!formData.title || (!formData.image_url && !formData.style_config?.gradient)) {
            toast.error("Title and either Image URL or Gradient are required");
            return;
        }

        if (editingBanner) {
            updateMutation.mutate({ ...formData, id: editingBanner.id });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleEdit = (banner: PromoBanner) => {
        setFormData(banner);
        setEditingBanner(banner);
        setIsAdding(true);
    };

    const BannerPreview = ({ data }: { data: Partial<PromoBanner> }) => (
        <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden shadow-xl group cursor-default">
            {/* Background Image/Gradient */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                    backgroundImage: data.image_url ? `url(${data.image_url})` : 'none',
                    background: !data.image_url && data.style_config?.gradient ? data.style_config.gradient : undefined
                }}
            />

            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black transition-opacity duration-300"
                style={{ opacity: data.style_config?.overlayOpacity ?? 0.4 }}
            />

            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

            {/* Content */}
            <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex items-center gap-3 mb-2 translate-y-0 transition-transform duration-300">
                    <motion.h2
                        className="text-2xl font-black leading-none drop-shadow-lg"
                        style={{ color: data.style_config?.textColor || '#ffffff' }}
                    >
                        {data.title || "Your Title Here"}
                    </motion.h2>
                </div>
                {data.subtitle && (
                    <motion.p
                        className="text-sm font-medium drop-shadow-md max-w-[80%] line-clamp-2"
                        style={{ color: (data.style_config?.textColor || '#ffffff') + 'CC' }} // Add transparency
                    >
                        {data.subtitle}
                    </motion.p>
                )}
            </div>

            {/* Location Badge */}
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border border-white/10">
                {data.location}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-primary" />
                        Promo Banners
                    </h3>
                    <p className="text-sm text-muted-foreground">Manage sliding banners for Home and Category pages.</p>
                </div>
                <Button onClick={() => {
                    setEditingBanner(null);
                    setFormData({
                        title: '',
                        subtitle: '',
                        image_url: '',
                        location: 'home',
                        style_config: { gradient: '', overlayOpacity: 0.4, textColor: '#ffffff', icon: 'Megaphone' },
                        is_active: true,
                        display_order: 0
                    });
                    setIsAdding(true);
                }} className="gap-2">
                    <Plus className="w-4 h-4" /> New Banner
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isLoading ? (
                    <div className="col-span-2 h-40 bg-muted rounded-xl animate-pulse" />
                ) : banners?.length === 0 ? (
                    <div className="col-span-2 text-center p-10 border-2 border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground">No banners active. Create one to engage users!</p>
                    </div>
                ) : (
                    banners?.map((banner) => (
                        <Card key={banner.id} className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all">
                            <div className="relative aspect-[21/9]">
                                <div
                                    className="w-full h-full bg-cover bg-center"
                                    style={{
                                        backgroundImage: banner.image_url ? `url(${banner.image_url})` : 'none',
                                        background: !banner.image_url && banner.style_config?.gradient ? banner.style_config.gradient : undefined,
                                        backgroundColor: !banner.image_url && !banner.style_config?.gradient ? '#e2e8f0' : undefined
                                    }}
                                >
                                    {/* Fallback pattern if nothing */}
                                    {!banner.image_url && !banner.style_config?.gradient && (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                                            <ImageIcon className="w-8 h-8 opacity-20" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                    <Button size="icon" variant="secondary" onClick={() => handleEdit(banner)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="destructive" onClick={() => {
                                        if (confirm("Delete this banner?")) deleteMutation.mutate(banner.id);
                                    }}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                                    <p className="font-bold text-lg">{banner.title}</p>
                                    <p className="text-xs opacity-80">{banner.location} {banner.category_id ? '(Specific Category)' : ''}</p>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogContent className="max-w-[900px] h-[90vh] overflow-y-auto p-0 gap-0">
                    <div className="sticky top-0 z-10 bg-background border-b border-border p-6 flex items-center justify-between">
                        <DialogHeader>
                            <DialogTitle>Banner Designer</DialogTitle>
                            <DialogDescription>Create engaging visual promotions</DialogDescription>
                        </DialogHeader>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className={previewMode === 'mobile' ? 'bg-muted' : ''} onClick={() => setPreviewMode('mobile')}>
                                <Smartphone className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className={previewMode === 'desktop' ? 'bg-muted' : ''} onClick={() => setPreviewMode('desktop')}>
                                <Layout className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-0 h-full">
                        {/* Editor Column */}
                        <div className="p-6 space-y-6 border-r border-border overflow-y-auto">
                            <div className="space-y-4">
                                <h4 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                                    <Layers className="w-4 h-4" /> Content
                                </h4>
                                <div className="grid gap-2">
                                    <Label>Title</Label>
                                    <Input
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Summer Sale"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Subtitle</Label>
                                    <Input
                                        value={formData.subtitle || ''}
                                        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                        placeholder="Up to 50% off on all items"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Image URL</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.image_url}
                                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                            placeholder="https://..."
                                        />
                                        <Button variant="outline" size="icon">
                                            <ImageIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border">
                                <h4 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                                    <Palette className="w-4 h-4" /> Design
                                </h4>
                                <div className="grid gap-2">
                                    <Label>Overlay Opacity ({((formData.style_config?.overlayOpacity || 0) * 100).toFixed(0)}%)</Label>
                                    <Slider
                                        value={[formData.style_config?.overlayOpacity || 0]}
                                        min={0} max={1} step={0.1}
                                        onValueChange={([val]) => setFormData({
                                            ...formData,
                                            style_config: { ...formData.style_config, overlayOpacity: val }
                                        })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Gradient Preset</Label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {PRESET_GRADIENTS.map((g) => (
                                            <button
                                                key={g.name}
                                                className={`w-full aspect-square rounded-full border-2 transition-all ${formData.style_config?.gradient === g.value ? 'border-primary scale-110' : 'border-transparent'}`}
                                                style={{ background: g.value || '#eee' }}
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    style_config: { ...formData.style_config, gradient: g.value }
                                                })}
                                                title={g.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border">
                                <h4 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                                    <LinkIcon className="w-4 h-4" /> Targeting & Action
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Display Location</Label>
                                        <Select
                                            value={formData.location}
                                            onValueChange={(val: 'home' | 'category') => setFormData({ ...formData, location: val })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="home">Home Page</SelectItem>
                                                <SelectItem value="category">Category Page</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {formData.location === 'category' && (
                                        <div className="grid gap-2">
                                            <Label>Specific Category</Label>
                                            <Select
                                                value={formData.category_id || ''}
                                                onValueChange={(val) => setFormData({ ...formData, category_id: val || null })}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">All Categories</SelectItem>
                                                    {categories?.map((c: any) => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="grid gap-2">
                                        <Label>Action Type</Label>
                                        <Select
                                            value={formData.action_type}
                                            onValueChange={(val: any) => setFormData({ ...formData, action_type: val })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="link">External Link</SelectItem>
                                                <SelectItem value="store">Open Store</SelectItem>
                                                <SelectItem value="product">Open Product</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Action Value (URL/ID)</Label>
                                        <Input
                                            value={formData.action_value || ''}
                                            onChange={(e) => setFormData({ ...formData, action_value: e.target.value })}
                                            placeholder={formData.action_type === 'link' ? 'https://...' : 'ID...'}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preview Column */}
                        <div className="p-8 bg-muted/30 flex flex-col items-center justify-center border-l border-border relative">
                            <div className="absolute top-4 right-4 bg-background px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-border">
                                Live Preview
                            </div>

                            <div className={`transition-all duration-500 ease-in-out ${previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-[800px]'}`}>
                                <div className="bg-background rounded-3xl shadow-2xl border border-border overflow-hidden">
                                    {/* Mock Header */}
                                    <div className="h-14 border-b border-border flex items-center px-4 gap-4 bg-background/50 backdrop-blur-sm">
                                        <div className="w-8 h-8 rounded-full bg-muted" />
                                        <div className="h-4 w-24 bg-muted rounded-full" />
                                    </div>

                                    {/* Mock Content */}
                                    <div className="p-4 space-y-4 min-h-[300px] bg-muted/5">
                                        {/* The Banner Preview */}
                                        <BannerPreview data={formData} />

                                        {/* Mock List Items */}
                                        <div className="space-y-3 opacity-30">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex gap-4">
                                                    <div className="w-16 h-16 bg-muted rounded-lg" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-4 w-3/4 bg-muted rounded" />
                                                        <div className="h-4 w-1/2 bg-muted rounded" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="sticky bottom-0 bg-background border-t border-border p-4 gap-2">
                        <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="bg-primary hover:bg-primary/90 min-w-[150px]"
                        >
                            {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Publish Banner"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ExploreBannersControl;
