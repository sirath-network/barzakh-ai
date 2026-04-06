/**
 * Prompt Injection & AI Security Protection
 * 
 * This module provides comprehensive protection against:
 * - Prompt injection attacks
 * - Jailbreaking attempts
 * - Malicious image/file-based attacks
 * - Instruction override attempts
 * - Data exfiltration attempts
 * - Role manipulation attacks
 */

export interface SecurityCheckResult {
  safe: boolean;
  threats: ThreatDetection[];
  riskScore: number; // 0-100, higher = more risk
  sanitizedContent?: string;
}

export interface ThreatDetection {
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: string;
  description: string;
  position?: number;
}

export type ThreatType =
  | 'prompt_injection'
  | 'jailbreak_attempt'
  | 'instruction_override'
  | 'role_manipulation'
  | 'data_exfiltration'
  | 'malicious_url'
  | 'encoded_payload'
  | 'system_prompt_extraction'
  | 'tool_abuse'
  | 'unicode_exploit'
  | 'markdown_injection'
  | 'image_prompt_injection'
  | 'indirect_injection'
  | 'multi_language_attack'
  | 'context_manipulation'
  | 'payload_smuggling'
  | 'recursive_injection'
  | 'delimiter_attack';

// ============================================
// PROMPT INJECTION DETECTION PATTERNS
// ============================================

/**
 * High severity - Direct instruction overrides
 */
const CRITICAL_PATTERNS: Array<{ pattern: RegExp; type: ThreatType; description: string }> = [
  // System prompt manipulation
  { 
    pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier|system)\s+(instructions?|prompts?|rules?|guidelines?)/gi,
    type: 'instruction_override',
    description: 'Attempt to ignore system instructions'
  },
  {
    pattern: /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?)/gi,
    type: 'instruction_override',
    description: 'Attempt to disregard system instructions'
  },
  {
    pattern: /forget\s+(everything|all)\s+(you|about|previously)/gi,
    type: 'instruction_override',
    description: 'Attempt to reset AI memory/instructions'
  },
  {
    pattern: /you\s+are\s+now\s+(a|an|the|my)\s+(?!assistant|helpful|investigator|analyst|researcher|expert|developer|coder|auditor|tracker|searcher|monitor|specialist|forensic|blockchain|on-chain|security|professional|bitcoin|ethereum|solana|crypto)/gi,
    type: 'role_manipulation',
    description: 'Attempt to change AI role'
  },
  {
    pattern: /pretend\s+(to\s+be|you\s+are|you're)\s+(?!an?\s+(investigator|analyst|researcher|expert|developer|coder|auditor|tracker|searcher|monitor|specialist|forensic|blockchain|on-chain|security|professional|bitcoin|ethereum|solana|crypto))/gi,
    type: 'role_manipulation',
    description: 'Attempt to manipulate AI identity'
  },
  {
    pattern: /act\s+as\s+(if\s+you\s+were|a|an)\s+(?!assistant|investigator|analyst|researcher|expert|developer|coder|auditor|forensic|tracker|searcher|monitor|specialist|blockchain|on-chain|security|professional)/gi,
    type: 'role_manipulation',
    description: 'Attempt to change AI behavior'
  },
  {
    pattern: /\[system\]|\[INST\]|\[\/INST\]|<<SYS>>|<\|im_start\|>|<\|im_end\|>/gi,
    type: 'prompt_injection',
    description: 'Detected LLM control tokens'
  },
  {
    pattern: /\{\{.*system.*\}\}|\{\%.*\%\}/gi,
    type: 'prompt_injection',
    description: 'Template injection attempt'
  },
  // System prompt extraction
  {
    pattern: /reveal\s+(your|the)\s+(system|initial|original)\s+(prompt|instructions?|programming)/gi,
    type: 'system_prompt_extraction',
    description: 'Attempt to extract system prompt'
  },
  {
    pattern: /what\s+(are|is)\s+(your|the)\s+(system|initial|secret|hidden)\s+(prompt|instructions?)/gi,
    type: 'system_prompt_extraction',
    description: 'Attempt to extract system prompt'
  },
  {
    pattern: /repeat\s+(your|the)\s+(instructions?|prompt|system\s+message)/gi,
    type: 'system_prompt_extraction',
    description: 'Attempt to extract system prompt via repetition'
  },
  {
    pattern: /print\s+(your|the)\s+(instructions?|prompt|programming)/gi,
    type: 'system_prompt_extraction',
    description: 'Attempt to print system prompt'
  },
];

