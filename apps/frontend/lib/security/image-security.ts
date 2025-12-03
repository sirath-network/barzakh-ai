/**
 * Image Security Module
 * 
 * Provides protection against:
 * - Image-based prompt injection (text hidden in images)
 * - Malicious SVG content
 * - Oversized images (DoS prevention)
 * - Invalid image types
 * - SSRF via image URLs
 */

import { SecurityCheckResult, ThreatDetection, checkUrl } from './prompt-injection';

// ============================================
// CONSTANTS
// ============================================

/** Maximum image file size in bytes (10MB) */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** Allowed image MIME types */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  // Note: SVG requires special handling
];

/** Allowed image extensions */
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'];

/** Trusted image CDN domains */
export const TRUSTED_IMAGE_DOMAINS = [
  // Cloudflare R2 Storage (primary)
  'r2.barzakh.tech',
  'r2.cloudflarestorage.com',
  // Vercel Blob Storage (legacy)
  'blob.vercel-storage.com',
  'vercel-storage.com',
  'images.unsplash.com',
  'cdn.discordapp.com',
  'i.imgur.com',
  'pbs.twimg.com',
  // AI image generation services
  'oaidalleapiprodscus.blob.core.windows.net', // OpenAI DALL-E
  'replicate.delivery',
  'pbxt.replicate.delivery',
  // Add your trusted domains here
];

// ============================================
// IMAGE URL VALIDATION
// ============================================

/**
 * Validate and check image URL for security issues
 */
export function validateImageUrl(url: string): SecurityCheckResult {
  const threats: ThreatDetection[] = [];
  let riskScore = 0;

  // Basic URL check from prompt-injection module
  const urlCheck = checkUrl(url);
  threats.push(...urlCheck.threats);
  riskScore += urlCheck.riskScore;

  try {
    const parsedUrl = new URL(url);
    
    // Check for non-HTTPS (except localhost for dev)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
      threats.push({
        type: 'malicious_url',
        severity: 'medium',
        pattern: parsedUrl.protocol,
        description: 'Non-HTTPS image URL (potential MITM attack)',
      });
      riskScore += 15;
    }

    // Check if domain is trusted
    const isTrusted = TRUSTED_IMAGE_DOMAINS.some(domain => 
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );

    if (!isTrusted) {
      // Not automatically blocked, but flagged for logging
      console.log(`[ImageSecurity] Untrusted image domain: ${parsedUrl.hostname}`);
    }

    // Check file extension
    const pathname = parsedUrl.pathname.toLowerCase();
    const hasValidExtension = ALLOWED_IMAGE_EXTENSIONS.some(ext => 
      pathname.endsWith(`.${ext}`)
    );

    // Allow URLs without extensions (CDN URLs often don't have them)
    // But flag suspicious extensions
    const suspiciousExtensions = ['.html', '.htm', '.php', '.asp', '.jsp', '.exe'];
    const hasSuspiciousExtension = suspiciousExtensions.some(ext => 
      pathname.endsWith(ext)
    );

    if (hasSuspiciousExtension) {
      threats.push({
        type: 'malicious_url',
        severity: 'high',
        pattern: pathname,
        description: 'Image URL has suspicious file extension',
      });
      riskScore += 30;
    }

    // Check for query string injection attempts
    if (parsedUrl.search) {
      const dangerousParams = ['script', 'javascript', 'eval', 'exec'];
      for (const param of dangerousParams) {
        if (parsedUrl.search.toLowerCase().includes(param)) {
          threats.push({
            type: 'malicious_url',
            severity: 'high',
            pattern: param,
            description: `Suspicious parameter in image URL: ${param}`,
          });
          riskScore += 25;
        }
      }
    }

  } catch (error) {
    // Invalid URL
    if (!url.startsWith('data:image/')) {
      threats.push({
        type: 'malicious_url',
        severity: 'medium',
        pattern: url.substring(0, 50),
        description: 'Invalid image URL format',
      });
      riskScore += 20;
    }
  }

  return {
    safe: riskScore < 50,
    threats,
    riskScore: Math.min(100, riskScore),
  };
}

// ============================================
// DATA URL VALIDATION
// ============================================

/**
 * Validate data URL for image content
 */
