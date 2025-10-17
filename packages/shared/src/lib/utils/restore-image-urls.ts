/**
 * Utility to restore original Vercel Blob URLs from message content
 * This fixes the issue where AI SDK converts Vercel Blob URLs to temporary Google AI URLs
 */

export function extractOriginalImageUrls(content: any): string[] {
  const originalUrls: string[] = [];
  
  if (Array.isArray(content)) {
    for (const part of content) {
      if (part.type === 'text' && typeof part.text === 'string') {
        // Look for embedded original URLs
        const match = part.text.match(/\[ORIGINAL_IMAGE_URLS_FOR_EDITING: ([^\]]+)\]/);
        if (match) {
          const urls = match[1].split(', ').map(url => url.trim()).filter(url => url);
          originalUrls.push(...urls);
        }
      }
    }
  } else if (typeof content === 'string') {
    const match = content.match(/\[ORIGINAL_IMAGE_URLS_FOR_EDITING: ([^\]]+)\]/);
    if (match) {
      const urls = match[1].split(', ').map(url => url.trim()).filter(url => url);
      originalUrls.push(...urls);
    }
  }
  
  return originalUrls;
}

export function restoreOriginalImageUrls(content: any): any {
  if (!Array.isArray(content)) {
    return content;
  }
  
  // Extract original Vercel Blob URLs
  const originalUrls = extractOriginalImageUrls(content);
  
  // Count existing images
  const imageCount = content.filter(part => part.type === 'image').length;
  
  if (originalUrls.length === 0) {
    // No metadata found, just return content as-is (URLs might already be correct)
    console.log('ℹ️  No URL restoration metadata found, keeping existing URLs');
    return content;
  }
  
  console.log(`🔗 Found ${originalUrls.length} original Vercel Blob URLs to restore for ${imageCount} images`);
  
  // Find and replace non-Vercel URLs with original Vercel Blob URLs
  let urlIndex = 0;
  const restoredContent = content.map(part => {
    // Remove the text part that contains the metadata
    if (part.type === 'text' && part.text?.includes('[ORIGINAL_IMAGE_URLS_FOR_EDITING:')) {
      const cleanedText = part.text.replace(/\n*\[ORIGINAL_IMAGE_URLS_FOR_EDITING: [^\]]+\]/g, '').trim();
      // Return null if text becomes empty after removing metadata
      if (!cleanedText) {
        return null;
      }
      return {
        ...part,
        text: cleanedText
      };
    }
    
    // Handle image URLs
    if (part.type === 'image' && part.image) {
      const isGoogleAIUrl = part.image.includes('generativelanguage.googleapis.com') ||
                           part.image.includes('generative-ai-image-store.googleapis.com');
      const isVercelBlob = part.image.includes('blob.vercel-storage.com');
      
      // Replace non-Vercel URLs with original Vercel Blob URLs
      if (!isVercelBlob && urlIndex < originalUrls.length) {
        const originalUrl = originalUrls[urlIndex];
        if (isGoogleAIUrl) {
          console.log(`✅ Restoring Google AI URL to Vercel Blob: ${part.image.substring(0, 50)}... → ${originalUrl}`);
        } else {
          console.log(`✅ Replacing URL with Vercel Blob: ${part.image.substring(0, 50)}... → ${originalUrl}`);
        }
        urlIndex++;
        return {
          ...part,
          image: originalUrl
        };
      } else if (isVercelBlob) {
        // Image is already a Vercel Blob URL, keep it
        console.log(`✓ Image already using Vercel Blob Storage: ${part.image.substring(0, 60)}...`);
        urlIndex++; // Still increment to match with metadata
        return part;
      }
    }
    
    return part;
  }).filter(part => {
    // Remove null parts and empty text parts
    return part !== null && !(part.type === 'text' && (!part.text || part.text.trim() === ''));
  });
  
  if (urlIndex > 0) {
    console.log(`✅ Successfully processed ${urlIndex} image URLs for permanent storage`);
  }
  
  return restoredContent;
}

/**
 * Clean tool results to ensure they have permanent Vercel Blob URLs
 * Tool results from createImage contain imageUrls that should already be persisted
 */
export function cleanToolResult(result: any): any {
  if (!result || typeof result !== 'object') {
    return result;
  }
  
  // Check if this is an image generation result
  if (result.imageUrls && Array.isArray(result.imageUrls)) {
    console.log(`🖼️  Processing tool result with ${result.imageUrls.length} image URLs`);
    
    // Check if URLs are already Vercel Blob URLs
    const allVercelBlob = result.imageUrls.every((url: string) => 
      url.includes('blob.vercel-storage.com')
    );
    
    if (allVercelBlob) {
      console.log('✅ All tool result images already using Vercel Blob Storage');
      return result;
    }
    
    // If any URLs are NOT Vercel Blob, log a warning
    const nonVercelUrls = result.imageUrls.filter((url: string) => 
      !url.includes('blob.vercel-storage.com')
    );
    if (nonVercelUrls.length > 0) {
      console.warn('⚠️  Tool result contains non-Vercel Blob URLs:', nonVercelUrls);
      console.warn('⚠️  These URLs may expire! This suggests persistence failed.');
    }
  }
  
  return result;
}

/**
 * Clean message content before saving to database
 * - Restores original Vercel Blob URLs for user images
 * - Removes metadata markers
 * - Validates tool results have permanent URLs
 */
export function cleanMessageContentForStorage(content: any): any {
  // Handle array content (user messages with images)
  if (Array.isArray(content)) {
    const cleaned = restoreOriginalImageUrls(content);
    
    // Also check for tool-result parts
    const cleanedWithToolResults = cleaned.map((part: any) => {
      if (part.type === 'tool-result' && part.result) {
        return {
          ...part,
          result: cleanToolResult(part.result)
        };
      }
      return part;
    });
    
    return cleanedWithToolResults;
  }
  
  // Handle string content (simple text messages)
  if (typeof content === 'string') {
    return content;
  }
  
  // Handle object content (might be a tool result directly)
  return content;
}

