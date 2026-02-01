import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getSignedR2Url, extractR2Key } from '@/lib/r2-storage';

// Signed URL expiration time: 15 minutes
// Shorter expiration improves security - URLs become invalid quickly if leaked
// The client-side hook auto-refreshes URLs before they expire
const DEFAULT_EXPIRES_IN = 900; // 15 minutes in seconds

// Internal request secret for server-to-server communication
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * Generate a presigned URL for authenticated access to R2 objects
 * 
 * Security Model:
 * - External requests: Require valid user session (NextAuth)
 * - Internal requests: Require INTERNAL_API_SECRET (for proxy-image, etc.)
 * - Signed URLs expire after 15 minutes for enhanced security
 * - Client-side hook auto-refreshes URLs before expiration
 * 
 * Access Categories:
 * - ai-images/*: AI-generated images (shared in chats, accessible to chat participants)
 * - uploads/*: User uploads (currently no per-user verification, rely on auth)
 * 
 * GET /api/r2/signed-url?key=ai-images/image.png
 * GET /api/r2/signed-url?key=ai-images/image.png&internalSecret=xxx (internal requests)
 * 
 * Returns: { signedUrl: string, expiresAt: string, key: string }
 */
export async function GET(request: NextRequest) {
    try {
        // Check for internal request (from proxy-image or other internal services)
        const { searchParams } = new URL(request.url);
        const internalSecret = searchParams.get('internalSecret');

        // Validate authentication: either session auth or internal secret
        if (internalSecret) {
            // Internal request - verify with secret
            const isDevelopment = process.env.NODE_ENV === 'development';
            const host = request.headers.get('host');
            const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');

            if (INTERNAL_SECRET) {
                if (internalSecret !== INTERNAL_SECRET) {
                    return NextResponse.json({ error: 'Forbidden - Invalid internal secret' }, { status: 403 });
                }
            } else if (!isDevelopment || !isLocalhost) {
                return NextResponse.json({ error: 'Forbidden - Internal requests require INTERNAL_API_SECRET' }, { status: 403 });
            }
            // Internal request validated
        } else {
            // External request - require session auth
            const session = await auth();
            if (!session || !session.user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        // Get the key from query params (reuse searchParams from above)
        const keyParam = searchParams.get('key');

        if (!keyParam) {
            return NextResponse.json(
                { error: 'Missing required parameter: key' },
                { status: 400 }
            );
        }

        // Extract the actual key (handles r2:// prefix, full URLs, etc.)
        const key = extractR2Key(keyParam);

        if (!key) {
            return NextResponse.json(
                { error: 'Invalid R2 key format' },
                { status: 400 }
            );
        }

        // Validate key format (basic security check)
        // Keys should be path-like and not contain suspicious characters
        if (key.includes('..') || key.startsWith('/') || /[<>"|?*]/.test(key)) {
            return NextResponse.json(
                { error: 'Invalid key format' },
                { status: 400 }
            );
        }

        // Generate signed URL
        const expiresIn = DEFAULT_EXPIRES_IN;
        const signedUrl = await getSignedR2Url(key, expiresIn);

        // Calculate expiration time
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        return NextResponse.json({
            signedUrl,
            expiresAt,
            key,
        });
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return NextResponse.json(
            { error: 'Failed to generate signed URL' },
            { status: 500 }
        );
    }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
