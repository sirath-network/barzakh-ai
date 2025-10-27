import { signOut } from "next-auth/react";

// Prevent multiple simultaneous logout attempts
let isLoggingOut = false;

/**
 * Centralized logout function that properly clears all authentication data
 */
export const handleLogout = async () => {
  // Prevent multiple simultaneous logout attempts
  if (isLoggingOut) {
    return;
  }
  isLoggingOut = true;
  try {
    // First, call NextAuth signOut without redirect
    await signOut({ redirect: false });
    
    // Clear all storage
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all possible NextAuth cookies
      const authCookies = [
        'next-auth.session-token',
        'next-auth.csrf-token', 
        'next-auth.callback-url',
        'authjs.session-token',
        'authjs.csrf-token',
        'authjs.callback-url',
        '__Secure-next-auth.session-token',
        '__Secure-next-auth.callback-url',
        '__Secure-next-auth.csrf-token',
        '__Secure-authjs.session-token',
        '__Secure-authjs.callback-url',
        '__Secure-authjs.csrf-token',
        '__Host-next-auth.csrf-token',
        '__Host-authjs.csrf-token'
      ];
      
      // Clear cookies with different domain and path combinations
      authCookies.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure`;
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; samesite=strict`;
      });
    }
    
    // Force redirect to login page with cache busting
    window.location.replace("/login");
    
  } catch (error) {
    console.error("Logout error:", error);
    // Even if there's an error, force redirect to login
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  } finally {
    // Reset the flag after a delay to allow for future logouts
    setTimeout(() => {
      isLoggingOut = false;
    }, 1000);
  }
};
