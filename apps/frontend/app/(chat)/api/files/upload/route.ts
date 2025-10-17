import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';

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