/**
 * High severity - Jailbreaking attempts
 */
const JAILBREAK_PATTERNS: Array<{ pattern: RegExp; type: ThreatType; description: string }> = [
  {
    pattern: /\bDAN\b.*mode|do\s+anything\s+now/gi,
    type: 'jailbreak_attempt',
    description: 'DAN (Do Anything Now) jailbreak attempt'
  },
  {
    pattern: /developer\s+mode\s+(enabled|activated|on)/gi,
    type: 'jailbreak_attempt',
    description: 'Developer mode jailbreak attempt'
  },
  {
    pattern: /jailbr[e|a][a|e]k(en|ed|ing)?/gi,
    type: 'jailbreak_attempt',
    description: 'Explicit jailbreak mention'
  },
  {
    pattern: /\benable\s+unrestricted\s+mode/gi,
    type: 'jailbreak_attempt',
    description: 'Unrestricted mode jailbreak attempt'
  },
  {
    pattern: /bypass\s+(your|the|all)\s+(safety|content|ethical)\s+(filters?|restrictions?|guidelines?)/gi,
    type: 'jailbreak_attempt',
    description: 'Attempt to bypass safety filters'
  },
  {
    pattern: /remove\s+(your|the|all)\s+(limitations?|restrictions?|filters?|censorship)/gi,
    type: 'jailbreak_attempt',
    description: 'Attempt to remove limitations'
  },
  {
    pattern: /no\s+(ethical|moral)\s+(guidelines?|restrictions?|limitations?)/gi,
    type: 'jailbreak_attempt',
    description: 'Attempt to disable ethical guidelines'
  },
  {
    pattern: /override\s+(safety|content)\s+(protocols?|measures?)/gi,
    type: 'jailbreak_attempt',
    description: 'Attempt to override safety protocols'
  },
  {
    pattern: /hypothetical(ly)?\s+speaking.*no\s+rules/gi,
    type: 'jailbreak_attempt',
    description: 'Hypothetical scenario jailbreak'
  },
  {
    pattern: /opposite\s+day|oppositeday/gi,
    type: 'jailbreak_attempt',
    description: 'Opposite day jailbreak attempt'
  },
];

/**
 * Medium severity - Suspicious patterns
 */
