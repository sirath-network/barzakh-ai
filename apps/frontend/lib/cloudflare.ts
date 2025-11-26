/**
 * Cloudflare Protection Utilities
 * 
 * These utilities help integrate Cloudflare security features with your API routes.
 * Most protection is handled at the Cloudflare edge, but these provide additional
 * server-side validation and helper functions.
 */

import { NextRequest } from "next/server";

// Cloudflare headers passed to origin
export interface CloudflareHeaders {
  /** True client IP (even behind proxies) */
  cfConnectingIp: string | null;
  /** Two-letter country code */
  cfIpCountry: string | null;
  /** Cloudflare Ray ID for debugging */
  cfRay: string | null;
  /** Visitor's connection type */
  cfVisitor: { scheme: string } | null;
  /** Bot score (0-99, lower = more likely bot) - Enterprise only */
  cfBotScore: number | null;
  /** Verified bot status */
  cfVerifiedBot: boolean;
  /** Threat score (0-100, higher = more threat) */
  cfThreatScore: number | null;
  /** WAF matched rules */
  cfWafMatchedRules: string | null;
}

/**
 * Extract Cloudflare headers from request
 */
export function getCloudflareHeaders(request: NextRequest): CloudflareHeaders {
  const headers = request.headers;

  let cfVisitor = null;
  try {
    const visitorHeader = headers.get("cf-visitor");
    if (visitorHeader) {
      cfVisitor = JSON.parse(visitorHeader);
    }
  } catch {
    // Ignore parse errors
  }

  return {
    cfConnectingIp: headers.get("cf-connecting-ip"),
    cfIpCountry: headers.get("cf-ipcountry"),
    cfRay: headers.get("cf-ray"),
    cfVisitor,
    cfBotScore: headers.get("cf-bot-score") ? parseInt(headers.get("cf-bot-score")!, 10) : null,
    cfVerifiedBot: headers.get("cf-verified-bot") === "true",
    cfThreatScore: headers.get("cf-threat-score") ? parseInt(headers.get("cf-threat-score")!, 10) : null,
    cfWafMatchedRules: headers.get("cf-waf-matched-rules"),
  };
}

/**
 * Get the real client IP (works with Cloudflare proxy)
 */
export function getClientIp(request: NextRequest): string {
  // Cloudflare provides the real IP in cf-connecting-ip
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Fallback to x-forwarded-for (Vercel)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  // Fallback to x-real-ip
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

/**
 * Check if request is from a verified bot (Googlebot, etc.)
 */
export function isVerifiedBot(request: NextRequest): boolean {
  return request.headers.get("cf-verified-bot") === "true";
}

/**
 * Get bot score (Enterprise feature)
 * Returns null if not available, otherwise 0-99 (lower = more likely bot)
 */
export function getBotScore(request: NextRequest): number | null {
  const score = request.headers.get("cf-bot-score");
  return score ? parseInt(score, 10) : null;
}

/**
 * Check if request is likely from a bot based on bot score
 * Threshold of 30 is recommended by Cloudflare
 */
export function isLikelyBot(request: NextRequest, threshold: number = 30): boolean {
  const score = getBotScore(request);
  if (score === null) return false; // Can't determine, assume human
  return score < threshold;
}

/**
 * Get threat score (0-100, higher = more threat)
 */
export function getThreatScore(request: NextRequest): number | null {
  const score = request.headers.get("cf-threat-score");
  return score ? parseInt(score, 10) : null;
}

/**
 * Check if request is from a high-threat source
 */
export function isHighThreat(request: NextRequest, threshold: number = 50): boolean {
  const score = getThreatScore(request);
  if (score === null) return false;
  return score > threshold;
}

/**
 * Validate Cloudflare Turnstile token
 */
export async function validateTurnstileToken(
  token: string,
  ip?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  
  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY not configured");
    return { success: false, error: "Turnstile not configured" };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip) {
      formData.append("remoteip", ip);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const result = await response.json();

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result["error-codes"]?.join(", ") || "Verification failed",
    };
  } catch (error) {
    console.error("Turnstile validation error:", error);
    return { success: false, error: "Verification request failed" };
  }
}

/**
 * Stripe webhook IP addresses for allowlisting
 * @see https://stripe.com/docs/ips
 */
export const STRIPE_WEBHOOK_IPS = [
  "3.18.12.63",
  "3.130.192.231",
  "13.235.14.237",
  "13.235.122.149",
  "18.211.135.69",
  "35.154.171.200",
  "52.15.183.38",
  "54.88.130.119",
  "54.88.130.237",
  "54.187.174.169",
  "54.187.205.235",
  "54.187.216.72",
];

/**
 * Check if request is from Stripe webhook
 */
export function isStripeWebhook(request: NextRequest): boolean {
  const ip = getClientIp(request);
  const hasSignature = !!request.headers.get("stripe-signature");
  const isStripeIp = STRIPE_WEBHOOK_IPS.includes(ip);
  
  return hasSignature && isStripeIp;
}

/**
 * Rate limit response helper
 */
export function rateLimitResponse(retryAfter: number = 60): Response {
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": (Date.now() + retryAfter * 1000).toString(),
      },
    }
  );
}

/**
 * Block response helper
 */
export function blockResponse(reason: string = "Forbidden"): Response {
  return new Response(
    JSON.stringify({
      error: "Forbidden",
      message: reason,
    }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Security headers to add to responses
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * Add security headers to a response
 */
export function withSecurityHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(key, value);
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Validate cron job request (for Vercel cron)
 */
export function isValidCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    // If no secret configured, check for Vercel cron header
    return request.headers.get("x-vercel-cron") === "true";
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Log security event for monitoring
 */
export function logSecurityEvent(
  event: string,
  request: NextRequest,
  details?: Record<string, unknown>
): void {
  const cfHeaders = getCloudflareHeaders(request);
  
  console.log(JSON.stringify({
    type: "security_event",
    event,
    timestamp: new Date().toISOString(),
    ip: cfHeaders.cfConnectingIp || getClientIp(request),
    country: cfHeaders.cfIpCountry,
    ray: cfHeaders.cfRay,
    path: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get("user-agent"),
    botScore: cfHeaders.cfBotScore,
    threatScore: cfHeaders.cfThreatScore,
    ...details,
  }));
}
