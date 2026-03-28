import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fileUrl } = body;

    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(fileUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Security: Only allow certain domains
    const allowedDomains = [
      // Cloudflare R2 Storage (primary)
      'r2.barzakh.tech', // Legacy custom domain
      'r2.cloudflarestorage.com', // New R2 endpoint
      'cloudflarestorage.com', // For signed URLs
      // Development
      'localhost',
      '127.0.0.1',
    ];

    const url = new URL(fileUrl);
    const isAllowedDomain = allowedDomains.some(domain =>
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowedDomain) {
      return NextResponse.json(
        { error: `Domain not allowed: ${url.hostname}` },
        { status: 403 }
      );
    }

    // Handle legacy r2.barzakh.tech URLs via signed URL resolution
    if (url.hostname === 'r2.barzakh.tech') {
      const legacyKey = url.pathname.slice(1); // Remove leading slash
      const internalSecret = process.env.INTERNAL_API_SECRET || 'dev-internal-secret';
      const signedUrlResponse = await fetch(
        new URL('/api/r2/signed-url', request.url).toString() +
        `?key=${encodeURIComponent(legacyKey)}&internalSecret=${encodeURIComponent(internalSecret)}`
      );

      if (!signedUrlResponse.ok) {
        return NextResponse.json({ error: 'Failed to resolve R2 URL' }, { status: 500 });
      }

      const signedUrlData = await signedUrlResponse.json();
      const signedUrl = signedUrlData.signedUrl;
      if (!signedUrl) {
        return NextResponse.json({ error: 'Failed to get signed URL' }, { status: 500 });
      }

      const fileResponse = await fetch(signedUrl, {
        signal: AbortSignal.timeout(30000),
      });

      if (!fileResponse.ok) {
        return NextResponse.json(
          { error: `Failed to fetch file: ${fileResponse.status}` },
          { status: fileResponse.status }
        );
      }

      const content = await fileResponse.text();
      const contentType = fileResponse.headers.get('content-type') || 'text/plain';

      return new NextResponse(content, {
        status: 200,
        headers: { 'Content-Type': contentType },
      });
    }

    // Fetch the file directly for non-legacy URLs
    const response = await fetch(fileUrl, {
      headers: {
        'Accept': 'text/plain, application/json, text/*, */*',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.status}` },
        { status: response.status }
      );
    }

    const content = await response.text();
    const contentType = response.headers.get('content-type') || 'text/plain';

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    });

  } catch (error) {
    console.error('Proxy file error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy file' },
      { status: 500 }
    );
  }
}
