import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Loader2, Save, User, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useCustomerProfile, useUpsertCustomerProfile, CustomerProfile } from '@/hooks/useCustomerProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditProfileSheet = ({ open, onOpenChange }: EditProfileSheetProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: profile } = useCustomerProfile();
  const upsertProfile = useUpsertCustomerProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profile_image: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        profile_image: profile.profile_image || '',
      });
      setPreviewUrl(profile.profile_image || null);
    }
  }, [profile]);

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.invalidFileType', 'صرف تصاویر اپ لوڈ کریں'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.fileTooLarge', 'فائل کا سائز 5MB سے کم ہونا چاہیے'));
      return;
    }

    setIsUploading(true);

    try {
      // Create local preview
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('fasthaazirmanu')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(t('profile.uploadFailed', 'تصویر اپ لوڈ نہیں ہو سکی'));
        setPreviewUrl(formData.profile_image || null);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('fasthaazirmanu')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      
      setFormData(prev => ({ ...prev, profile_image: publicUrl }));
      setPreviewUrl(publicUrl);
      toast.success(t('profile.photoUploaded', 'تصویر اپ لوڈ ہو گئی!'));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('profile.uploadFailed', 'تصویر اپ لوڈ نہیں ہو سکی'));
      setPreviewUrl(formData.profile_image || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setFormData(prev => ({ ...prev, profile_image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      await upsertProfile.mutateAsync({
        name: formData.name.trim() || undefined,
        email: formData.email.trim() || undefined,
      });

      // If profile image changed, update it separately
      if (formData.profile_image !== profile?.profile_image) {
        await supabase
          .from('customer_profiles')
          .update({ profile_image: formData.profile_image || null })
          .eq('user_id', user?.id);
      }

      toast.success(t('profile.profileUpdated', 'پروفائل اپڈیٹ ہو گیا!'));
      onOpenChange(false);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('profile.updateFailed', 'پروفائل اپڈیٹ نہیں ہو سکی'));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('profile.editProfile', 'پروفائل ترمیم')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden border-4 border-primary/20 shadow-lg">
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {t('common.loading', 'لوڈ ہو رہا ہے...')}
                    </span>
                  </div>
                ) : previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-14 h-14 text-primary/50" />
                )}
              </div>

              {/* Upload Button */}
              <button 
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Camera className="w-5 h-5 text-primary-foreground" />
              </button>

              {/* Remove Button */}
              {previewUrl && !isUploading && (
                <button
                  className="absolute top-0 right-0 w-7 h-7 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                  onClick={handleRemoveImage}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t('profile.changePhoto', 'تصویر بدلنے کے لیے ٹیپ کریں')}
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('profile.name', 'نام')}</Label>
              <Input
                id="name"
                placeholder={t('profile.enterName', 'اپنا نام درج کریں')}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('profile.email', 'ای میل')} ({t('common.optional', 'اختیاری')})</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('profile.phone', 'فون نمبر')}</Label>
              <Input
                disabled
                value={user?.phone || '+92 XXX XXXXXXX'}
                className="bg-muted h-12 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                {t('profile.phoneCannotChange', 'فون نمبر تبدیل نہیں ہو سکتا')}
              </p>
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            className="w-full h-12 rounded-xl gap-2"
            disabled={upsertProfile.isPending || isUploading}
          >
            {upsertProfile.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Save className="h-5 w-5" />
                {t('profile.saveChanges', 'تبدیلیاں محفوظ کریں')}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditProfileSheet;
