// Utility functions for handling image storage and URL expiration

export interface ImageUrlInfo {
  url: string;
  isExpired: boolean;
  expiresAt?: Date;
  provider?: 'openai' | 'other';
}

/**
 * Check if a signed URL has expired
 */
export function checkUrlExpiration(url: string): ImageUrlInfo {
  try {
    const urlObj = new URL(url);
    
    // Check for Google Cloud Storage signed URL (commonly used by image providers)
    const expiresParam = urlObj.searchParams.get('X-Goog-Expires');
    const dateParam = urlObj.searchParams.get('X-Goog-Date');
    
    if (expiresParam && dateParam) {
      const expiresSeconds = parseInt(expiresParam);
      const dateString = dateParam;
      
      // Parse the date (format: 20251002T105346Z) - this is UTC
      const year = parseInt(dateString.substring(0, 4));
      const month = parseInt(dateString.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dateString.substring(6, 8));
      const hour = parseInt(dateString.substring(9, 11));
      const minute = parseInt(dateString.substring(11, 13));
      const second = parseInt(dateString.substring(13, 15));
      
      // Create UTC date to match the signed date format
      const signedDate = new Date(Date.UTC(year, month, day, hour, minute, second));
      const expirationDate = new Date(signedDate.getTime() + (expiresSeconds * 1000));
      const isExpired = new Date() > expirationDate;
      
      // Debug logging to help troubleshoot
      if (process.env.NODE_ENV === 'development') {
        console.log('URL Expiration Check:', {
          dateString,
          signedDate: signedDate.toISOString(),
          expirationDate: expirationDate.toISOString(),
          currentTime: new Date().toISOString(),
          isExpired,
          timeLeft: expirationDate.getTime() - new Date().getTime()
        });
      }
      
      return {
        url,
        isExpired,
        expiresAt: expirationDate,
        provider: 'other'
      };
    }
    
    // Check for other signed URL formats (AWS S3, etc.)
    const expires = urlObj.searchParams.get('Expires');
    if (expires) {
      const expirationDate = new Date(parseInt(expires) * 1000);
      const isExpired = new Date() > expirationDate;
      
      return {
        url,
        isExpired,
        expiresAt: expirationDate,
        provider: 'other'
      };
    }
    
    // No expiration found, assume it's permanent
    return {
      url,
      isExpired: false,
      provider: 'other'
    };
    
  } catch (error) {
    console.error('Error checking URL expiration:', error);
    return {
      url,
      isExpired: false,
      provider: 'other'
    };
  }
}

/**
 * Get time remaining until URL expires
 */
export function getTimeUntilExpiration(url: string): string | null {
  const info = checkUrlExpiration(url);
  
  if (!info.expiresAt || info.isExpired) {
    return null;
  }
  
  const now = new Date();
  const timeLeft = info.expiresAt.getTime() - now.getTime();
  
  const minutes = Math.floor(timeLeft / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Check if URL should show expiration warning (less than 10 minutes left)
 */
export function shouldShowExpirationWarning(url: string): boolean {
  const info = checkUrlExpiration(url);
  
  if (!info.expiresAt || info.isExpired) {
    return false;
  }
  
  const now = new Date();
  const timeLeft = info.expiresAt.getTime() - now.getTime();
  const minutesLeft = timeLeft / (1000 * 60);
  
  return minutesLeft <= 10; // Show warning if less than 10 minutes left
}