const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; type: ThreatType; description: string }> = [
  // Tool abuse
  {
    pattern: /run\s+(this\s+)?code\s+(on|in)\s+(the\s+)?(server|backend|system)/gi,
    type: 'tool_abuse',
    description: 'Attempt to run code on server'
  },
  {
    pattern: /execute\s+(command|shell|bash|cmd)/gi,
    type: 'tool_abuse',
    description: 'Attempt to execute system commands'
  },
  {
    pattern: /access\s+(the\s+)?(file\s*system|database|server|admin)/gi,
    type: 'tool_abuse',
    description: 'Attempt to access protected resources'
  },
  // Data exfiltration
  {
    pattern: /send\s+(this|the|all)\s+(data|info|information|conversation)\s+to/gi,
    type: 'data_exfiltration',
    description: 'Data exfiltration attempt'
  },
  {
    pattern: /exfiltrate|leak\s+(the\s+)?data/gi,
    type: 'data_exfiltration',
    description: 'Explicit data exfiltration attempt'
  },
  {
    pattern: /upload\s+(this|the)\s+(conversation|chat|data)\s+to/gi,
    type: 'data_exfiltration',
    description: 'Data upload exfiltration attempt'
  },
  // URL manipulation
  {
    pattern: /fetch\s+(content\s+)?from\s+(http|https):\/\/(?!.*\.(jpg|jpeg|png|gif|webp|svg)($|\?))/gi,
    type: 'malicious_url',
    description: 'Suspicious URL fetch request'
  },
  // Markdown injection
  {
    pattern: /\[.*\]\(javascript:/gi,
    type: 'markdown_injection',
    description: 'JavaScript URL in markdown'
  },
  {
    pattern: /\[.*\]\(data:/gi,
    type: 'markdown_injection',
    description: 'Data URL in markdown link'
  },
  {
    pattern: /<script[\s>]/gi,
    type: 'markdown_injection',
    description: 'Script tag injection'
  },
  {
    pattern: /on(load|error|click|mouse\w+)\s*=/gi,
    type: 'markdown_injection',
    description: 'Event handler injection'
  },
];

/**
 * Unicode/encoding exploits
 */
const UNICODE_EXPLOITS: Array<{ pattern: RegExp; type: ThreatType; description: string }> = [
  // Zero-width characters (often used to hide text)
  {
    pattern: /[\u200B\u200C\u200D\u2060\uFEFF]/g,
    type: 'unicode_exploit',
    description: 'Zero-width character detected (potential hidden text)'
  },
  // Right-to-left override (can hide malicious text)
  {
    pattern: /[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/g,
    type: 'unicode_exploit',
    description: 'Bidirectional text override detected'
  },
  // Homoglyph attacks (look-alike characters)
  {
    pattern: /[\u0430\u0435\u043E\u0440\u0441\u0443\u0445].*(?:ignore|system|prompt)/gi,
    type: 'unicode_exploit',
    description: 'Cyrillic homoglyph attack detected'
  },
];

/**
 * Advanced attack patterns - Sophisticated prompt injection techniques
 */
const ADVANCED_ATTACK_PATTERNS: Array<{ pattern: RegExp; type: ThreatType; description: string }> = [
  // Delimiter/boundary attacks
  {
    pattern: /---+\s*(system|instruction|admin|root)/gi,
    type: 'delimiter_attack',
    description: 'Delimiter-based prompt boundary attack'
  },
  {
    pattern: /={3,}\s*(new|system|admin)\s*(prompt|instruction|context)/gi,
    type: 'delimiter_attack',
    description: 'Equals delimiter injection'
  },
  {
    pattern: /###\s*(system|instruction|override|admin)/gi,
    type: 'delimiter_attack',
    description: 'Markdown header delimiter attack'
  },
  {
    pattern: /\*{3,}\s*(important|system|override)/gi,
    type: 'delimiter_attack',
    description: 'Asterisk delimiter attack'
  },
  
  // Context manipulation
  {
    pattern: /end\s+of\s+(system\s+)?(prompt|instructions?|context)/gi,
    type: 'context_manipulation',
    description: 'Context boundary manipulation'
  },
  {
    pattern: /begin(ning)?\s+(user|new)\s+(input|message|context)/gi,
    type: 'context_manipulation',
    description: 'Context start manipulation'
  },
  {
    pattern: /<\/?(?:system|user|assistant|human|ai|bot)>/gi,
    type: 'context_manipulation',
    description: 'XML-style role tag injection'
  },
  {
    pattern: /\[(?:end|start|begin)\s*(?:of\s*)?(?:system|prompt|instruction)\]/gi,
    type: 'context_manipulation',
    description: 'Bracket-style context manipulation'
  },
  
  // Indirect injection via output manipulation
  {
    pattern: /when\s+you\s+(respond|reply|answer|output).*(?:include|add|insert|say)/gi,
    type: 'indirect_injection',
    description: 'Output manipulation via instruction'
  },
  {
    pattern: /in\s+your\s+(next|following)\s+(response|reply|message).*(?:always|must|should)/gi,
    type: 'indirect_injection',
    description: 'Future response manipulation'
  },
  {
    pattern: /from\s+now\s+on.*(?:always|must|will|should)/gi,
    type: 'indirect_injection',
    description: 'Persistent behavior injection'
  },
  {
    pattern: /for\s+(all|every)\s+(future|subsequent)\s+(message|response|query)/gi,
    type: 'indirect_injection',
    description: 'Future context poisoning'
  },
  
  // Recursive/nested injection
  {
    pattern: /(?:user|human)\s*:\s*(?:ignore|forget|disregard)/gi,
    type: 'recursive_injection',
    description: 'Fake user role prefix injection'
  },
  {
    pattern: /(?:assistant|ai|bot)\s*:\s*(?:sure|okay|yes|i will)/gi,
    type: 'recursive_injection',
    description: 'Fake assistant response injection'
  },
  {
    pattern: /example\s*(?:input|output|response)\s*:.*(?:ignore|override|bypass)/gi,
    type: 'recursive_injection',
    description: 'Example-based injection'
  },
  
  // Payload smuggling via encoding
  {
    pattern: /base64[:\s]+[A-Za-z0-9+\/=]{20,}/gi,
    type: 'payload_smuggling',
    description: 'Base64 encoded payload detected'
  },
  {
    pattern: /hex[:\s]+[0-9a-fA-F]{20,}/gi,
    type: 'payload_smuggling',
    description: 'Hex encoded payload detected'
  },
  {
    pattern: /\\u[0-9a-fA-F]{4}.*\\u[0-9a-fA-F]{4}/g,
    type: 'payload_smuggling',
    description: 'Unicode escape sequence payload'
  },
  {
    pattern: /\\x[0-9a-fA-F]{2}.*\\x[0-9a-fA-F]{2}/g,
    type: 'payload_smuggling',
    description: 'Hex escape sequence payload'
  },
  {
    pattern: /rot13|caesar\s*cipher|decode\s*this/gi,
    type: 'payload_smuggling',
    description: 'Encoded/cipher payload reference'
  },
  
  // Multi-language attacks (instructions hidden in other languages)
  {
    pattern: /(?:忽略|忘记|无视).*(?:指令|规则|限制)/g,
    type: 'multi_language_attack',
    description: 'Chinese language injection attempt'
  },
  {
    pattern: /(?:ignorar|olvidar|descartar).*(?:instrucciones|reglas)/gi,
    type: 'multi_language_attack',
    description: 'Spanish language injection attempt'
  },
  {
    pattern: /(?:ignorer|oublier).*(?:instructions|règles)/gi,
    type: 'multi_language_attack',
    description: 'French language injection attempt'
  },
  {
    pattern: /(?:ignorieren|vergessen).*(?:anweisungen|regeln)/gi,
    type: 'multi_language_attack',
    description: 'German language injection attempt'
  },
  {
    pattern: /(?:игнорир|забудь).*(?:инструкц|правил)/gi,
    type: 'multi_language_attack',
    description: 'Russian language injection attempt'
  },
  {
    pattern: /(?:تجاهل|انسى).*(?:التعليمات|القواعد)/g,
    type: 'multi_language_attack',
    description: 'Arabic language injection attempt'
  },
  {
    pattern: /(?:無視|忘れて).*(?:指示|ルール)/g,
    type: 'multi_language_attack',
    description: 'Japanese language injection attempt'
  },
  
  // Virtualization/simulation attacks
  {
    pattern: /simulate\s+(a|an)?\s*(terminal|shell|command\s*line|cli)/gi,
    type: 'jailbreak_attempt',
    description: 'Terminal simulation jailbreak'
  },
  {
    pattern: /enter\s+(into\s+)?(a\s+)?virtual\s+(machine|environment|world)/gi,
    type: 'jailbreak_attempt',
    description: 'Virtual environment jailbreak'
  },
  {
    pattern: /roleplay\s+as\s+(a\s+)?(hacker|malicious|evil|unrestricted)/gi,
    type: 'jailbreak_attempt',
    description: 'Malicious roleplay jailbreak'
  },
  {
    pattern: /creative\s+writing\s+mode.*no\s+(filter|restriction|limit)/gi,
    type: 'jailbreak_attempt',
    description: 'Creative writing jailbreak'
  },
  
  // Token manipulation
  {
    pattern: /<\|(?:endoftext|pad|sep|cls|mask)\|>/gi,
    type: 'prompt_injection',
    description: 'Special token injection'
  },
  {
    pattern: /\[PAD\]|\[SEP\]|\[CLS\]|\[MASK\]|\[UNK\]/g,
    type: 'prompt_injection',
    description: 'BERT-style token injection'
  },
  
  // API/tool manipulation
  {
    pattern: /call\s+(the\s+)?function\s+with.*(?:admin|root|sudo)/gi,
    type: 'tool_abuse',
    description: 'Function call privilege escalation'
  },
  {
    pattern: /modify\s+(the\s+)?(api|endpoint|function)\s*(call|request)/gi,
    type: 'tool_abuse',
    description: 'API manipulation attempt'
  },
  {
    pattern: /inject\s+(into|to)\s+(the\s+)?(tool|function|api)/gi,
    type: 'tool_abuse',
    description: 'Tool injection attempt'
  },
];

/**
 * Image-based prompt injection indicators
 */
const IMAGE_INJECTION_INDICATORS: string[] = [
  'ignore previous instructions',
  'system prompt',
  'you are now',
  'disregard',
  'new instructions',
  'override',
  'jailbreak',
  'developer mode',
  'bypass',
  'forget everything',
];

// ============================================
// DETECTION FUNCTIONS
// ============================================

/**
 * Check text content for prompt injection threats
 */
export function checkTextContent(content: string): SecurityCheckResult {
  const threats: ThreatDetection[] = [];
  let riskScore = 0;

  // Check critical patterns
  for (const { pattern, type, description } of CRITICAL_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      threats.push({
        type,
        severity: 'critical',
        pattern: matches[0],
        description,
        position: content.search(pattern),
      });
      riskScore += 40;
    }
  }

  // Check jailbreak patterns
  for (const { pattern, type, description } of JAILBREAK_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      threats.push({
        type,
        severity: 'high',
        pattern: matches[0],
        description,
        position: content.search(pattern),
      });
      riskScore += 30;
    }
  }

  // Check suspicious patterns
  for (const { pattern, type, description } of SUSPICIOUS_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      threats.push({
        type,
        severity: 'medium',
        pattern: matches[0],
        description,
        position: content.search(pattern),
      });
      riskScore += 15;
    }
  }

  // Check unicode exploits
  for (const { pattern, type, description } of UNICODE_EXPLOITS) {
    const matches = content.match(pattern);
    if (matches) {
      threats.push({
        type,
        severity: 'medium',
        pattern: `[Unicode: ${matches[0].charCodeAt(0).toString(16)}]`,
        description,
      });
      riskScore += 20;
    }
  }

  // Check advanced attack patterns
  for (const { pattern, type, description } of ADVANCED_ATTACK_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      // Determine severity based on attack type
      const severity = ['delimiter_attack', 'context_manipulation', 'recursive_injection'].includes(type) 
        ? 'high' as const
        : 'medium' as const;
      threats.push({
        type,
        severity,
        pattern: matches[0],
        description,
        position: content.search(pattern),
      });
      riskScore += severity === 'high' ? 25 : 15;
    }
  }

  // Cap risk score at 100
  riskScore = Math.min(100, riskScore);

  return {
    safe: threats.length === 0,
    threats,
    riskScore,
    sanitizedContent: threats.length > 0 ? sanitizeContent(content) : content,
  };
}

