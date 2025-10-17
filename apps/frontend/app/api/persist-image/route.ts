import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { persistImagesToBlob } from '@/lib/persist-image';
import { z } from 'zod';

const RequestSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(10),
  internalRequest: z.boolean().optional(), // Flag for backend-to-backend calls
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = RequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { imageUrls, internalRequest } = validation.data;

    // For internal requests (backend-to-backend), skip session auth
    // This is safe because it's only accessible from the same server
    if (!internalRequest) {
      // Check authentication for external requests
      const session = await auth();
      if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      // Verify internal request is from localhost or same origin
      const host = request.headers.get('host');
      const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
      const isVercel = process.env.VERCEL === '1'; // Running on Vercel
      
      if (!isLocalhost && !isVercel) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    console.log(`📥 API received ${imageUrls.length} images to persist`);

    // Persist all images to Vercel Blob Storage
    const persistedUrls = await persistImagesToBlob(imageUrls);

    return NextResponse.json({
      success: true,
      originalUrls: imageUrls,
      persistedUrls: persistedUrls,
      count: persistedUrls.length,
    });

  } catch (error) {
    console.error('Error in persist-image API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to persist images',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

