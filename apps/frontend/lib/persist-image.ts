import { uploadToR2, isR2Url } from './r2-storage';

/**
 * Downloads an image from a temporary URL and uploads it to Cloudflare R2 Storage
 * for permanent persistence
 * @param imageUrl - The temporary image URL to persist
 * @param filename - Optional custom filename
 * @returns The permanent R2 URL
 */
export async function persistImageToBlob(
  imageUrl: string,
  filename?: string
): Promise<string> {
  try {
    // If it's already an R2 URL, return it as-is
    if (isR2Url(imageUrl)) {
      console.log('✅ Image already in R2 Storage:', imageUrl);
      return imageUrl;
    }
    
    // Also check for legacy Cloudflare R2 Storage URL
    if (imageUrl.includes('blob.vercel-storage.com')) {
      console.log('✅ Image in Vercel Blob Storage (legacy):', imageUrl);
      return imageUrl;
    }

    console.log('📥 Downloading temporary image for persistence:', imageUrl);
    
    // Download the image
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';
    
    // Determine file extension from content type
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    };
    
    const extension = extensionMap[contentType] || 'png';
    
    // Generate a unique filename if not provided
    const finalFilename = filename || `ai-generated-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    
    console.log(`📤 Uploading to Cloudflare R2 Storage: ${finalFilename}`);
    
    // Upload to Cloudflare R2 Storage
    const result = await uploadToR2(finalFilename, imageBuffer, {
      contentType: contentType,
      folder: 'ai-images',
      cacheControl: 'public, max-age=31536000', // 1 year
    });

    console.log('✅ Successfully persisted image to R2:', result.url);
    
    return result.url;
  } catch (error) {
    console.error('❌ Failed to persist image to R2:', error);
    // Return original URL as fallback
    console.warn('⚠️ Falling back to original URL (may expire):', imageUrl);
    return imageUrl;
  }
}

/**
 * Batch persist multiple images to Cloudflare R2 Storage
 * @param imageUrls - Array of temporary image URLs
 * @returns Array of permanent R2 URLs
 */
export async function persistImagesToBlob(imageUrls: string[]): Promise<string[]> {
  console.log(`🔄 Persisting ${imageUrls.length} images to Cloudflare R2 Storage...`);
  
  const results = await Promise.allSettled(
    imageUrls.map((url, index) => 
      persistImageToBlob(url, `ai-generated-${Date.now()}-${index}.png`)
    )
  );

  const persistedUrls = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.error(`Failed to persist image ${index + 1}:`, result.reason);
      // Return original URL as fallback
      return imageUrls[index];
    }
  });

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  console.log(`✅ Successfully persisted ${successCount}/${imageUrls.length} images`);

  return persistedUrls;
}