/**
 * Check image alt text / descriptions for injection
 */
export function checkImageContent(
  altText?: string,
  extractedText?: string
): SecurityCheckResult {
  const combinedContent = [altText, extractedText].filter(Boolean).join(' ');
  
  if (!combinedContent) {
    return { safe: true, threats: [], riskScore: 0 };
  }

  // Use text content check
  const textCheck = checkTextContent(combinedContent);
  
  // Additional image-specific checks
  const lowercaseContent = combinedContent.toLowerCase();
  for (const indicator of IMAGE_INJECTION_INDICATORS) {
    if (lowercaseContent.includes(indicator)) {
      textCheck.threats.push({
        type: 'image_prompt_injection',
        severity: 'high',
        pattern: indicator,
        description: `Image contains text that may be a prompt injection: "${indicator}"`,
      });
      textCheck.riskScore = Math.min(100, textCheck.riskScore + 25);
    }
  }

  textCheck.safe = textCheck.threats.length === 0;
  return textCheck;
}

/**
 * Check message array for prompt injection
 */
export function checkMessages(messages: Array<{ role: string; content: any }>): SecurityCheckResult {
  const allThreats: ThreatDetection[] = [];
  let totalRiskScore = 0;

  for (const message of messages) {
    if (message.role === 'user') {
      // Handle string content
      if (typeof message.content === 'string') {
        const result = checkTextContent(message.content);
        allThreats.push(...result.threats);
        totalRiskScore += result.riskScore;
      }
      // Handle array content (multimodal)
      else if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === 'text' && part.text) {
            const result = checkTextContent(part.text);
            allThreats.push(...result.threats);
            totalRiskScore += result.riskScore;
          }
          // Check image URLs for suspicious patterns
          if (part.type === 'image' && part.image) {
            const urlCheck = checkUrl(part.image);
            allThreats.push(...urlCheck.threats);
            totalRiskScore += urlCheck.riskScore;
          }
        }
      }
    }
  }

  // Average risk score across messages
  totalRiskScore = Math.min(100, totalRiskScore);

  return {
    safe: allThreats.length === 0,
    threats: allThreats,
    riskScore: totalRiskScore,
  };
}

