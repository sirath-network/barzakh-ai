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
    // Clear all storage first
    if (typeof window !== "undefined") {
      localStorage.clear();
      sessionStorage.clear();
    }

    // Use NextAuth's signOut with redirect: true and callbackUrl
    // This ensures the server-side session is properly cleared before redirect
    // The key issue was that redirect: false + manual redirect doesn't wait for session clearing
    await signOut({
      callbackUrl: "/login",
      redirect: true
    });

    // Fallback redirect in case NextAuth redirect doesn't trigger
    window.location.href = "/login";

  } catch (error) {
    console.error("Logout error:", error);
    // Fallback: try the direct API approach
    if (typeof window !== "undefined") {
      try {
        // Get CSRF token for the signout request
        const csrfResponse = await fetch("/api/auth/csrf");
        const { csrfToken } = await csrfResponse.json();

        // Call the signout endpoint directly
        await fetch("/api/auth/signout", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            csrfToken,
            callbackUrl: "/login",
          }),
          credentials: "include",
        });
      } catch (fallbackError) {
        console.error("Fallback logout error:", fallbackError);
      }

      // Force redirect to login page
      window.location.href = "/login";
    }
  } finally {
    // Reset the flag after a delay to allow for future logouts
    setTimeout(() => {
      isLoggingOut = false;
    }, 1000);
  }
};
