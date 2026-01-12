import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Loader2, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerProfile, useUpsertCustomerProfile, CustomerProfile } from '@/hooks/useCustomerProfile';

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditProfileSheet = ({ open, onOpenChange }: EditProfileSheetProps) => {
  const { data: profile } = useCustomerProfile();
  const upsertProfile = useUpsertCustomerProfile();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profile_image: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        profile_image: (profile as any).profile_image || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await upsertProfile.mutateAsync({
        name: formData.name.trim() || undefined,
        email: formData.email.trim() || undefined,
      });
      toast.success('Profile updated successfully!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Profile</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {formData.profile_image ? (
                  <img 
                    src={formData.profile_image} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              <button 
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-lg"
                onClick={() => toast.info('Photo upload coming soon!')}
              >
                <Camera className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">Tap to change photo</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                disabled
                value="+92 XXX XXXXXXX"
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Phone number cannot be changed
              </p>
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            className="w-full gap-2"
            disabled={upsertProfile.isPending}
          >
            {upsertProfile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EditProfileSheet;