export function validateDataUrl(dataUrl: string): SecurityCheckResult {
  const threats: ThreatDetection[] = [];
  let riskScore = 0;

  if (!dataUrl.startsWith('data:')) {
    return { safe: true, threats: [], riskScore: 0 };
  }

  // Parse data URL
  const match = dataUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
  if (!match) {
    threats.push({
      type: 'malicious_url',
      severity: 'medium',
      pattern: 'invalid data URL',
      description: 'Malformed data URL',
    });
    return { safe: false, threats, riskScore: 30 };
  }

  const [, mimeType, data] = match;

  // Check MIME type
  if (!mimeType?.startsWith('image/')) {
    threats.push({
      type: 'malicious_url',
      severity: 'high',
      pattern: mimeType || 'unknown',
      description: 'Data URL is not an image type',
    });
    riskScore += 40;
  }

  // Special handling for SVG (can contain scripts)
  if (mimeType === 'image/svg+xml') {
    const svgCheck = validateSvgContent(data);
    threats.push(...svgCheck.threats);
    riskScore += svgCheck.riskScore;
  }

  // Check data size (prevent memory attacks)
  if (data.length > MAX_IMAGE_SIZE * 1.37) { // Base64 adds ~37% overhead
    threats.push({
      type: 'tool_abuse',
      severity: 'high',
      pattern: `${(data.length / 1024 / 1024).toFixed(2)}MB`,
      description: 'Data URL exceeds maximum allowed size',
    });
    riskScore += 30;
  }

  return {
    safe: riskScore < 50,
    threats,
    riskScore: Math.min(100, riskScore),
  };
}

// ============================================
// SVG SECURITY
// ============================================

/**
 * Validate SVG content for malicious scripts
 */
export function validateSvgContent(content: string): SecurityCheckResult {
  const threats: ThreatDetection[] = [];
  let riskScore = 0;

  // Decode base64 if needed
  let svgContent = content;
  try {
    if (!/[<>]/.test(content.substring(0, 100))) {
      svgContent = atob(content);
    }
  } catch {
    // Not base64 or decode failed, check as-is
  }

  const lowercaseContent = svgContent.toLowerCase();

  // Check for script tags
  if (/<script[\s>]/i.test(svgContent)) {
    threats.push({
      type: 'malicious_url',
      severity: 'critical',
      pattern: '<script>',
      description: 'SVG contains script element',
    });
    riskScore += 50;
  }

  // Check for event handlers
  const eventHandlers = [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
    'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown',
    'onkeyup', 'onkeypress', 'onmousedown', 'onmouseup',
  ];

  for (const handler of eventHandlers) {
    if (lowercaseContent.includes(`${handler}=`)) {
      threats.push({
        type: 'malicious_url',
        severity: 'critical',
        pattern: handler,
        description: `SVG contains ${handler} event handler`,
      });
      riskScore += 40;
    }
  }

  // Check for javascript: URLs
  if (/href\s*=\s*["']javascript:/i.test(svgContent)) {
    threats.push({
      type: 'malicious_url',
      severity: 'critical',
      pattern: 'javascript:',
      description: 'SVG contains javascript: URL',
    });
    riskScore += 50;
  }

  // Check for foreignObject (can embed HTML)
  if (/<foreignobject/i.test(svgContent)) {
    threats.push({
      type: 'malicious_url',
      severity: 'high',
      pattern: '<foreignObject>',
      description: 'SVG contains foreignObject element',
    });
    riskScore += 30;
  }

  // Check for use with external references
  if (/<use[^>]+href\s*=\s*["']http/i.test(svgContent)) {
    threats.push({
      type: 'malicious_url',
      severity: 'medium',
      pattern: '<use href="http...">',
      description: 'SVG references external resource',
    });
    riskScore += 20;
  }

  return {
    safe: riskScore < 30,
    threats,
    riskScore: Math.min(100, riskScore),
  };
}

// ============================================
// FILE UPLOAD VALIDATION
// ============================================

interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  checkMagicBytes?: boolean;
}

/**
 * Validate uploaded image file
 */
export async function validateImageFile(
  file: File | Blob,
  options: FileValidationOptions = {}
): Promise<SecurityCheckResult> {
  const {
    maxSize = MAX_IMAGE_SIZE,
    allowedTypes = ALLOWED_IMAGE_TYPES,
    checkMagicBytes = true,
  } = options;

  const threats: ThreatDetection[] = [];
  let riskScore = 0;

  // Check file size
  if (file.size > maxSize) {
    threats.push({
      type: 'tool_abuse',
      severity: 'medium',
      pattern: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      description: `File exceeds maximum size of ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
    });
    riskScore += 25;
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    // Special handling for SVG
    if (file.type === 'image/svg+xml') {
      const text = await file.text();
      const svgCheck = validateSvgContent(text);
      threats.push(...svgCheck.threats);
      riskScore += svgCheck.riskScore;
    } else {
      threats.push({
        type: 'tool_abuse',
        severity: 'high',
        pattern: file.type,
        description: `File type not allowed: ${file.type}`,
      });
      riskScore += 35;
    }
  }

  // Check magic bytes if enabled
  if (checkMagicBytes && file.size > 0) {
    const magicCheck = await checkMagicBytesMatch(file);
    if (!magicCheck.valid) {
      threats.push({
        type: 'tool_abuse',
        severity: 'high',
        pattern: magicCheck.detectedType || 'unknown',
        description: `File magic bytes don't match declared type. Claims to be ${file.type}, appears to be ${magicCheck.detectedType || 'unknown'}`,
      });
      riskScore += 40;
    }
  }

  return {
    safe: riskScore < 50,
    threats,
    riskScore: Math.min(100, riskScore),
  };
}