/**
 * Check URL for malicious patterns
 */
export function checkUrl(url: string): SecurityCheckResult {
  const threats: ThreatDetection[] = [];
  let riskScore = 0;

  // Check for data URLs that might contain malicious content
  if (url.startsWith('data:')) {
    // Allow safe image data URLs
    if (!url.startsWith('data:image/')) {
      threats.push({
        type: 'malicious_url',
        severity: 'high',
        pattern: 'data:',
        description: 'Non-image data URL detected',
      });
      riskScore += 30;
    }
    // Check for SVG with embedded scripts
    if (url.includes('data:image/svg') && /<script/i.test(url)) {
      threats.push({
        type: 'malicious_url',
        severity: 'critical',
        pattern: 'SVG with script',
        description: 'SVG data URL contains script',
      });
      riskScore += 50;
    }
  }

  // Check for javascript: URLs
  if (url.toLowerCase().startsWith('javascript:')) {
    threats.push({
      type: 'malicious_url',
      severity: 'critical',
      pattern: 'javascript:',
      description: 'JavaScript URL scheme detected',
    });
    riskScore += 50;
  }

  // Check for localhost/internal network access
  const internalPatterns = [
    /localhost/i,
    /127\.0\.0\.1/,
    /0\.0\.0\.0/,
    /192\.168\./,
    /10\.\d+\.\d+\.\d+/,
    /172\.(1[6-9]|2\d|3[01])\./,
  ];

  for (const pattern of internalPatterns) {
    if (pattern.test(url)) {
      threats.push({
        type: 'malicious_url',
        severity: 'high',
        pattern: pattern.source,
        description: 'Internal network URL detected (potential SSRF)',
      });
      riskScore += 25;
      break;
    }
  }

  return {
    safe: threats.length === 0,
    threats,
    riskScore: Math.min(100, riskScore),
  };
}

