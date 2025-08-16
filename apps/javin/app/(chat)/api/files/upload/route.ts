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

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size should be less than 5MB' },
        { status: 400 },
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const filename = file.name;

    try {
      const blob = await put(filename, fileBuffer, {
        access: 'public',
      });

      return NextResponse.json({
        url: blob.url,
        pathname: filename,
        contentType: file.type,
        extension: filename.split('.').pop() || null,
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
