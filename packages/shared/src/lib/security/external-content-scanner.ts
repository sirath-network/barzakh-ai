/**
 * External Content Security Scanner
 * 
 * Scans content fetched from external sources for indirect prompt injection.
 * This is critical for protecting AI systems from malicious websites.
 */

export interface ExternalContentScanResult {
  safe: boolean;
  sanitizedContent?: string;
  threats: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    pattern: string;
    description: string;
  }>;
  riskScore: number;
}

/**
 * Patterns for detecting indirect injection in external content
 */
const INDIRECT_INJECTION_PATTERNS = [
  // LLM control tokens hidden in content
  { pattern: /\[system\]|\[INST\]|\[\/INST\]|<<SYS>>|<\|im_start\|>|<\|im_end\|>/gi, severity: 'critical' as const, description: 'LLM control tokens in external content' },
  { pattern: /<\|(?:endoftext|pad|sep|cls|mask)\|>/gi, severity: 'critical' as const, description: 'Special tokens in external content' },
  { pattern: /\[PAD\]|\[SEP\]|\[CLS\]|\[MASK\]/g, severity: 'high' as const, description: 'BERT-style tokens in external content' },
  
  // Instruction override attempts
  { pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier|system)\s+(instructions?|prompts?|rules?)/gi, severity: 'critical' as const, description: 'Instruction override in external content' },
  { pattern: /disregard\s+(all\s+)?(previous|prior|system)/gi, severity: 'critical' as const, description: 'Disregard instruction in external content' },
  { pattern: /forget\s+(everything|all)\s+(you|about)/gi, severity: 'critical' as const, description: 'Memory reset in external content' },
  { pattern: /new\s+instructions?:/gi, severity: 'critical' as const, description: 'New instructions marker in external content' },
  
  // Role manipulation
  { pattern: /you\s+are\s+now\s+(a|an|the|my)\s+(?!assistant|helpful)/gi, severity: 'high' as const, description: 'Role manipulation in external content' },
  { pattern: /pretend\s+(to\s+be|you\s+are)/gi, severity: 'high' as const, description: 'Pretend instruction in external content' },
  { pattern: /act\s+as\s+(if\s+you\s+were|a|an)/gi, severity: 'high' as const, description: 'Act as instruction in external content' },
  
  // Context manipulation
  { pattern: /<\/?(?:system|user|assistant|human|ai|bot)>/gi, severity: 'high' as const, description: 'XML role tags in external content' },
  { pattern: /\[(?:end|start|begin)\s*(?:of\s*)?(?:system|prompt|instruction)\]/gi, severity: 'high' as const, description: 'Context boundary markers in external content' },
  { pattern: /end\s+of\s+(system\s+)?(prompt|instructions?|context)/gi, severity: 'high' as const, description: 'Context end markers in external content' },
  { pattern: /---+\s*(system|instruction|admin|root|override)/gi, severity: 'high' as const, description: 'Delimiter attack in external content' },
  { pattern: /===\s*(new|system|admin)\s*(prompt|instruction)/gi, severity: 'high' as const, description: 'Equals delimiter attack in external content' },
  
  // Hidden in HTML/Markdown comments
  { pattern: /<!--[\s\S]*?(?:ignore|override|system|jailbreak)[\s\S]*?-->/gi, severity: 'high' as const, description: 'Injection in HTML comment' },
  { pattern: /\/\*[\s\S]*?(?:ignore|override|system|jailbreak)[\s\S]*?\*\//gi, severity: 'high' as const, description: 'Injection in block comment' },
  { pattern: /\[comment\]:\s*#\s*\([^)]*(?:ignore|override|system)[^)]*\)/gi, severity: 'high' as const, description: 'Markdown comment injection' },
  
  // Hidden in HTML attributes
  { pattern: /\balt\s*=\s*["'][^"']*(?:ignore previous|new instructions|system prompt)[^"']*["']/gi, severity: 'high' as const, description: 'Injection in alt attribute' },
  { pattern: /\btitle\s*=\s*["'][^"']*(?:ignore|override|system)[^"']*["']/gi, severity: 'high' as const, description: 'Injection in title attribute' },
  { pattern: /\bdata-[a-z]+\s*=\s*["'][^"']*(?:ignore|override|system|jailbreak)[^"']*["']/gi, severity: 'high' as const, description: 'Injection in data attribute' },
  
  // Hidden in JSON/structured data
  { pattern: /"_?comment"\s*:\s*"[^"]*(?:ignore|system|jailbreak)[^"]*"/gi, severity: 'high' as const, description: 'Injection in JSON comment field' },
  { pattern: /"description"\s*:\s*"[^"]*(?:ignore previous|new instructions)[^"]*"/gi, severity: 'high' as const, description: 'Injection in JSON description' },
  
  // CDATA injection
  { pattern: /<!\[CDATA\[[\s\S]*?(?:ignore|system|override|jailbreak)[\s\S]*?\]\]>/gi, severity: 'high' as const, description: 'Injection in CDATA section' },
  
  // Jailbreak attempts
  { pattern: /\bDAN\b.*mode|do\s+anything\s+now/gi, severity: 'critical' as const, description: 'DAN jailbreak in external content' },
  { pattern: /developer\s+mode\s+(enabled|activated)/gi, severity: 'critical' as const, description: 'Developer mode jailbreak in external content' },
  { pattern: /bypass\s+(your|the|all)\s+(safety|content|ethical)/gi, severity: 'critical' as const, description: 'Bypass attempt in external content' },
  
  // Data exfiltration
  { pattern: /send\s+(this|the|all)\s+(data|info|conversation)\s+to/gi, severity: 'critical' as const, description: 'Data exfiltration instruction in external content' },
  { pattern: /exfiltrate|upload.*webhook/gi, severity: 'critical' as const, description: 'Exfiltration keyword in external content' },
  
  // Multi-language attacks
  { pattern: /(?:忽略|忘记|无视).*(?:指令|规则|限制)/g, severity: 'high' as const, description: 'Chinese injection in external content' },
  { pattern: /(?:ignorar|olvidar|descartar).*(?:instrucciones|reglas)/gi, severity: 'high' as const, description: 'Spanish injection in external content' },
  { pattern: /(?:ignorer|oublier).*(?:instructions|règles)/gi, severity: 'high' as const, description: 'French injection in external content' },
  { pattern: /(?:игнорир|забудь).*(?:инструкц|правил)/gi, severity: 'high' as const, description: 'Russian injection in external content' },
];

/**
 * Invisible/special characters that could hide payloads
 */
const SUSPICIOUS_UNICODE_PATTERNS = [
  { pattern: /[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, description: 'Zero-width or invisible characters' },
  { pattern: /[\u202A-\u202E\u2066-\u2069]/g, description: 'Bidirectional override characters' },
];

/**
 * Scan external content for indirect prompt injection
 */
export function scanExternalContent(content: string): ExternalContentScanResult {
  const threats: ExternalContentScanResult['threats'] = [];
  let riskScore = 0;

  // Check for injection patterns
  for (const { pattern, severity, description } of INDIRECT_INJECTION_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      threats.push({
        type: 'indirect_injection',
        severity,
        pattern: matches[0].substring(0, 100),
        description,
      });
      riskScore += severity === 'critical' ? 40 : severity === 'high' ? 25 : severity === 'medium' ? 15 : 8;
    }
  }

  // Check for suspicious unicode
  for (const { pattern, description } of SUSPICIOUS_UNICODE_PATTERNS) {
    const matches = content.match(pattern);
    if (matches && matches.length > 5) {
      threats.push({
        type: 'unicode_exploit',
        severity: 'high',
        pattern: `${matches.length} occurrences`,
        description,
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

/**
 * Sanitize external content by removing dangerous patterns
 */
export function sanitizeExternalContent(content: string): string {
  let sanitized = content;

  // Remove invisible characters
  sanitized = sanitized.replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, '');
  
  // Remove bidirectional overrides
  sanitized = sanitized.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');
  
  // Remove LLM control tokens
  sanitized = sanitized.replace(/\[system\]|\[INST\]|\[\/INST\]|<<SYS>>|<\|im_start\|>|<\|im_end\|>/gi, '[REMOVED]');
  sanitized = sanitized.replace(/<\|(?:endoftext|pad|sep|cls|mask)\|>/gi, '[REMOVED]');
  
  // Neutralize dangerous HTML comments by making them visible
  sanitized = sanitized.replace(/<!--([\s\S]*?)-->/g, (match, content) => {
    if (/ignore|override|system|jailbreak|instruction/i.test(content)) {
      return `[HTML COMMENT REMOVED]`;
    }
    return match;
  });
  
  // Neutralize suspicious role tags
  sanitized = sanitized.replace(/<\/?(?:system|user|assistant|human|ai|bot)>/gi, '[ROLE TAG REMOVED]');

  return sanitized;
}

/**
 * Process external content with security scanning and optional sanitization
 */
export function processExternalContent(
  content: string,
  options: { sanitize?: boolean; blockOnThreat?: boolean } = {}
): { content: string; scanResult: ExternalContentScanResult } {
  const { sanitize = true, blockOnThreat = false } = options;
  
  const scanResult = scanExternalContent(content);
  
  if (!scanResult.safe) {
    console.warn('[EXTERNAL-CONTENT-SECURITY] Threats detected in external content:', {
      threatCount: scanResult.threats.length,
      threats: scanResult.threats.slice(0, 3).map(t => t.description),
      riskScore: scanResult.riskScore,
    });
    
    if (blockOnThreat) {
      return {
        content: '[Content blocked due to security concerns]',
        scanResult,
      };
    }
  }
  
  const finalContent = sanitize ? sanitizeExternalContent(content) : content;
  
  return {
    content: finalContent,
    scanResult: {
      ...scanResult,
      sanitizedContent: sanitize ? finalContent : undefined,
    },
  };
}
