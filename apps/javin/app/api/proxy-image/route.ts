import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, mobile = false, forceDownload = false } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Only allow HTTPS URLs for security
    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only HTTPS URLs are allowed' }, { status: 400 });
    }

    // Fetch the image
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Barzakh-Image-Proxy/1.0)',
        'Accept': 'image/*',
        'Cache-Control': 'no-cache'
      },
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // For mobile downloads, we need to ensure proper headers
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', imageBuffer.byteLength.toString());
    
    if (mobile || forceDownload) {
      // Set headers to force download on mobile
      const filename = `ai-generated-image-${Date.now()}.${getFileExtension(contentType)}`;
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
    } else {
      // For regular viewing
      headers.set('Content-Disposition', 'inline');
      headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    }

    // Add CORS headers for mobile compatibility
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return new NextResponse(imageBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Proxy image error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({ error: 'Request timeout' }, { status: 408 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function getFileExtension(contentType: string): string {
  const extensions: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/tiff': 'tiff',
  };
  
  return extensions[contentType.toLowerCase()] || 'jpg';
}
