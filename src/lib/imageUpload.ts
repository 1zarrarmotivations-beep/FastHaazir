/**
 * Centralized Image Upload Utility
 * Handles all image uploads with validation, error handling, and cache-busting
 */

import { supabase } from "@/integrations/supabase/client";

export type ImageBucket = 'profile-images' | 'business-images' | 'menu-images' | 'fasthaazirmanu';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface UploadOptions {
  bucket: ImageBucket;
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

const DEFAULT_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const DEFAULT_MAX_SIZE_MB = 5;

/**
 * Validate image file before upload
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = DEFAULT_MAX_SIZE_MB,
  allowedTypes: string[] = DEFAULT_ALLOWED_TYPES
): { valid: boolean; error?: string } {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`
    };
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB (current: ${fileSizeMB.toFixed(1)}MB)`
    };
  }

  return { valid: true };
}

/**
 * Generate a unique file path for upload
 */
export function generateFilePath(userId: string, file: File, folder?: string): string {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileName = `${userId}-${timestamp}-${randomSuffix}.${fileExt}`;
  
  return folder ? `${folder}/${fileName}` : fileName;
}

/**
 * Upload an image to Supabase Storage
 * Returns the full public URL on success
 */
export async function uploadImage(
  file: File,
  userId: string,
  options: UploadOptions
): Promise<UploadResult> {
  const { 
    bucket, 
    folder, 
    maxSizeMB = DEFAULT_MAX_SIZE_MB, 
    allowedTypes = DEFAULT_ALLOWED_TYPES 
  } = options;

  // Validate file
  const validation = validateImageFile(file, maxSizeMB, allowedTypes);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Generate unique file path
  const filePath = generateFilePath(userId, file, folder);

  try {
    // Upload to Supabase Storage with upsert to handle re-uploads
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('[ImageUpload] Upload error:', uploadError);
      return { 
        success: false, 
        error: uploadError.message || 'Upload failed' 
      };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return { 
        success: false, 
        error: 'Failed to get public URL' 
      };
    }

    // Add cache-busting parameter to ensure fresh images
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    console.log('[ImageUpload] Success:', { bucket, filePath, publicUrl });
    return { success: true, url: publicUrl };

  } catch (error) {
    console.error('[ImageUpload] Exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImage(
  imageUrl: string,
  bucket: ImageBucket
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl.split('?')[0]); // Remove query params
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === bucket);
    
    if (bucketIndex === -1) {
      return { success: false, error: 'Invalid image URL' };
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');
    
    if (!filePath) {
      return { success: false, error: 'Could not extract file path' };
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('[ImageUpload] Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };

  } catch (error) {
    console.error('[ImageUpload] Delete exception:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Ensure image URL is absolute (for production compatibility)
 */
export function ensureAbsoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Relative URL - this shouldn't happen with proper uploads
  console.warn('[ImageUpload] Received relative URL:', url);
  return undefined;
}

/**
 * Get optimized image URL with optional transformations
 * Note: Supabase Storage doesn't support transformations on free tier
 * This just ensures the URL is valid and adds cache-busting
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  cacheBust: boolean = false
): string | undefined {
  const absoluteUrl = ensureAbsoluteUrl(url);
  if (!absoluteUrl) return undefined;
  
  // Remove existing query params and add fresh cache-bust if needed
  const baseUrl = absoluteUrl.split('?')[0];
  
  if (cacheBust) {
    return `${baseUrl}?t=${Date.now()}`;
  }
  
  return baseUrl;
}
