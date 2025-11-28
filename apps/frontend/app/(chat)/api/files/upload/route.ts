import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { validateImageFile, checkFileContent, checkImageMetadata } from '@/lib/security';

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

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size should be less than 10MB' },
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
        maxSize: 10 * 1024 * 1024,
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
      const blob = await put(file.name, fileBuffer, {
        access: 'public',
        // Add cache control to make URLs more persistent
        cacheControlMaxAge: 31536000, // 1 year
      });

      return NextResponse.json({
        url: blob.url,
        pathname: file.name,
        contentType: file.type,
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