/**
 * Check if file magic bytes match the declared MIME type
 */
async function checkMagicBytesMatch(file: File | Blob): Promise<{ valid: boolean; detectedType?: string }> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Magic byte signatures
  const signatures: Array<{ bytes: number[]; mask?: number[]; type: string }> = [
    { bytes: [0xFF, 0xD8, 0xFF], type: 'image/jpeg' },
    { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], type: 'image/png' },
    { bytes: [0x47, 0x49, 0x46, 0x38], type: 'image/gif' }, // GIF87a or GIF89a
    { bytes: [0x52, 0x49, 0x46, 0x46], type: 'image/webp' }, // RIFF....WEBP
    { bytes: [0x00, 0x00, 0x00], type: 'image/avif' }, // ftyp avif (need more checks)
  ];

  let detectedType: string | undefined;

  for (const sig of signatures) {
    const matches = sig.bytes.every((byte, i) => {
      if (sig.mask) {
        return (bytes[i] & sig.mask[i]) === byte;
      }
      return bytes[i] === byte;
    });

    if (matches) {
      // Additional check for WebP
      if (sig.type === 'image/webp') {
        const webpMagic = [0x57, 0x45, 0x42, 0x50]; // WEBP
        const hasWebpMarker = webpMagic.every((byte, i) => bytes[i + 8] === byte);
        if (hasWebpMarker) {
          detectedType = 'image/webp';
          break;
        }
      } else {
        detectedType = sig.type;
        break;
      }
    }
  }

  // Check for SVG (text-based)
  if (!detectedType) {
    const textContent = new TextDecoder().decode(bytes);
    if (textContent.includes('<svg') || textContent.includes('<?xml')) {
      detectedType = 'image/svg+xml';
    }
  }

  // If we couldn't detect the type, we can't validate
  if (!detectedType) {
    return { valid: true }; // Allow unknown types to pass magic byte check
  }

  // Check if detected type matches declared type
  const declaredType = file.type.toLowerCase();
  const valid = detectedType === declaredType || 
    // Allow jpeg/jpg variations
    (detectedType === 'image/jpeg' && (declaredType === 'image/jpeg' || declaredType === 'image/jpg'));

  return { valid, detectedType };
}

// ============================================
// IMAGE CONTENT ANALYSIS (OCR RESULTS)
// ============================================

/**
 * Advanced image-based injection patterns
 */
