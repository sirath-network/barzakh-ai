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
      'r2.barzakh.tech',
      'r2.cloudflarestorage.com',
      // Vercel Blob Storage (legacy)
      'blob.vercel-storage.com',
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

    // Fetch the file
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
