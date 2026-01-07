import { uploadToR2, isR2Url } from './r2-storage';

/**
 * Downloads an image from a temporary URL and uploads it to Cloudflare R2 Storage
 * for permanent persistence. Also handles data URLs (base64 encoded images).
 * @param imageUrl - The temporary image URL or data URL to persist
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
      return imageUrl;
    }

    let imageBuffer: ArrayBuffer;
    let contentType: string;

    // Handle data URLs (base64 encoded images)
    if (imageUrl.startsWith('data:')) {

      const [header, data] = imageUrl.split(',');
      if (!header || !data) {
        throw new Error('Invalid data URL format');
      }

      const mimeMatch = header.match(/data:([^;]+)/);
      contentType = mimeMatch ? mimeMatch[1] : 'image/png';

      // Convert base64 to buffer
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      imageBuffer = bytes.buffer;
    } else {
      // Handle HTTP URLs
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      imageBuffer = await response.arrayBuffer();
      contentType = response.headers.get('content-type') || 'image/png';
    }

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

    // Upload to Cloudflare R2 Storage
    const result = await uploadToR2(finalFilename, imageBuffer, {
      contentType: contentType,
      folder: 'ai-images',
      cacheControl: 'public, max-age=31536000', // 1 year
    });

    return result.url;
  } catch (error) {
    console.error('Failed to persist image to R2:', error);
    // Return original URL as fallback
    return imageUrl;
  }
}

/**
 * Batch persist multiple images to Cloudflare R2 Storage
 * @param imageUrls - Array of temporary image URLs
 * @returns Array of permanent R2 URLs
 */
export async function persistImagesToBlob(imageUrls: string[]): Promise<string[]> {
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

  return persistedUrls;
}

