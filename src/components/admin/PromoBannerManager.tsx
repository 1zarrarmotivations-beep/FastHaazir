import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAllPromoBanners, PromoBanner } from '@/hooks/usePromoBanner';
import { useQueryClient } from '@tanstack/react-query';

const PRESET_GRADIENTS = [
  { name: 'Fast Haazir Orange', value: 'linear-gradient(135deg, #ff6a00 0%, #ff3d00 100%)' },
  { name: 'Success Green', value: 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)' },
  { name: 'Royal Purple', value: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)' },
  { name: 'Ocean Blue', value: 'linear-gradient(135deg, #0984e3 0%, #74b9ff 100%)' },
  { name: 'Sunset', value: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)' },
  { name: 'Dark Slate', value: 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)' },
];

const EMOJI_OPTIONS = ['🎉', '🔥', '⭐', '🎁', '💰', '🚀', '✨', '🍕', '🍔', '🎊'];

interface BannerFormData {
  heading_en: string;
  heading_ur: string;
  description_en: string;
  description_ur: string;
  icon: string;
  background_type: 'gradient' | 'image';
  background_value: string;
  is_active: boolean;
  click_action: 'none' | 'restaurants' | 'categories' | 'external';
  external_url: string;
}

const defaultFormData: BannerFormData = {
  heading_en: '',
  heading_ur: '',
  description_en: '',
  description_ur: '',
  icon: '🎉',
  background_type: 'gradient',
  background_value: PRESET_GRADIENTS[0].value,
  is_active: false,
  click_action: 'none',
  external_url: '',
};

