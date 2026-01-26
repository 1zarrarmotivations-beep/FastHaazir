/**
 * Reusable Image Upload Field Component
 * Used across customer profiles, rider profiles, admin panels
 */

import { useState, useRef, useCallback } from 'react';
import { Camera, Loader2, X, Upload, ImageIcon, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { uploadImage, deleteImage, ImageBucket, getOptimizedImageUrl } from '@/lib/imageUpload';

interface ImageUploadFieldProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  userId: string;
  bucket: ImageBucket;
  folder?: string;
  maxSizeMB?: number;
  variant?: 'avatar' | 'card' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  placeholder?: 'user' | 'image';
  disabled?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: { container: 'w-16 h-16', icon: 'w-6 h-6', button: 'w-6 h-6' },
  md: { container: 'w-24 h-24', icon: 'w-10 h-10', button: 'w-8 h-8' },
  lg: { container: 'w-32 h-32', icon: 'w-14 h-14', button: 'w-10 h-10' },
};

export function ImageUploadField({
  value,
  onChange,
  userId,
  bucket,
  folder,
  maxSizeMB = 5,
  variant = 'avatar',
  size = 'md',
  placeholder = 'user',
  disabled = false,
  className = '',
}: ImageUploadFieldProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    getOptimizedImageUrl(value) || null
  );

  // Update preview when value changes externally
  const handleValueChange = useCallback(() => {
    setPreviewUrl(getOptimizedImageUrl(value) || null);
  }, [value]);

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    setIsUploading(true);

    try {
      // Show local preview immediately for better UX
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Upload to storage
      const result = await uploadImage(file, userId, {
        bucket,
        folder,
        maxSizeMB,
      });

      if (!result.success) {
        toast.error(result.error || t('common.uploadFailed', 'اپ لوڈ ناکام'));
        setPreviewUrl(getOptimizedImageUrl(value) || null);
        return;
      }

      // Update with the actual URL
      setPreviewUrl(result.url!);
      onChange(result.url!);
      toast.success(t('common.uploadSuccess', 'تصویر اپ لوڈ ہو گئی!'));

      // Revoke local preview URL
      URL.revokeObjectURL(localPreview);

    } catch (error) {
      console.error('[ImageUploadField] Error:', error);
      toast.error(t('common.uploadFailed', 'اپ لوڈ ناکام'));
      setPreviewUrl(getOptimizedImageUrl(value) || null);
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle image removal
  const handleRemove = async () => {
    if (!previewUrl) return;

    try {
      // Only try to delete if it's a storage URL
      if (previewUrl.includes('supabase') && value) {
        await deleteImage(value, bucket);
      }
    } catch (error) {
      console.error('[ImageUploadField] Delete error:', error);
    }

    setPreviewUrl(null);
    onChange(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sizes = sizeClasses[size];
  const PlaceholderIcon = placeholder === 'user' ? User : ImageIcon;

  // Avatar variant - circular with camera button
  if (variant === 'avatar') {
    return (
      <div className={`relative inline-block ${className}`}>
        <div className={`${sizes.container} rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden border-4 border-primary/20 shadow-lg`}>
          {isUploading ? (
            <Loader2 className={`${sizes.icon} animate-spin text-primary`} />
          ) : previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Profile" 
              className="w-full h-full object-cover"
              onError={() => setPreviewUrl(null)}
            />
          ) : (
            <PlaceholderIcon className={`${sizes.icon} text-primary/50`} />
          )}
        </div>

        {/* Upload Button */}
        <button 
          className={`absolute bottom-0 right-0 ${sizes.button} rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform disabled:opacity-50`}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          type="button"
        >
          <Camera className="w-1/2 h-1/2" />
        </button>

        {/* Remove Button */}
        {previewUrl && !isUploading && (
          <button
            className="absolute top-0 right-0 w-6 h-6 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            onClick={handleRemove}
            type="button"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading || disabled}
        />
      </div>
    );
  }

  // Card variant - rectangular preview with upload zone
  if (variant === 'card') {
    return (
      <div className={`space-y-2 ${className}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading || disabled}
        />

        {previewUrl ? (
          <div className="relative">
            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => setPreviewUrl(null)}
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
              disabled={isUploading || disabled}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div
            onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
            className={`w-full h-48 rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 bg-muted/30 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {t('common.uploading', 'اپ لوڈ ہو رہا ہے...')}
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {t('common.uploadImage', 'تصویر اپ لوڈ کریں')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, WEBP ({maxSizeMB}MB تک)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={disabled}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {t('common.chooseFile', 'فائل منتخب کریں')}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Inline variant - simple button with preview
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {previewUrl && (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={() => setPreviewUrl(null)}
          />
          <button
            type="button"
            className="absolute top-0 right-0 w-5 h-5 bg-destructive rounded-full flex items-center justify-center"
            onClick={handleRemove}
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      )}
      
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || disabled}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        {previewUrl 
          ? t('common.changeImage', 'تصویر بدلیں')
          : t('common.uploadImage', 'تصویر اپ لوڈ کریں')
        }
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading || disabled}
      />
    </div>
  );
}
