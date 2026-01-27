import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  Image as ImageIcon,
  Palette,
  Link as LinkIcon,
  Store,
  Grid3X3,
  X,
  Sparkles,
  ChevronRight,
  GripVertical,
  Calendar,
  Clock,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAllPromoBannersAdmin, useBusinessesForBanner, PromoBanner } from '@/hooks/usePromoBanners';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const PRESET_GRADIENTS = [
  { name: 'Fast Haazir Orange', value: 'linear-gradient(135deg, #ff6a00 0%, #ff3d00 100%)' },
  { name: 'Success Green', value: 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)' },
  { name: 'Royal Purple', value: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)' },
  { name: 'Ocean Blue', value: 'linear-gradient(135deg, #0984e3 0%, #74b9ff 100%)' },
  { name: 'Sunset Pink', value: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)' },
  { name: 'Dark Slate', value: 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)' },
  { name: 'Ramadan Gold', value: 'linear-gradient(135deg, #f39c12 0%, #d68910 100%)' },
  { name: 'Fresh Mint', value: 'linear-gradient(135deg, #00b894 0%, #55efc4 100%)' },
];

const EMOJI_OPTIONS = ['🎉', '🔥', '⭐', '🎁', '💰', '🚀', '✨', '🍕', '🍔', '🎊', '🌙', '🛒', '💊', '🥖'];

interface BannerFormData {
  heading_en: string;
  heading_ur: string;
  description_en: string;
  description_ur: string;
  subtitle_en: string;
  subtitle_ur: string;
  button_text_en: string;
  button_text_ur: string;
  icon: string;
  background_type: 'gradient' | 'image';
  background_value: string;
  is_active: boolean;
  click_action: 'none' | 'restaurants' | 'categories' | 'external' | 'business';
  external_url: string;
  business_id: string;
  start_date: Date | undefined;
  end_date: Date | undefined;
  display_order: number;
}

const defaultFormData: BannerFormData = {
  heading_en: '',
  heading_ur: '',
  description_en: '',
  description_ur: '',
  subtitle_en: '',
  subtitle_ur: '',
  button_text_en: '',
  button_text_ur: '',
  icon: '🎉',
  background_type: 'gradient',
  background_value: PRESET_GRADIENTS[0].value,
  is_active: false,
  click_action: 'none',
  external_url: '',
  business_id: '',
  start_date: undefined,
  end_date: undefined,
  display_order: 0,
};