/**
 * Check file content for malicious patterns
 */
export function checkFileContent(
  filename: string,
  content: string | ArrayBuffer
): SecurityCheckResult {
  const threats: ThreatDetection[] = [];
  let riskScore = 0;

  // Check filename for suspicious patterns
  const suspiciousFilenames = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.ps1$/i,
    /\.vbs$/i,
    /\.msi$/i,
    /\.dll$/i,
  ];

  for (const pattern of suspiciousFilenames) {
    if (pattern.test(filename)) {
      threats.push({
        type: 'tool_abuse',
        severity: 'critical',
        pattern: filename,
        description: 'Executable file type detected',
      });
      riskScore += 50;
    }
  }

  // If content is string, check for injection
  if (typeof content === 'string') {
    const textResult = checkTextContent(content);
    threats.push(...textResult.threats);
    riskScore += textResult.riskScore;
  }

  return {
    safe: threats.length === 0,
    threats,
    riskScore: Math.min(100, riskScore),
  };
}

// ============================================
// SANITIZATION FUNCTIONS
// ============================================

/**
 * Sanitize content by removing/replacing dangerous patterns
 */
export function sanitizeContent(content: string): string {
  let sanitized = content;

  // Remove zero-width characters
  sanitized = sanitized.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, '');

  // Remove bidirectional text overrides
  sanitized = sanitized.replace(/[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/g, '');

  // Remove LLM control tokens
  sanitized = sanitized.replace(/\[system\]|\[INST\]|\[\/INST\]|<<SYS>>|<\|im_start\|>|<\|im_end\|>/gi, '');

  // Escape potential HTML/script injections
  sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '[script removed]');
  sanitized = sanitized.replace(/on(load|error|click|mouse\w+)\s*=/gi, '[event handler removed]=');

  return sanitized;
}

