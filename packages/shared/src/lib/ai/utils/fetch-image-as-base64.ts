const DEFAULT_TIMEOUT_MS = 15000;
const PROXY_TIMEOUT_MS = 20000;

interface FetchImageResult {
  base64: string;
  mimeType: string;
}

interface FetchOptions {
  timeoutMs?: number;
}

function buildUserAgent(): string {
  const frontendUrl = getFrontendUrl();
  if (frontendUrl) {
    return `Mozilla/5.0 (compatible; BarzakhAI/1.0; +${frontendUrl})`;
  }
  return "Mozilla/5.0 (compatible; BarzakhAI/1.0)";
}

function getDefaultHeaders(): Record<string, string> {
  return {
    "User-Agent": buildUserAgent(),
    Accept: "image/*",
  };
}

function getFrontendUrl(): string {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.AUTH_URL) {
    return process.env.AUTH_URL;
  }
  return "http://localhost:3000";
}

export async function fetchImageAsBase64(
  url: string,
  options: FetchOptions = {}
): Promise<FetchImageResult | null> {
  if (!url || typeof url !== "string") {
    return null;
  }

  if (url.startsWith("data:")) {
    const [header, data] = url.split(",");
    if (!header || !data) {
      return null;
    }

    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
    return { base64: data, mimeType };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Check if this is a legacy R2 URL (r2.sirath.network domain no longer exists)
  // Skip direct fetch and go straight to proxy for these URLs
  const isLegacyR2Url = url.includes('r2.sirath.network');

  if (!isLegacyR2Url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        headers: getDefaultHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText || "Unknown error"}`
        );
      }

      const mimeType = response.headers.get("content-type") || "image/jpeg";
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return { base64, mimeType };
    } catch (directFetchError) {
      console.warn(`Direct fetch failed for ${url}:`, directFetchError);
    }
  } else {
    console.log(`[fetchImageAsBase64] Legacy R2 URL detected, using proxy: ${url}`);
  }

  try {
    const frontendUrl = getFrontendUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

    const proxyResponse = await fetch(`${frontendUrl}/api/proxy-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl: url,
        internalSecret: process.env.INTERNAL_API_SECRET,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!proxyResponse.ok) {
      throw new Error(
        `Proxy fetch failed with status ${proxyResponse.status}: ${proxyResponse.statusText}`
      );
    }

    const mimeType = proxyResponse.headers.get("content-type") || "image/jpeg";
    const buffer = await proxyResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return { base64, mimeType };
  } catch (proxyError) {
    console.error(`Proxy fetch failed for ${url}:`, proxyError);
  }

  return null;
}
