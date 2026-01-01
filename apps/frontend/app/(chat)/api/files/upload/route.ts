import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import {
  validateImageFile,
  checkFileContent,
  checkImageMetadata,
  detectPolyglotAttack,
  scanImageMetadata,
} from '@/lib/security';
import { uploadToR2 } from '@/lib/r2-storage';

// Next.js 15+ App Router route segment config
// Note: Body size limits are handled at the application level, not route config
export const maxDuration = 60; // 60 seconds timeout for large uploads
export const dynamic = 'force-dynamic';

const FileSchema = z.object({
  file: z.any(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!request.body) {
    return NextResponse.json({ error: 'Request body is empty' }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    // Duck-typing the file object to avoid ReferenceError: File is not defined
    // in server environments where the File constructor may not be globally available.
    if (!file || typeof file === 'string' || !('size' in file) || !('type' in file) || !('name' in file)) {
      return NextResponse.json({ error: 'Invalid file upload' }, { status: 400 });
    }

    // Cloudflare R2 supports much larger files than Vercel Blob
    // Setting limit to 25MB for user uploads
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size should be less than 25MB' },
        { status: 400 },
      );
    }

    // Define supported file types for programming languages and common formats
    const supportedExtensions = [
      // Programming languages
      'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt',
      'html', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
      // Data formats
      'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
      // Text formats
      'txt', 'md', 'markdown', 'csv', 'tsv', 'log',
      // Documents
      'pdf', 'doc', 'docx', 'rtf',
      // Images (already supported)
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
      // Archives
      'zip', 'rar', '7z', 'tar', 'gz',
      // Other
      'sql', 'sh', 'bat', 'ps1', 'dockerfile', 'gitignore', 'env'
    ];

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !supportedExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Unsupported file type. Supported types: ${supportedExtensions.join(', ')}` },
        { status: 400 },
      );
    }

    // ===========================================
    // SECURITY CHECK: File Content Validation
    // ===========================================
    const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'].includes(fileExtension);

    if (isImageFile) {
      // Validate image file (magic bytes, SVG scripts, etc.)
      const imageSecurityCheck = await validateImageFile(file as File, {
        maxSize: MAX_FILE_SIZE,
        checkMagicBytes: true,
      });

      if (!imageSecurityCheck.safe) {
        console.warn(`[SECURITY] Blocked malicious image upload from user ${session.user?.id}:`, {
          filename: file.name,
          threats: imageSecurityCheck.threats.map(t => ({ type: t.type, description: t.description })),
          riskScore: imageSecurityCheck.riskScore,
        });
        return NextResponse.json(
          {
            error: 'Security violation detected in uploaded image',
            details: imageSecurityCheck.threats[0]?.description || 'File validation failed',
          },
          { status: 400 }
        );
      }

      // =====================================================
      // POLYGLOT ATTACK DETECTION
      // Detects files that are valid in multiple formats
      // (e.g., an image that's also a valid PHP/JS/HTML file)
      // =====================================================
      const polyglotCheck = await detectPolyglotAttack(file as File);
      if (!polyglotCheck.safe) {
        console.warn(`[AI-SECURITY] Blocked polyglot attack from user ${session.user?.id}:`, {
          filename: file.name,
          threats: polyglotCheck.threats.map(t => ({ type: t.type, description: t.description })),
          riskScore: polyglotCheck.riskScore,
        });
        return NextResponse.json(
          {
            error: 'Security violation: File format mismatch detected',
            details: 'The uploaded file appears to contain embedded code or scripts.',
          },
          { status: 400 }
        );
      }

      // =====================================================
      // DEEP METADATA SCAN FOR AI PROMPT INJECTION
      // Scans EXIF, IPTC, XMP, ICC profiles for hidden payloads
      // that could manipulate AI behavior
      // =====================================================
      const deepMetadataScan = await scanImageMetadata(file as File);
      if (!deepMetadataScan.safe) {
        console.warn(`[AI-SECURITY] Blocked metadata injection from user ${session.user?.id}:`, {
          filename: file.name,
          threats: deepMetadataScan.threats.map(t => ({ type: t.type, description: t.description })),
          riskScore: deepMetadataScan.riskScore,
        });
        return NextResponse.json(
          {
            error: 'Security violation detected in image metadata',
            details: 'The image contains suspicious data that could affect AI processing.',
          },
          { status: 400 }
        );
      }

      // Also check image metadata for hidden payloads (polyglots, embedded scripts)
      const metadataCheck = await checkImageMetadata(file as File);
      if (!metadataCheck.safe) {
        console.warn(`[SECURITY] Blocked image with suspicious metadata from user ${session.user?.id}:`, {
          filename: file.name,
          threats: metadataCheck.threats.map(t => ({ type: t.type, description: t.description })),
          riskScore: metadataCheck.riskScore,
        });
        return NextResponse.json(
          {
            error: 'Security violation detected in image metadata',
            details: metadataCheck.threats[0]?.description || 'Metadata validation failed',
          },
          { status: 400 }
        );
      }
    } else {
      // For text-based files, check content for malicious patterns
      const textExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'html', 'txt', 'md', 'json', 'xml', 'yaml', 'yml', 'sql', 'sh', 'bat', 'ps1'];

      if (textExtensions.includes(fileExtension)) {
        try {
          const textContent = await (file as File).text();
          const contentSecurityCheck = checkFileContent(file.name, textContent);

          if (!contentSecurityCheck.safe) {
            console.warn(`[SECURITY] Blocked file with suspicious content from user ${session.user?.id}:`, {
              filename: file.name,
              threats: contentSecurityCheck.threats.map(t => ({ type: t.type, description: t.description })),
              riskScore: contentSecurityCheck.riskScore,
            });
            return NextResponse.json(
              {
                error: 'Security violation detected in file content',
                details: contentSecurityCheck.threats[0]?.description || 'Content validation failed',
              },
              { status: 400 }
            );
          }
        } catch (readError) {
          // If we can't read the file as text, continue with upload
          console.warn('Could not read file as text for security check:', readError);
        }
      }
    }
    // ===========================================

    const fileBuffer = await file.arrayBuffer();

    try {
      // Generate a unique filename to avoid collisions
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFilename = `${timestamp}-${randomSuffix}-${sanitizedName}`;

      const result = await uploadToR2(uniqueFilename, fileBuffer, {
        contentType: file.type,
        folder: 'uploads', // Organize uploads in a folder
        cacheControl: 'public, max-age=31536000', // 1 year cache
      });

      return NextResponse.json({
        url: result.url,
        pathname: file.name,
        contentType: result.contentType,
        extension: file.name.split('.').pop() || null,
      });
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
