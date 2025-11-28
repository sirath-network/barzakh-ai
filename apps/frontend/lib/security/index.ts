/**
 * Security Module Index
 * 
 * Exports all security utilities for protecting the AI chat platform
 */

// Prompt injection protection
export {
  checkTextContent,
  checkMessages,
  checkImageContent,
  checkUrl,
  checkFileContent,
  sanitizeContent,
  wrapUserMessage,
  performSecurityCheck,
  securityBlockResponse,
  type SecurityCheckResult,
  type ThreatDetection,
  type ThreatType,
  type SecurityConfig,
} from './prompt-injection';

// Image security
export {
  validateImageUrl,
  validateDataUrl,
  validateSvgContent,
  validateImageFile,
  validateImage,
  analyzeImageText,
  checkImageMetadata,
  MAX_IMAGE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  TRUSTED_IMAGE_DOMAINS,
} from './image-security';

// Re-export from cloudflare
export {
  getCloudflareHeaders,
  getClientIp,
  isVerifiedBot,
  getBotScore,
  isLikelyBot,
  getThreatScore,
  isHighThreat,
  validateTurnstileToken,
  isStripeWebhook,
  rateLimitResponse,
  blockResponse,
  SECURITY_HEADERS,
  withSecurityHeaders,
  isValidCronRequest,
  logSecurityEvent,
} from '../cloudflare';
