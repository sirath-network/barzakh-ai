// Reserved usernames - only @sirath.network emails can use these
export const RESERVED_USERNAMES = [
    // Founder/Core Team
    'dev', 'developer', 'developers', 'barzakhdev', 'kafir', 'zomboy', 'sirath',
    // Admin/Staff roles
    'admin', 'administrator', 'mod', 'moderator', 'support', 'help', 'staff',
    'manager', 'owner', 'superuser', 'sysadmin', 'webmaster',
    // Brand names  
    'barzakh', 'barzakhai', 'barzakhtech', 'barzakhio', 'barzakhbot',
    // Common reserved
    'root', 'system', 'official', 'team', 'ceo', 'cto', 'cfo', 'founder', 'cofounder',
    'api', 'bot', 'info', 'contact', 'security', 'abuse', 'noreply', 'mailer',
    // Technical/System
    'null', 'undefined', 'localhost', 'server', 'client', 'database', 'test', 'demo',
    'billing', 'payment', 'payments', 'subscription', 'subscriptions',
    // Social/Common (note: 'user' and 'users' are NOT reserved - needed for Web3 usernames)
    'guest', 'anonymous', 'unknown', 'nobody', 'everyone', 'all',
    'account', 'accounts', 'profile', 'profiles', 'settings', 'config',
    'news', 'blog', 'press', 'media', 'marketing', 'sales', 'legal', 'privacy',
    // Crypto/Blockchain specific
    'wallet', 'wallets', 'crypto', 'blockchain', 'token', 'tokens', 'nft', 'nfts',
    'defi', 'dao', 'web3', 'ethereum', 'bitcoin', 'solana', 'sei', 'aptos',
];

/**
 * Check if username is reserved.
 * Returns true if username is reserved (or contains reserved words) and user should not use it.
 * 
 * @param username - The username to check
 * @param userEmail - The user's email (optional) - @sirath.network emails are allowed to use reserved names
 * @returns true if username is reserved and user is NOT allowed to use it
 */
export function isReservedUsername(username: string, userEmail?: string | null): boolean {
    const normalized = username.toLowerCase();
    const isReserved = RESERVED_USERNAMES.includes(normalized) ||
        RESERVED_USERNAMES.some(reserved => normalized.includes(reserved));

    if (!isReserved) return false;

    // Allow if user has @sirath.network email
    if (userEmail && userEmail.toLowerCase().endsWith('@sirath.network')) {
        return false; // Not restricted for core team
    }

    return true; // Reserved for non-core team
}
