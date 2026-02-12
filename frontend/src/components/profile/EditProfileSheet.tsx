import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useCustomerProfile, useUpsertCustomerProfile } from '@/hooks/useCustomerProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { ImageUploadField } from '@/components/common/ImageUploadField';

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditProfileSheet = ({ open, onOpenChange }: EditProfileSheetProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: profile, refetch: refetchProfile } = useCustomerProfile();
  const upsertProfile = useUpsertCustomerProfile();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profile_image: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Sync form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        profile_image: profile.profile_image || '',
      });
    }
  }, [profile]);

  // Handle profile image change from upload component
  const handleImageChange = (url: string | null) => {
    setFormData(prev => ({ ...prev, profile_image: url || '' }));
  };

  // Save all profile changes
  const handleSave = async () => {
    if (!user?.id) {
      toast.error(t('common.notAuthenticated', 'براہ کرم لاگ ان کریں'));
      return;
    }

    setIsSaving(true);

    try {
      // Update profile including image
      const { error } = await supabase
        .from('customer_profiles')
        .upsert({
          user_id: user.id,
          name: formData.name.trim() || null,
          email: formData.email.trim() || null,
          profile_image: formData.profile_image || null,
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('[EditProfileSheet] Save error:', error);
        throw error;
      }

      // Invalidate and refetch profile data
      await queryClient.invalidateQueries({ queryKey: ['customer-profile'] });
      await refetchProfile();

      toast.success(t('profile.profileUpdated', 'پروفائل اپڈیٹ ہو گیا!'));
      onOpenChange(false);
    } catch (error) {
      console.error('[EditProfileSheet] Save error:', error);
      toast.error(t('profile.updateFailed', 'پروفائل اپڈیٹ نہیں ہو سکی'));
    } finally {
      setIsSaving(false);
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
            {user?.id && (
              <ImageUploadField
                value={formData.profile_image}
                onChange={handleImageChange}
                userId={user.id}
                bucket="profiles"
                folder="customers"
                maxSizeMB={2}
                variant="avatar"
                size="lg"
                placeholder="user"
              />
            )}
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
              <Label htmlFor="email">
                {t('profile.email', 'ای میل')} ({t('common.optional', 'اختیاری')})
              </Label>
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
            disabled={isSaving}
          >
            {isSaving ? (
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