/**
 * Create a safe message wrapper that prevents instruction override
 */
export function wrapUserMessage(content: string): string {
  // This wrapping helps the AI distinguish user content from instructions
  return `<user_message>\n${content}\n</user_message>`;
}

// ============================================
// SECURITY MIDDLEWARE
// ============================================

/**
 * Security check configuration
 */
export interface SecurityConfig {
  /** Block request if risk score exceeds this (0-100). Default: 50 */
  blockThreshold: number;
  /** Log security events. Default: true */
  logEvents: boolean;
  /** Sanitize content instead of blocking when possible. Default: false */
  sanitizeInsteadOfBlock: boolean;
  /** Allow enterprise users to bypass some checks. Default: false */
  allowEnterpriseBypass: boolean;
}

const defaultConfig: SecurityConfig = {
  blockThreshold: 50,
  logEvents: true,
  sanitizeInsteadOfBlock: false,
  allowEnterpriseBypass: false,
};

/**
 * Main security check function for API routes
 */
export function performSecurityCheck(
  content: string | Array<{ role: string; content: any }>,
  config: Partial<SecurityConfig> = {}
): SecurityCheckResult {
  const finalConfig = { ...defaultConfig, ...config };

  // Determine content type and check
  let result: SecurityCheckResult;
  
  if (typeof content === 'string') {
    result = checkTextContent(content);
  } else if (Array.isArray(content)) {
    result = checkMessages(content);
  } else {
    return { safe: true, threats: [], riskScore: 0 };
  }

  // Log security events if enabled
  if (finalConfig.logEvents && result.threats.length > 0) {
    console.log(JSON.stringify({
      type: 'security_threat_detected',
      timestamp: new Date().toISOString(),
      threatCount: result.threats.length,
      riskScore: result.riskScore,
      threats: result.threats.map(t => ({
        type: t.type,
        severity: t.severity,
        description: t.description,
      })),
    }));
  }

  // Determine if we should block
  result.safe = result.riskScore < finalConfig.blockThreshold;

  return result;
}

/**
 * Generate security block response
 */
export function securityBlockResponse(result: SecurityCheckResult): Response {
  const criticalThreats = result.threats.filter(t => t.severity === 'critical');
  const highThreats = result.threats.filter(t => t.severity === 'high');

  let message = 'Your message was blocked for security reasons.';
  
  if (criticalThreats.length > 0) {
    message = 'Your message contains content that violates our security policies.';
  } else if (highThreats.length > 0) {
    message = 'Your message appears to contain potentially harmful content. Please rephrase your request.';
  }

  return new Response(
    JSON.stringify({
      error: 'Security Block',
      message,
      code: 'SECURITY_VIOLATION',
    }),
    {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
