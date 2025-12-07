/**
 * Shared Security Module
 * 
 * Security utilities that can be used across both frontend and backend packages.
 */

export {
  scanExternalContent,
  sanitizeExternalContent,
  processExternalContent,
  type ExternalContentScanResult,
} from './external-content-scanner';