export default function PromoBannerManager() {
  const { t } = useTranslation();
  const { data: banners, isLoading } = useAllPromoBanners();
  const queryClient = useQueryClient();
  
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [formData, setFormData] = useState<BannerFormData>(defaultFormData);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewLang, setPreviewLang] = useState<'en' | 'ur'>('ur');

  useEffect(() => {
    if (editingBanner) {
      setFormData({
        heading_en: editingBanner.heading_en || '',
        heading_ur: editingBanner.heading_ur || '',
        description_en: editingBanner.description_en || '',
        description_ur: editingBanner.description_ur || '',
        icon: editingBanner.icon || '🎉',
        background_type: editingBanner.background_type as 'gradient' | 'image',
        background_value: editingBanner.background_value || PRESET_GRADIENTS[0].value,
        is_active: editingBanner.is_active,
        click_action: editingBanner.click_action as BannerFormData['click_action'],
        external_url: editingBanner.external_url || '',
      });
      setShowForm(true);
    }
  }, [editingBanner]);

  const handleCreate = () => {
    setEditingBanner(null);
    setFormData(defaultFormData);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.heading_en.trim() && !formData.heading_ur.trim()) {
      toast.error('Please enter at least one heading');
      return;
    }

    setIsSaving(true);
    try {
      // If activating this banner, deactivate others first
      if (formData.is_active) {
        await supabase
          .from('promo_banners')
          .update({ is_active: false })
          .neq('id', editingBanner?.id || '');
      }

      const payload = {
        heading_en: formData.heading_en,
        heading_ur: formData.heading_ur,
        description_en: formData.description_en || null,
        description_ur: formData.description_ur || null,
        icon: formData.icon,
        background_type: formData.background_type,
        background_value: formData.background_value,
        is_active: formData.is_active,
        click_action: formData.click_action,
        external_url: formData.click_action === 'external' ? formData.external_url : null,
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

      queryClient.invalidateQueries({ queryKey: ['promo-banners-all'] });
      queryClient.invalidateQueries({ queryKey: ['promo-banner-active'] });
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
      queryClient.invalidateQueries({ queryKey: ['promo-banners-all'] });
      queryClient.invalidateQueries({ queryKey: ['promo-banner-active'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete banner');
    }
  };

  const handleToggleActive = async (banner: PromoBanner) => {
    try {
      // If activating, deactivate others first
      if (!banner.is_active) {
        await supabase
          .from('promo_banners')
          .update({ is_active: false })
          .neq('id', banner.id);
      }

      const { error } = await supabase
        .from('promo_banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);
      
      if (error) throw error;
      toast.success(banner.is_active ? 'Banner disabled' : 'Banner activated');
      queryClient.invalidateQueries({ queryKey: ['promo-banners-all'] });
      queryClient.invalidateQueries({ queryKey: ['promo-banner-active'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update banner');
    }
  };

  // Live Preview Component
  const BannerPreview = () => {
    const heading = previewLang === 'ur' ? formData.heading_ur : formData.heading_en;
    const description = previewLang === 'ur' ? formData.description_ur : formData.description_en;
    
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
          className="relative overflow-hidden rounded-2xl p-4"
          style={{
            background: formData.background_type === 'gradient' 
              ? formData.background_value 
              : `url(${formData.background_value}) center/cover`,
          }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
            <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
          </div>

          {/* Content */}
          <div className="relative flex items-center gap-4">
            <div className="flex-1" style={{ direction: previewLang === 'ur' ? 'rtl' : 'ltr' }}>
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
                <p className="text-sm text-white/80">{description}</p>
              )}
            </div>
            
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </motion.div>
          </div>

          {/* Floating Emoji */}
          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute right-20 top-2 text-2xl"
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
          <h3 className="text-lg font-semibold">Special Offer Banner</h3>
          <p className="text-sm text-muted-foreground">
            Manage the promotional banner on customer home screen
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
                    <CardDescription>Design your promotional banner</CardDescription>
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
                {/* Live Preview */}
                <BannerPreview />

                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="design">Design</TabsTrigger>
                    <TabsTrigger value="action">Action</TabsTrigger>
                  </TabsList>

                  {/* Content Tab */}
                  <TabsContent value="content" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Heading (English)</Label>
                        <Input 
                          placeholder="Free Delivery on First Order!"
                          value={formData.heading_en}
                          onChange={(e) => setFormData(prev => ({ ...prev, heading_en: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Heading (Urdu) عنوان</Label>
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
                        <Label>Description (English)</Label>
                        <Textarea 
                          placeholder="Order now and save on delivery"
                          value={formData.description_en}
                          onChange={(e) => setFormData(prev => ({ ...prev, description_en: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description (Urdu) تفصیل</Label>
                        <Textarea 
                          placeholder="ابھی آرڈر کریں اور بچت کریں"
                          value={formData.description_ur}
                          onChange={(e) => setFormData(prev => ({ ...prev, description_ur: e.target.value }))}
                          rows={2}
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
                        <div className="grid grid-cols-3 gap-2">
                          {PRESET_GRADIENTS.map((gradient) => (
                            <button
                              key={gradient.name}
                              onClick={() => setFormData(prev => ({ ...prev, background_value: gradient.value }))}
                              className={`h-16 rounded-lg transition-all ${
                                formData.background_value === gradient.value 
                                  ? 'ring-2 ring-primary ring-offset-2' 
                                  : 'hover:opacity-80'
                              }`}
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
                            className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center transition-all ${
                              formData.icon === emoji 
                                ? 'bg-primary text-primary-foreground ring-2 ring-primary' 
                                : 'bg-muted hover:bg-muted/80'
                            }`}
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

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <Label className="text-base">Activate Banner</Label>
                        <p className="text-sm text-muted-foreground">
                          Show this banner on customer home screen
                        </p>
                      </div>
                      <Switch 
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Actions */}
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

      {/* Banners List */}
      {!showForm && (
        <div className="space-y-3">
          {banners?.length === 0 && (
            <Card className="p-8 text-center">
              <div className="text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No banners created yet</p>
                <p className="text-sm">Create a banner to display on the customer home screen</p>
              </div>
            </Card>
          )}
          
          {banners?.map((banner) => (
            <Card key={banner.id} className={banner.is_active ? 'ring-2 ring-primary' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div 
                    className="w-24 h-16 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl"
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
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{banner.heading_ur || banner.heading_en}</h4>
                      {banner.is_active && (
                        <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {banner.description_ur || banner.description_en || 'No description'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Action: {banner.click_action === 'none' ? 'None' : banner.click_action}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(banner)}
                      title={banner.is_active ? 'Disable' : 'Enable'}
                    >
                      {banner.is_active ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
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
          ))}
        </div>
      )}
    </div>
  );
}
