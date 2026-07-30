'use client';

import { useState, useEffect, useCallback } from 'react';

interface SignedUrlState {
    url: string | null;
    isLoading: boolean;
    error: string | null;
    expiresAt: Date | null;
}

interface SignedUrlResponse {
    signedUrl: string;
    expiresAt: string;
    key: string;
}

interface CachedSignedUrl {
    signedUrl: string;
    expiresAt: Date;
    key: string;
}

// In-memory cache for signed URLs to reduce API calls
// Cache entries are automatically invalidated 2 minutes before expiration
const signedUrlCache = new Map<string, CachedSignedUrl>();

// Cache buffer - invalidate cache this many ms before actual expiration
const CACHE_BUFFER_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Get a cached signed URL if still valid
 */
function getCachedUrl(key: string): CachedSignedUrl | null {
    const cached = signedUrlCache.get(key);
    if (!cached) return null;

    // Check if cache entry is still valid (with buffer)
    const now = Date.now();
    const expiresWithBuffer = cached.expiresAt.getTime() - CACHE_BUFFER_MS;

    if (now >= expiresWithBuffer) {
        // Cache expired or about to expire, remove it
        signedUrlCache.delete(key);
        return null;
    }

    return cached;
}

/**
 * Store a signed URL in cache
 */
function cacheSignedUrl(key: string, signedUrl: string, expiresAt: Date): void {
    signedUrlCache.set(key, { signedUrl, expiresAt, key });
}

/**
 * Check if a URL is an R2 storage URL or key that needs signing
 */
function isR2UrlOrKey(urlOrKey: string): boolean {
    if (!urlOrKey) return false;

    // Check for r2:// prefix (stored key format)
    if (urlOrKey.startsWith('r2://')) return true;

    // Check for R2 cloudflarestorage.com domain (new format)
    if (urlOrKey.includes('.r2.cloudflarestorage.com')) return true;

    // Check for legacy R2 custom domain (backward compatibility)
    if (urlOrKey.includes('r2.sirath.network')) return true;

    return false;
}

/**
 * Extract the R2 key from a URL or return the key if already in key format
 */
function extractKey(urlOrKey: string): string {
    // Handle r2:// prefix
    if (urlOrKey.startsWith('r2://')) {
        return urlOrKey.slice(5);
    }

    // Handle cloudflarestorage.com URLs (new format)
    // Format: https://<account-id>.r2.cloudflarestorage.com/<bucket>/<key>
    const cloudflareMatch = urlOrKey.match(/https?:\/\/[^\/]+\.r2\.cloudflarestorage\.com\/[^\/]+\/(.+)/);
    if (cloudflareMatch) {
        return cloudflareMatch[1];
    }

    // Handle legacy r2.sirath.network URLs (backward compatibility)
    const legacyMatch = urlOrKey.match(/https?:\/\/r2\.barzakh\.tech\/(.+)/);
    if (legacyMatch) {
        return legacyMatch[1];
    }

    // Return as-is (might already be a key)
    return urlOrKey;
}

/**
 * Hook to fetch and manage signed URLs for R2 storage
 * 
 * @param imageUrlOrKey - Either a full R2 URL, r2:// prefixed key, regular URL, or null/undefined
 * @returns Object with signed URL, loading state, and error
 */
export function useSignedR2Url(imageUrlOrKey: string | null | undefined): SignedUrlState {
    const [state, setState] = useState<SignedUrlState>({
        url: null,
        isLoading: true,
        error: null,
        expiresAt: null,
    });

    const fetchSignedUrl = useCallback(async () => {
        if (!imageUrlOrKey) {
            setState({ url: null, isLoading: false, error: 'No URL provided', expiresAt: null });
            return;
        }

        // If it's not an R2 URL/key, use it directly
        if (!isR2UrlOrKey(imageUrlOrKey)) {
            setState({ url: imageUrlOrKey, isLoading: false, error: null, expiresAt: null });
            return;
        }

        const key = extractKey(imageUrlOrKey);

        // Check cache first
        const cached = getCachedUrl(key);
        if (cached) {
            setState({
                url: cached.signedUrl,
                isLoading: false,
                error: null,
                expiresAt: cached.expiresAt,
            });
            return;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const response = await fetch(`/api/r2/signed-url?key=${encodeURIComponent(key)}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data: SignedUrlResponse = await response.json();
            const expiresAt = new Date(data.expiresAt);

            // Cache the signed URL
            cacheSignedUrl(key, data.signedUrl, expiresAt);

            setState({
                url: data.signedUrl,
                isLoading: false,
                error: null,
                expiresAt,
            });
        } catch (error) {
            console.error('Failed to fetch signed URL:', error);
            // Fallback: try using the original URL directly
            setState({
                url: imageUrlOrKey.startsWith('r2://') ? null : imageUrlOrKey,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to fetch signed URL',
                expiresAt: null,
            });
        }
    }, [imageUrlOrKey]);

    useEffect(() => {
        fetchSignedUrl();
    }, [fetchSignedUrl]);

    // Refresh signed URL before it expires (5 minutes before expiry)
    useEffect(() => {
        if (!state.expiresAt) return;

        const refreshBuffer = 5 * 60 * 1000; // 5 minutes
        const timeUntilRefresh = state.expiresAt.getTime() - Date.now() - refreshBuffer;

        if (timeUntilRefresh <= 0) {
            // Already expired or about to expire, refresh immediately
            fetchSignedUrl();
            return;
        }

        const timeout = setTimeout(() => {
            fetchSignedUrl();
        }, timeUntilRefresh);

        return () => clearTimeout(timeout);
    }, [state.expiresAt, fetchSignedUrl]);

    return state;
}

/**
 * Utility to get a signed URL on-demand (for use outside of hooks)
 */
export async function getSignedUrlForR2(urlOrKey: string): Promise<string> {
    if (!urlOrKey) throw new Error('No URL provided');

    // If it's not an R2 URL/key, return it directly
    if (!isR2UrlOrKey(urlOrKey)) {
        return urlOrKey;
    }

    const key = extractKey(urlOrKey);
    const response = await fetch(`/api/r2/signed-url?key=${encodeURIComponent(key)}`);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data: SignedUrlResponse = await response.json();
    return data.signedUrl;
}