const ADVANCED_IMAGE_INJECTION_PATTERNS = [
  // Direct instructions
  { pattern: /ignore\s+(all\s+)?previous/i, severity: 'critical' as const, description: 'Hidden instruction to ignore context' },
  { pattern: /new\s+instructions?:/i, severity: 'critical' as const, description: 'Hidden new instructions' },
  { pattern: /system\s*prompt/i, severity: 'high' as const, description: 'Reference to system prompt' },
  { pattern: /you\s+are\s+now/i, severity: 'high' as const, description: 'Role reassignment attempt' },
  { pattern: /disregard|override/i, severity: 'high' as const, description: 'Override instruction' },
  // Jailbreak attempts
  { pattern: /developer\s+mode/i, severity: 'critical' as const, description: 'Developer mode jailbreak' },
  { pattern: /jailbreak/i, severity: 'critical' as const, description: 'Explicit jailbreak reference' },
  { pattern: /bypass\s+(the\s+)?filter/i, severity: 'high' as const, description: 'Filter bypass attempt' },
  // Encoded payloads
  { pattern: /base64|eval\(|exec\(/i, severity: 'medium' as const, description: 'Code execution reference' },
  
  // Advanced image injection techniques
  { pattern: /\[system\]|\[INST\]|<<SYS>>/i, severity: 'critical' as const, description: 'LLM control tokens in image' },
  { pattern: /assistant:\s*(?:sure|ok|yes)/i, severity: 'high' as const, description: 'Fake assistant response in image' },
  { pattern: /human:\s*(?:ignore|forget)/i, severity: 'high' as const, description: 'Fake human instruction in image' },
  { pattern: /end\s+of\s+(?:system|prompt)/i, severity: 'high' as const, description: 'Context boundary manipulation in image' },
  { pattern: /---+\s*(?:new|system|admin)/i, severity: 'high' as const, description: 'Delimiter attack in image' },
  
  // Steganographic hints
  { pattern: /hidden\s+(?:message|instruction|command)/i, severity: 'high' as const, description: 'Reference to hidden content' },
  { pattern: /decode\s+(?:this|the\s+)?(?:image|message)/i, severity: 'medium' as const, description: 'Decode instruction reference' },
  { pattern: /steganograph/i, severity: 'high' as const, description: 'Steganography reference' },
  { pattern: /secret\s+(?:message|instruction|command)/i, severity: 'high' as const, description: 'Secret instruction reference' },
  
  // Multi-language image attacks
  { pattern: /(?:忽略|忘记).*(?:指令|规则)/i, severity: 'high' as const, description: 'Chinese injection in image' },
  { pattern: /(?:ignorar|olvidar).*(?:instrucciones)/i, severity: 'high' as const, description: 'Spanish injection in image' },
  { pattern: /(?:игнорир|забудь).*(?:инструкц)/i, severity: 'high' as const, description: 'Russian injection in image' },
  
  // QR code / barcode instructions
  { pattern: /scan\s+(?:this\s+)?(?:qr|code|barcode)/i, severity: 'medium' as const, description: 'QR/Barcode scan instruction' },
  { pattern: /follow\s+(?:the\s+)?(?:link|url|qr)/i, severity: 'medium' as const, description: 'URL follow instruction in image' },
  
  // Metadata poisoning references
  { pattern: /exif|metadata|iptc/i, severity: 'medium' as const, description: 'Metadata manipulation reference' },
  { pattern: /read\s+(?:the\s+)?(?:exif|metadata|hidden)/i, severity: 'high' as const, description: 'Hidden data reading instruction' },
];

/**
 * Analyze OCR/extracted text from images for prompt injection
 */
export function analyzeImageText(extractedText: string): SecurityCheckResult {
  const threats: ThreatDetection[] = [];
  let riskScore = 0;

  for (const { pattern, severity, description } of ADVANCED_IMAGE_INJECTION_PATTERNS) {
    const match = extractedText.match(pattern);
    if (match) {
      threats.push({
        type: 'image_prompt_injection',
        severity,
        pattern: match[0],
        description: `Image text contains: ${description}`,
      });
      riskScore += severity === 'critical' ? 40 : severity === 'high' ? 25 : 15;
    }
  }

  // Check for suspicious character patterns that might indicate hidden text
  const suspiciousPatterns = [
    { pattern: /[\u200B\u200C\u200D\u2060\uFEFF]/, description: 'Zero-width characters in image text' },
    { pattern: /[\u202A-\u202E\u2066-\u2069]/, description: 'Bidirectional override in image text' },
  ];

  for (const { pattern, description } of suspiciousPatterns) {
    if (pattern.test(extractedText)) {
      threats.push({
        type: 'image_prompt_injection',
        severity: 'high',
        pattern: '[hidden chars]',
        description,
      });
      riskScore += 25;
    }
  }

  return {
    safe: riskScore < 50,
    threats,
    riskScore: Math.min(100, riskScore),
  };
}

// ============================================
// COMPOSITE VALIDATION
// ============================================

/**
 * Check image metadata/EXIF for hidden payloads
 */
export async function checkImageMetadata(file: File | Blob): Promise<SecurityCheckResult> {
  const threats: ThreatDetection[] = [];
  let riskScore = 0;

  try {
    // Read the first 64KB to check for embedded content
    const buffer = await file.slice(0, 65536).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const textContent = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

    // Check for suspicious strings in image binary data
    const suspiciousStrings = [
      { pattern: /ignore\s+previous/i, description: 'Prompt injection in metadata' },
      { pattern: /<script/i, description: 'Script tag in image data' },
      { pattern: /javascript:/i, description: 'JavaScript URL in image data' },
      { pattern: /\[system\]|\[INST\]/i, description: 'LLM tokens in image data' },
      { pattern: /eval\s*\(|exec\s*\(/i, description: 'Code execution in metadata' },
      { pattern: /http:\/\/localhost|http:\/\/127\./i, description: 'Localhost URL in image' },
      { pattern: /system\s*prompt|developer\s*mode/i, description: 'Jailbreak strings in metadata' },
    ];

    for (const { pattern, description } of suspiciousStrings) {
      if (pattern.test(textContent)) {
        threats.push({
          type: 'image_prompt_injection',
          severity: 'high',
          pattern: '[in binary]',
          description: `Suspicious content in image data: ${description}`,
        });
        riskScore += 30;
      }
    }

    // Check for polyglot files (image that's also valid as another format)
    const polyglotSignatures = [
      { bytes: [0x3C, 0x3F, 0x70, 0x68, 0x70], offset: 0, description: 'PHP polyglot' }, // <?php
      { bytes: [0x3C, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74], offset: -1, description: 'Script polyglot' }, // <script
      { bytes: [0x25, 0x50, 0x44, 0x46], offset: -1, description: 'PDF polyglot' }, // %PDF
    ];

    for (const sig of polyglotSignatures) {
      if (sig.offset === -1) {
        // Search anywhere in the first 64KB
        let found = false;
        for (let i = 0; i <= bytes.length - sig.bytes.length; i++) {
          if (sig.bytes.every((b, j) => bytes[i + j] === b)) {
            found = true;
            break;
          }
        }
        if (found) {
          threats.push({
            type: 'tool_abuse',
            severity: 'critical',
            pattern: sig.description,
            description: `Polyglot file detected: ${sig.description}`,
          });
          riskScore += 50;
        }
      }
    }

  } catch (error) {
    // If we can't read the file, log but don't block
    console.warn('Could not check image metadata:', error);
  }

  return {
    safe: riskScore < 50,
    threats,
    riskScore: Math.min(100, riskScore),
  };
}

/**
 * Comprehensive image validation
 */
export async function validateImage(
  source: string | File | Blob,
  extractedText?: string
): Promise<SecurityCheckResult> {
  const allThreats: ThreatDetection[] = [];
  let totalRiskScore = 0;

  // Validate based on source type
  if (typeof source === 'string') {
    // URL or data URL
    if (source.startsWith('data:')) {
      const dataCheck = validateDataUrl(source);
      allThreats.push(...dataCheck.threats);
      totalRiskScore += dataCheck.riskScore;
    } else {
      const urlCheck = validateImageUrl(source);
      allThreats.push(...urlCheck.threats);
      totalRiskScore += urlCheck.riskScore;
    }
  } else {
    // File or Blob - run all checks
    const fileCheck = await validateImageFile(source);
    allThreats.push(...fileCheck.threats);
    totalRiskScore += fileCheck.riskScore;

    // Also check metadata for hidden payloads
    const metadataCheck = await checkImageMetadata(source);
    allThreats.push(...metadataCheck.threats);
    totalRiskScore += metadataCheck.riskScore;
  }

  // Analyze extracted text if provided
  if (extractedText) {
    const textCheck = analyzeImageText(extractedText);
    allThreats.push(...textCheck.threats);
    totalRiskScore += textCheck.riskScore;
  }

  return {
    safe: totalRiskScore < 50,
    threats: allThreats,
    riskScore: Math.min(100, totalRiskScore),
  };
}
