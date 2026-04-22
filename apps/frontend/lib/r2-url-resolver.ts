'use server';

import { getSignedR2Url, isR2Url, extractR2Key } from '@/lib/r2-storage';
import { type Message } from 'ai';

/**
 * Resolve legacy R2 URLs (r2.barzakh.tech) to signed URLs before sending to AI
 * This is needed because the old custom domain no longer exists
 */
export async function resolveR2UrlsInMessages(messages: any[]): Promise<any[]> {
    const resolvedMessages: Message[] = [];

    for (const message of messages) {
        if (!Array.isArray(message.content)) {
            resolvedMessages.push(message);
            continue;
        }

        const resolvedContent: any[] = [];
        let hasModifications = false;

        for (const part of message.content as any[]) {
            // Check for image parts with R2 URLs
            if (part.type === 'image' && part.image) {
                let imageUrl = '';
                let isUrlObject = false;

                if (typeof part.image === 'string') {
                    imageUrl = part.image;
                } else if (part.image instanceof URL) {
                    imageUrl = part.image.toString();
                    isUrlObject = true;
                }

                // Check if it's a legacy R2 URL that needs resolution
                if (imageUrl && (imageUrl.includes('r2.barzakh.tech') || isR2Url(imageUrl))) {
                    try {
                        const key = extractR2Key(imageUrl);
                        if (key) {
                            const signedUrl = await getSignedR2Url(key);
                            if (signedUrl) {
                                console.log(`[resolveR2Urls] Resolved legacy R2 URL: ${imageUrl.slice(0, 50)}...`);
                                resolvedContent.push({
                                    ...part,
                                    image: isUrlObject ? new URL(signedUrl) : signedUrl,
                                });
                                hasModifications = true;
                                continue;
                            }
                        }
                    } catch (error) {
                        console.error(`[resolveR2Urls] Failed to resolve R2 URL: ${imageUrl}`, error);
                    }
                }
            }

            resolvedContent.push(part);
        }

        if (hasModifications) {
            resolvedMessages.push({
                ...message,
                content: resolvedContent as any,
            });
        } else {
            resolvedMessages.push(message);
        }
    }

    return resolvedMessages;
}
