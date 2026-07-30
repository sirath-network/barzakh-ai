import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 uses S3-compatible API
// Required env vars:
//   R2_ACCOUNT_ID - Your Cloudflare account ID
//   R2_ACCESS_KEY_ID - R2 API token access key
//   R2_SECRET_ACCESS_KEY - R2 API token secret key
//   R2_BUCKET_NAME - Your R2 bucket name
//   R2_PUBLIC_URL - Your R2 bucket public URL (e.g., https://files.yourdomain.com or R2.dev subdomain)

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Lazy initialization to avoid errors when env vars aren't set
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('Missing R2 configuration. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.');
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export interface R2UploadResult {
  url: string;
  pathname: string;
  contentType: string;
}

/**
 * Upload a file to Cloudflare R2 storage
 * @param filename - The filename to use in R2
 * @param data - The file data (Buffer, ArrayBuffer, Uint8Array, or string)
 * @param options - Upload options
 * @returns The public URL and metadata
 */
export async function uploadToR2(
  filename: string,
  data: Buffer | ArrayBuffer | Uint8Array | string,
  options: {
    contentType?: string;
    folder?: string;
    cacheControl?: string;
  } = {}
): Promise<R2UploadResult> {
  if (!R2_BUCKET_NAME) {
    throw new Error('R2_BUCKET_NAME environment variable is not set');
  }

  if (!R2_PUBLIC_URL) {
    throw new Error('R2_PUBLIC_URL environment variable is not set');
  }

  const client = getS3Client();

  // Build the key (path in bucket)
  const key = options.folder ? `${options.folder}/${filename}` : filename;

  // Convert data to Buffer if needed
  let body: Buffer;
  if (typeof data === 'string') {
    body = Buffer.from(data);
  } else if (data instanceof ArrayBuffer) {
    body = Buffer.from(data);
  } else if (data instanceof Uint8Array) {
    body = Buffer.from(data);
  } else {
    body = data;
  }

  // Determine content type
  const contentType = options.contentType || getMimeType(filename);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: options.cacheControl || 'public, max-age=31536000', // 1 year cache
  });

  await client.send(command);

  // Construct the public URL
  const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;

  return {
    url: publicUrl,
    pathname: key,
    contentType,
  };
}

/**
 * Delete a file from Cloudflare R2 storage
 * @param key - The file key/path in R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (!R2_BUCKET_NAME) {
    throw new Error('R2_BUCKET_NAME environment variable is not set');
  }

  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await client.send(command);
}

/**
 * Check if R2 is properly configured
 */
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME && R2_PUBLIC_URL);
}

/**
 * Get the public URL for an R2 object
 */
export function getR2PublicUrl(key: string): string {
  if (!R2_PUBLIC_URL) {
    throw new Error('R2_PUBLIC_URL environment variable is not set');
  }
  return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
}

/**
 * Check if a URL is from our R2 storage or is an R2 key
 */
export function isR2Url(url: string): boolean {
  if (!url) return false;
  // Check for r2:// prefix (used for stored keys)
  if (url.startsWith('r2://')) return true;
  // Check for R2 cloudflarestorage.com domain (new format)
  if (url.includes('.r2.cloudflarestorage.com')) return true;
  // Check for public URL env var
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) return true;
  // Check for legacy R2 custom domain (backward compatibility)
  if (url.includes('r2.sirath.network')) return true;
  return false;
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'bmp': 'image/bmp',
    'avif': 'image/avif',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Text
    'txt': 'text/plain',
    'md': 'text/markdown',
    'html': 'text/html',
    'css': 'text/css',
    'csv': 'text/csv',
    // Code
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'jsx': 'text/javascript',
    'tsx': 'text/typescript',
    'json': 'application/json',
    'xml': 'application/xml',
    'yaml': 'text/yaml',
    'yml': 'text/yaml',
    // Archives
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    // Default
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Generate a presigned URL for reading an R2 object
 * @param key - The object key in R2 (e.g., 'ai-images/image.png')
 * @param expiresIn - Time in seconds until the URL expires (default: 3600 = 1 hour)
 * @returns A presigned URL that grants temporary read access
 */
export async function getSignedR2Url(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!R2_BUCKET_NAME) {
    throw new Error('R2_BUCKET_NAME environment variable is not set');
  }

  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  const signedUrl = await getSignedUrl(client, command, { expiresIn });
  return signedUrl;
}

/**
 * Extract the R2 object key from a URL or r2:// prefixed key
 * @param urlOrKey - Either a full R2 URL, r2:// prefixed key, or raw key
 * @returns The object key (e.g., 'ai-images/image.png')
 */
export function extractR2Key(urlOrKey: string): string | null {
  if (!urlOrKey) return null;

  // Handle r2:// prefix
  if (urlOrKey.startsWith('r2://')) {
    return urlOrKey.slice(5); // Remove 'r2://'
  }

  // Handle cloudflarestorage.com URLs (new format)
  // Format: https://<account-id>.r2.cloudflarestorage.com/<bucket>/<key>
  const cloudflareMatch = urlOrKey.match(/https?:\/\/[^\/]+\.r2\.cloudflarestorage\.com\/[^\/]+\/(.+)/);
  if (cloudflareMatch) {
    return cloudflareMatch[1];
  }

  // Handle full R2 public URL from env var
  if (R2_PUBLIC_URL && urlOrKey.startsWith(R2_PUBLIC_URL)) {
    const publicUrlBase = R2_PUBLIC_URL.replace(/\/$/, '');
    return urlOrKey.slice(publicUrlBase.length + 1); // Remove base URL + slash
  }

  // Handle legacy r2.sirath.network URLs (backward compatibility)
  const r2Match = urlOrKey.match(/https?:\/\/r2\.barzakh\.tech\/(.+)/);
  if (r2Match) {
    return r2Match[1];
  }

  // If it looks like a path (no protocol), assume it's already a key
  if (!urlOrKey.includes('://')) {
    return urlOrKey;
  }

  return null;
}

/**
 * Check if a value is an R2 key (not a full URL)
 * Keys start with r2:// or are path-like strings without protocol
 */
export function isR2Key(value: string): boolean {
  if (!value) return false;
  return value.startsWith('r2://') ||
    (!value.includes('://') && value.includes('/') && !value.startsWith('/'));
}

/**
 * Convert an R2 key to the r2:// prefixed format for storage
 */
export function toR2KeyFormat(key: string): string {
  if (key.startsWith('r2://')) return key;
  return `r2://${key}`;
}