export default function BannersManager() {
  const { t } = useTranslation();
  const { data: banners, isLoading } = useAllPromoBannersAdmin();
  const { data: businesses } = useBusinessesForBanner();
  const queryClient = useQueryClient();
  
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [formData, setFormData] = useState<BannerFormData>(defaultFormData);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewLang, setPreviewLang] = useState<'en' | 'ur'>('ur');
  const [orderedBanners, setOrderedBanners] = useState<PromoBanner[]>([]);

  useEffect(() => {
    if (banners) {
      setOrderedBanners([...banners]);
    }
  }, [banners]);

  useEffect(() => {
    if (editingBanner) {
      setFormData({
        heading_en: editingBanner.heading_en || '',
        heading_ur: editingBanner.heading_ur || '',
        description_en: editingBanner.description_en || '',
        description_ur: editingBanner.description_ur || '',
        subtitle_en: editingBanner.subtitle_en || '',
        subtitle_ur: editingBanner.subtitle_ur || '',
        button_text_en: editingBanner.button_text_en || '',
        button_text_ur: editingBanner.button_text_ur || '',
        icon: editingBanner.icon || '🎉',
        background_type: editingBanner.background_type as 'gradient' | 'image',
        background_value: editingBanner.background_value || PRESET_GRADIENTS[0].value,
        is_active: editingBanner.is_active,
        click_action: editingBanner.click_action as BannerFormData['click_action'],
        external_url: editingBanner.external_url || '',
        business_id: editingBanner.business_id || '',
        start_date: editingBanner.start_date ? new Date(editingBanner.start_date) : undefined,
        end_date: editingBanner.end_date ? new Date(editingBanner.end_date) : undefined,
        display_order: editingBanner.display_order,
      });
      setShowForm(true);
    }
  }, [editingBanner]);

  const handleCreate = () => {
    setEditingBanner(null);
    setFormData({
      ...defaultFormData,
      display_order: (banners?.length || 0) + 1,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.heading_en.trim() && !formData.heading_ur.trim()) {
      toast.error('Please enter at least one heading');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        heading_en: formData.heading_en,
        heading_ur: formData.heading_ur,
        description_en: formData.description_en || null,
        description_ur: formData.description_ur || null,
        subtitle_en: formData.subtitle_en || null,
        subtitle_ur: formData.subtitle_ur || null,
        button_text_en: formData.button_text_en || null,
        button_text_ur: formData.button_text_ur || null,
        icon: formData.icon,
        background_type: formData.background_type,
        background_value: formData.background_value,
        is_active: formData.is_active,
        click_action: formData.click_action,
        external_url: formData.click_action === 'external' ? formData.external_url : null,
        business_id: formData.click_action === 'business' ? formData.business_id : null,
        start_date: formData.start_date?.toISOString() || null,
        end_date: formData.end_date?.toISOString() || null,
        display_order: formData.display_order,
      };

      if (editingBanner) {
        const { error } = await supabase
          .from('promo_banners')
          .update(payload)
          .eq('id', editingBanner.id);
        if (error) throw error;
        toast.success('Banner updated successfully');
      } else {
        const { error } = await supabase
          .from('promo_banners')
          .insert(payload);
        if (error) throw error;
        toast.success('Banner created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['promo-banners-all-admin'] });
      queryClient.invalidateQueries({ queryKey: ['promo-banners-active-carousel'] });
      setShowForm(false);
      setEditingBanner(null);
    } catch (error: any) {
      console.error('Error saving banner:', error);
      toast.error(error.message || 'Failed to save banner');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    
    try {
      const { error } = await supabase
        .from('promo_banners')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Banner deleted');
      queryClient.invalidateQueries({ queryKey: ['promo-banners-all-admin'] });
      queryClient.invalidateQueries({ queryKey: ['promo-banners-active-carousel'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete banner');
    }
  };

  const handleToggleActive = async (banner: PromoBanner) => {
    try {
      const { error } = await supabase
        .from('promo_banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);
      
      if (error) throw error;
      toast.success(banner.is_active ? 'Banner disabled' : 'Banner activated');
      queryClient.invalidateQueries({ queryKey: ['promo-banners-all-admin'] });
      queryClient.invalidateQueries({ queryKey: ['promo-banners-active-carousel'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update banner');
    }
  };

  const handleReorder = async (newOrder: PromoBanner[]) => {
    setOrderedBanners(newOrder);
    
    // Update display_order in database
    try {
      const updates = newOrder.map((banner, index) => 
        supabase
          .from('promo_banners')
          .update({ display_order: index })
          .eq('id', banner.id)
      );
      
      await Promise.all(updates);
      queryClient.invalidateQueries({ queryKey: ['promo-banners-all-admin'] });
      queryClient.invalidateQueries({ queryKey: ['promo-banners-active-carousel'] });
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to update order');
    }
  };

  const getBannerStatus = (banner: PromoBanner) => {
    const now = new Date();
    const startDate = banner.start_date ? new Date(banner.start_date) : null;
    const endDate = banner.end_date ? new Date(banner.end_date) : null;

    if (!banner.is_active) return { label: 'Disabled', variant: 'secondary' as const };
    if (startDate && startDate > now) return { label: 'Scheduled', variant: 'outline' as const };
    if (endDate && endDate < now) return { label: 'Expired', variant: 'destructive' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  // Live Preview Component
  const BannerPreview = () => {
    const heading = previewLang === 'ur' ? formData.heading_ur : formData.heading_en;
    const description = previewLang === 'ur' 
      ? (formData.subtitle_ur || formData.description_ur) 
      : (formData.subtitle_en || formData.description_en);
    const buttonText = previewLang === 'ur' ? formData.button_text_ur : formData.button_text_en;
    
    return (
      <div className="border rounded-xl p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium">Live Preview</Label>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant={previewLang === 'ur' ? 'default' : 'outline'}
              onClick={() => setPreviewLang('ur')}
              className="h-7 text-xs"
            >
              اردو
            </Button>
            <Button 
              size="sm" 
              variant={previewLang === 'en' ? 'default' : 'outline'}
              onClick={() => setPreviewLang('en')}
              className="h-7 text-xs"
            >
              EN
            </Button>
          </div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-5"
          style={{
            background: formData.background_type === 'gradient' 
              ? formData.background_value 
              : `url(${formData.background_value}) center/cover`,
            minHeight: '120px',
          }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
            <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
          </div>

          <div className="relative flex items-center gap-4" style={{ direction: previewLang === 'ur' ? 'rtl' : 'ltr' }}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-xs font-medium text-white/90 uppercase tracking-wide">
                  {previewLang === 'ur' ? 'خصوصی پیشکش' : 'Special Offer'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                {heading || (previewLang === 'ur' ? 'عنوان یہاں' : 'Heading here')}
              </h3>
              {description && (
                <p className="text-sm text-white/80 mb-2">{description}</p>
              )}
              {buttonText && (
                <Button size="sm" variant="secondary" className="bg-white/20 text-white border-white/30">
                  {buttonText}
                </Button>
              )}
            </div>
            
            {!buttonText && (
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            )}
          </div>

          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute right-20 top-3 text-2xl"
          >
            {formData.icon}
          </motion.div>
        </motion.div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Banner Carousel Manager</h3>
          <p className="text-sm text-muted-foreground">
            Manage promotional banners with scheduling and ordering
          </p>
        </div>
        {!showForm && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Banner
          </Button>
        )}
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{editingBanner ? 'Edit Banner' : 'Create New Banner'}</CardTitle>
                    <CardDescription>Design your promotional banner with scheduling</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => { setShowForm(false); setEditingBanner(null); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <BannerPreview />

                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="design">Design</TabsTrigger>
                    <TabsTrigger value="action">Action</TabsTrigger>
                    <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  </TabsList>

                  {/* Content Tab */}
                  <TabsContent value="content" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Title (English)</Label>
                        <Input 
                          placeholder="Free Delivery on First Order!"
                          value={formData.heading_en}
                          onChange={(e) => setFormData(prev => ({ ...prev, heading_en: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Title (Urdu) عنوان</Label>
                        <Input 
                          placeholder="پہلے آرڈر پر مفت ڈیلیوری!"
                          value={formData.heading_ur}
                          onChange={(e) => setFormData(prev => ({ ...prev, heading_ur: e.target.value }))}
                          className="text-right"
                          dir="rtl"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Subtitle (English)</Label>
                        <Textarea 
                          placeholder="Order now and save on delivery"
                          value={formData.subtitle_en}
                          onChange={(e) => setFormData(prev => ({ ...prev, subtitle_en: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Subtitle (Urdu) ذیلی عنوان</Label>
                        <Textarea 
                          placeholder="ابھی آرڈر کریں اور بچت کریں"
                          value={formData.subtitle_ur}
                          onChange={(e) => setFormData(prev => ({ ...prev, subtitle_ur: e.target.value }))}
                          rows={2}
                          className="text-right"
                          dir="rtl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Button Text (English) - Optional</Label>
                        <Input 
                          placeholder="Order Now"
                          value={formData.button_text_en}
                          onChange={(e) => setFormData(prev => ({ ...prev, button_text_en: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Button Text (Urdu) بٹن کا متن</Label>
                        <Input 
                          placeholder="ابھی آرڈر کریں"
                          value={formData.button_text_ur}
                          onChange={(e) => setFormData(prev => ({ ...prev, button_text_ur: e.target.value }))}
                          className="text-right"
                          dir="rtl"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Design Tab */}
                  <TabsContent value="design" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Background Type</Label>
                      <Select 
                        value={formData.background_type}
                        onValueChange={(v) => setFormData(prev => ({ 
                          ...prev, 
                          background_type: v as 'gradient' | 'image',
                          background_value: v === 'gradient' ? PRESET_GRADIENTS[0].value : ''
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gradient">
                            <div className="flex items-center gap-2">
                              <Palette className="w-4 h-4" />
                              Gradient
                            </div>
                          </SelectItem>
                          <SelectItem value="image">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              Image URL
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.background_type === 'gradient' ? (
                      <div className="space-y-2">
                        <Label>Select Gradient</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {PRESET_GRADIENTS.map((gradient) => (
                            <button
                              key={gradient.name}
                              onClick={() => setFormData(prev => ({ ...prev, background_value: gradient.value }))}
                              className={cn(
                                "h-12 rounded-lg transition-all",
                                formData.background_value === gradient.value 
                                  ? 'ring-2 ring-primary ring-offset-2' 
                                  : 'hover:opacity-80'
                              )}
                              style={{ background: gradient.value }}
                              title={gradient.name}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Image URL</Label>
                        <Input 
                          placeholder="https://example.com/banner.jpg"
                          value={formData.background_value}
                          onChange={(e) => setFormData(prev => ({ ...prev, background_value: e.target.value }))}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Icon / Emoji</Label>
                      <div className="flex flex-wrap gap-2">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                            className={cn(
                              "w-10 h-10 text-xl rounded-lg flex items-center justify-center transition-all",
                              formData.icon === emoji 
                                ? 'bg-primary text-primary-foreground ring-2 ring-primary' 
                                : 'bg-muted hover:bg-muted/80'
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Action Tab */}
                  <TabsContent value="action" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Click Action</Label>
                      <Select 
                        value={formData.click_action}
                        onValueChange={(v) => setFormData(prev => ({ 
                          ...prev, 
                          click_action: v as BannerFormData['click_action']
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No action</SelectItem>
                          <SelectItem value="restaurants">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4" />
                              Open Restaurants
                            </div>
                          </SelectItem>
                          <SelectItem value="categories">
                            <div className="flex items-center gap-2">
                              <Grid3X3 className="w-4 h-4" />
                              Open Categories
                            </div>
                          </SelectItem>
                          <SelectItem value="business">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              Open Specific Business
                            </div>
                          </SelectItem>
                          <SelectItem value="external">
                            <div className="flex items-center gap-2">
                              <LinkIcon className="w-4 h-4" />
                              External Link
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.click_action === 'external' && (
                      <div className="space-y-2">
                        <Label>External URL</Label>
                        <Input 
                          placeholder="https://example.com"
                          value={formData.external_url}
                          onChange={(e) => setFormData(prev => ({ ...prev, external_url: e.target.value }))}
                        />
                      </div>
                    )}

                    {formData.click_action === 'business' && (
                      <div className="space-y-2">
                        <Label>Select Business</Label>
                        <Select 
                          value={formData.business_id}
                          onValueChange={(v) => setFormData(prev => ({ ...prev, business_id: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a business..." />
                          </SelectTrigger>
                          <SelectContent>
                            {businesses?.map((biz) => (
                              <SelectItem key={biz.id} value={biz.id}>
                                {biz.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="text-base">Activate Banner</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable this banner for display
                        </p>
                      </div>
                      <Switch 
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                    </div>
                  </TabsContent>

                  {/* Schedule Tab */}
                  <TabsContent value="schedule" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Start Date (Optional)
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              {formData.start_date 
                                ? format(formData.start_date, 'PPP p')
                                : 'No start date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={formData.start_date}
                              onSelect={(date) => setFormData(prev => ({ ...prev, start_date: date }))}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        {formData.start_date && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setFormData(prev => ({ ...prev, start_date: undefined }))}
                          >
                            Clear start date
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          End Date (Optional)
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              {formData.end_date 
                                ? format(formData.end_date, 'PPP p')
                                : 'No end date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={formData.end_date}
                              onSelect={(date) => setFormData(prev => ({ ...prev, end_date: date }))}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        {formData.end_date && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setFormData(prev => ({ ...prev, end_date: undefined }))}
                          >
                            Clear end date
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Scheduling Rules:</strong>
                        <br />• Banner shows only within start and end dates
                        <br />• Leave dates empty for always-on display
                        <br />• Expired banners auto-hide automatically
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => { setShowForm(false); setEditingBanner(null); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Banner'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banners List with Drag & Drop */}
      {!showForm && (
        <div className="space-y-3">
          {orderedBanners.length === 0 && (
            <Card className="p-8 text-center">
              <div className="text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No banners created yet</p>
                <p className="text-sm">Create banners for your home screen carousel</p>
              </div>
            </Card>
          )}
          
          <Reorder.Group axis="y" values={orderedBanners} onReorder={handleReorder} className="space-y-3">
            {orderedBanners.map((banner) => {
              const status = getBannerStatus(banner);
              
              return (
                <Reorder.Item key={banner.id} value={banner}>
                  <Card className={cn(
                    "transition-all",
                    status.label === 'Active' && 'ring-2 ring-primary'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Drag Handle */}
                        <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                          <GripVertical className="w-5 h-5" />
                        </div>

                        {/* Preview */}
                        <div 
                          className="w-20 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-xl"
                          style={{
                            background: banner.background_type === 'gradient' 
                              ? banner.background_value 
                              : `url(${banner.background_value}) center/cover`,
                          }}
                        >
                          {banner.icon}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium truncate">{banner.heading_ur || banner.heading_en}</h4>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {banner.subtitle_ur || banner.description_ur || banner.subtitle_en || banner.description_en || 'No description'}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>Action: {banner.click_action}</span>
                            {banner.start_date && (
                              <span>From: {format(new Date(banner.start_date), 'MMM d')}</span>
                            )}
                            {banner.end_date && (
                              <span>Until: {format(new Date(banner.end_date), 'MMM d')}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(banner)}
                            title={banner.is_active ? 'Disable' : 'Enable'}
                          >
                            {banner.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingBanner(banner)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(banner.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
          
          {orderedBanners.length > 0 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Drag banners to reorder. Top banners appear first in carousel.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
