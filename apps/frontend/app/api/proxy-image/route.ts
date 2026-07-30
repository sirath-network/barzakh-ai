import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';

// Internal request secret for server-to-server communication
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, mobile = false, forceDownload = false, internalSecret } = body;

    // Check if this is an internal request (has internalSecret)
    const isInternalRequest = !!internalSecret;

    // For internal requests (backend-to-backend), verify with secret
    // This allows the createImage tool to fetch images for editing
    if (!isInternalRequest) {
      // Check authentication for external requests
      const session = await auth();
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      // SECURITY: Verify internal request with secret (not spoofable Host header)
      // Fall back to localhost check only in development if secret not set
      const isDevelopment = process.env.NODE_ENV === 'development';
      const host = request.headers.get('host');
      const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');

      if (INTERNAL_SECRET) {
        // Production: require matching secret
        if (internalSecret !== INTERNAL_SECRET) {
          return NextResponse.json({ error: 'Forbidden - Invalid internal secret' }, { status: 403 });
        }
      } else if (!isDevelopment || !isLocalhost) {
        // No secret configured and not development localhost - deny
        return NextResponse.json({ error: 'Forbidden - Internal requests require INTERNAL_API_SECRET' }, { status: 403 });
      }
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Security: Only allow certain domains or protocols
    const allowedDomains = [
      // Cloudflare R2 Storage (primary storage)
      'r2.sirath.network',
      'r2.cloudflarestorage.com',
      'cloudflarestorage.com', // For signed URLs
      'pub-', // R2 public bucket subdomain pattern

      // Firebase Storage
      'firebasestorage.googleapis.com',

      // OpenAI Services
      'oaidalleapiprodscus.blob.core.windows.net',
      'cdn.openai.com',
      'openai.com',

      // Stability AI
      'api.stability.ai',
      'stability.ai',

      // Midjourney (if using their API)
      'cdn.midjourney.com',
      'midjourney.com',

      // Replicate
      'replicate.delivery',
      'pbxt.replicate.delivery',
      'tjzk.replicate.delivery',

      // Hugging Face
      'huggingface.co',
      'hf.co',

      // Anthropic Claude (if they have image generation)
      'anthropic.com',
      'claude.ai',

      // Google AI
      'googleapis.com',
      'googleusercontent.com',
      'generative-ai-image-store.googleapis.com',
      'generativelanguage.googleapis.com',
      'storage.googleapis.com',

      // Azure AI Services
      'cognitiveservices.azure.com',
      'azure.com',

      // AWS AI Services
      'amazonaws.com',
      's3.amazonaws.com',

      // EPAM Services
      'r2.src.epam.com',
      'epam.com',

      // GSW Services
      'r2.gsw.io',
      'gsw.io',

      // Whatz AI Services
      'r2.src.whatz.ai',
      'whatz.ai',

      // Common CDNs and image hosts
      'cloudflare.com',
      'cloudinary.com',
      'imgur.com',
      'images.unsplash.com',
      'picsum.photos',

      // Development/Testing
      'localhost',
      '127.0.0.1',

      // Ngrok tunnels (for mobile testing)
      'ngrok.io',
      'ngrok-free.app',
      'ngrok.app'
    ];

    const url = new URL(imageUrl);
    const isDataUrl = imageUrl.startsWith('data:');

    // SECURITY: Strict domain matching to prevent SSRF bypass
    // Only allow exact match or proper subdomain match (e.g., cdn.example.com for example.com)
    const isAllowedDomain = allowedDomains.some(domain => {
      const hostname = url.hostname.toLowerCase();
      const domainLower = domain.toLowerCase();

      return (
        hostname === domainLower ||                    // exact match
        hostname.endsWith('.' + domainLower)          // proper subdomain match only
      );
    });

    // Only allow localhost bypass in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isLocalhost = (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.endsWith('.local'));

    if (!isDataUrl && !isAllowedDomain && !(isDevelopment && isLocalhost)) {
      console.warn(`Blocked domain for proxy download: ${url.hostname} (full URL: ${imageUrl})`);
      console.warn('Allowed domains:', allowedDomains);

      return NextResponse.json({
        error: `Domain not allowed for proxy download: ${url.hostname}. Please contact support to whitelist this domain.`
      }, { status: 403 });
    }

    // Handle data URLs directly
    if (isDataUrl) {
      const [header, data] = imageUrl.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      const buffer = Buffer.from(data, 'base64');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }

    // ============================================
    // HANDLE LEGACY r2.sirath.network URLs
    // This domain no longer exists, redirect to signed URL API
    // ============================================
    if (url.hostname === 'r2.sirath.network') {
      console.log('[proxy-image] Legacy r2.sirath.network URL detected, using signed URL...');

      // Extract the key from the legacy URL
      const legacyKey = url.pathname.slice(1); // Remove leading slash

      // Get signed URL from our API (use internal secret for server-to-server auth)
      const internalSecret = process.env.INTERNAL_API_SECRET || 'dev-internal-secret';
      const signedUrlResponse = await fetch(
        new URL('/api/r2/signed-url', request.url).toString() +
        `?key=${encodeURIComponent(legacyKey)}&internalSecret=${encodeURIComponent(internalSecret)}`
      );

      if (!signedUrlResponse.ok) {
        console.error('[proxy-image] Failed to get signed URL for legacy R2 key:', legacyKey);
        return NextResponse.json({ error: 'Failed to access R2 storage' }, { status: 500 });
      }

      const signedUrlData = await signedUrlResponse.json();
      const signedUrl = signedUrlData.signedUrl;

      if (!signedUrl) {
        return NextResponse.json({ error: 'Failed to get signed URL' }, { status: 500 });
      }

      // Fetch from the signed URL instead
      const signedResponse = await fetch(signedUrl, {
        signal: AbortSignal.timeout(mobile ? 45000 : 30000),
      });

      if (!signedResponse.ok) {
        return NextResponse.json({ error: `R2 fetch failed: ${signedResponse.status}` }, { status: signedResponse.status });
      }

      const imageBuffer = Buffer.from(await signedResponse.arrayBuffer());
      const contentType = signedResponse.headers.get('Content-Type') || 'image/png';

      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': imageBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour (signed URL lifetime)
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Fetch the image from external URL with mobile-optimized headers
    const fetchHeaders: Record<string, string> = {
      'User-Agent': mobile
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
      'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': mobile ? 'no-cache, no-store, must-revalidate' : 'no-cache',
      'Pragma': 'no-cache',
      // Add ngrok-specific headers
      'ngrok-skip-browser-warning': 'true',
    };

    // Add additional headers for ngrok tunnels
    if (url.hostname.includes('ngrok')) {
      fetchHeaders['X-Forwarded-Proto'] = 'https';
      fetchHeaders['X-Forwarded-Host'] = url.hostname;
    }

    const imageResponse = await fetch(imageUrl, {
      headers: fetchHeaders,
      // Add timeout for mobile connections (longer for mobile)
      signal: AbortSignal.timeout(mobile ? 45000 : 30000),
    });

    if (!imageResponse.ok) {
      return NextResponse.json({
        error: `Failed to fetch image: ${imageResponse.status}`
      }, { status: 502 });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    // Validate it's actually an image
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({
        error: 'URL does not point to an image'
      }, { status: 400 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Prepare headers based on mobile/download preferences
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Length': imageBuffer.byteLength.toString(),
      'Cache-Control': mobile ? 'no-cache, no-store, must-revalidate' : 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
    };

    // Add mobile-optimized headers
    if (mobile) {
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }

    // Force download headers if requested
    if (forceDownload) {
      const filename = `ai-generated-image-${Date.now()}.jpg`;
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
      headers['Content-Transfer-Encoding'] = 'binary';
    } else if (mobile) {
      // For mobile, suggest filename but don't force attachment
      headers['Content-Disposition'] = 'inline; filename="ai-generated-image.jpg"';
    }

    return new NextResponse(imageBuffer, { headers });

  } catch (error) {
    console.error('Proxy image error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
