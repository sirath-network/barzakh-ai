import { compare } from "bcrypt-ts";
import NextAuth, { type Session, type User } from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";

import { createUser, getUser, updateUserProfile, getUserById } from "@/lib/db/queries";
import { authConfig } from "./auth.config";
import { generateUUID } from "@barzakh/shared/lib/utils/utils";

// Cache for user data to prevent excessive DB queries
const userCache = new Map<string, { user: any; timestamp: number }>();
const CACHE_DURATION = 10 * 1000; // 10 seconds

export const authOptions: NextAuthConfig = {
  ...authConfig,
  logger: {
    error(code, ...message) {
      if (code.name === "CredentialsSignin") {
        return;
      }
      console.error(code, ...message);
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        sessionToken: { label: "Session Token", type: "text" },
      },
      async authorize({ email, password, sessionToken }: any) {
        // If sessionToken is provided, this is a 2FA completion
        if (sessionToken && sessionToken.trim() !== "") {
          try {
            const { jwtVerify } = await import("jose");
            const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret");
            
            const { payload } = await jwtVerify(sessionToken, secret);
            
            if (payload.type === "session" && payload.email) {
              const users = await getUser(payload.email as string);
              if (users.length > 0) {
                console.log("2FA session token verified successfully");
                return users[0] as any;
              }
            }
          } catch (error) {
            console.error("Session token verification failed:", error);
          }
          return null;
        }
        
        // Regular password authentication
        if (!email || !password) {
          console.log("Missing email or password for regular auth");
          return null;
        }
        
        const users = await getUser(email);
        if (users.length === 0) {
          console.log("User not found:", email);
          return null;
        }
        
        const passwordsMatch = await compare(password, users[0].password!);
        if (!passwordsMatch) {
          // console.log("Password mismatch for user:", email);
          return null;
        }
        
        return users[0] as any;
      },
    }),
    Credentials({
      id: "credentials-wallet",
      name: "Wallet",
      credentials: {
        address: { label: "Address", type: "text" },
        signature: { label: "Signature", type: "text" },
        message: { label: "Message", type: "text" },
      },
      async authorize(credentials: any) {
        try {
          const { address, signature, message } = credentials;
          
          if (!address || !signature || !message) return null;

          // 1. Verify the nonce from cookie
          const cookieStore = await cookies();
          const nonceToken = cookieStore.get("auth-nonce")?.value;
          
          if (!nonceToken) {
            console.error("No nonce found");
            return null;
          }

          const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret");
          const { jwtVerify } = await import("jose");
          const { payload } = await jwtVerify(nonceToken, secret);

          if (payload.address !== address) {
             console.error("Address mismatch");
             return null;
          }
          
          // Check if message contains the nonce
          if (!message.includes(payload.nonce as string)) {
             console.error("Invalid nonce in message");
             return null;
          }

          // 2. Verify the signature
          const { verifyMessage } = await import("viem");
          const isValid = await verifyMessage({
            address,
            message,
            signature,
          });

          if (!isValid) {
            console.error("Invalid signature");
            return null;
          }

          // 3. Find or create user
          const { getUserByWalletAddress, createUserWithWallet } = await import("@/lib/db/queries");
          const users = await getUserByWalletAddress(address);

          if (users.length > 0) {
            return users[0] as any;
          }

          // Create new user
          const { generateUUID } = await import("@barzakh/shared/lib/utils/utils");
          const newUser = await createUserWithWallet(generateUUID(), address);
          return newUser[0] as any;

        } catch (error) {
          console.error("Wallet auth error:", error);
          return null;
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }: any) {
      // If the client explicitly triggers a session update, merge the incoming
      // session data into the JWT and invalidate the local cache so UI updates
      // are reflected immediately without requiring a re-login.
      if (trigger === "update") {
        if (session?.user) {
          if (typeof session.user.name !== "undefined") token.name = session.user.name as any;
          if (typeof (session.user as any).username !== "undefined") token.username = (session.user as any).username as any;
          if (typeof session.user.image !== "undefined") token.image = session.user.image as any;
          if (typeof session.user.email !== "undefined") token.email = session.user.email as any;
          if (typeof (session.user as any).tokenVersion !== "undefined") token.tokenVersion = (session.user as any).tokenVersion as any;
        }
        // Invalidate cache using ID since that's what we use for caching
        if (token.id) {
          userCache.delete(token.id as string);
        }
        // Also try email for backward compatibility or if keyed by email elsewhere
        if (token.email) {
          userCache.delete(token.email as string);
        }
      }
      // Handle initial sign-in for OAuth providers.
      if (user?.email) {
        const startTime = Date.now();
        try {
          const [existingUser] = await getUser(user.email);
          const queryTime = Date.now() - startTime;
          
          if (queryTime > 1000) {
            console.warn(`⚠️ Slow getUser query: ${queryTime}ms for ${user.email}`);
          }
          
          if (existingUser) {
            // User already exists, populate token from DB.
            token.id = existingUser.id;
            token.email = existingUser.email;
            token.name = existingUser.name;
            token.image = existingUser.image;
            token.username = existingUser.username;
            token.tier = existingUser.tier;
            token.hasPassword = !!existingUser.password;
            token.tokenVersion = existingUser.tokenVersion;
          } else {
            // New OAuth user, create them.
            const createStartTime = Date.now();
            const newUserId = generateUUID();
            const [newUser] = await createUser(
              newUserId,
              user.email,
              null,
              user.name,
              user.image
            );
            const createTime = Date.now() - createStartTime;
            
            if (createTime > 1000) {
              console.warn(`⚠️ Slow createUser operation: ${createTime}ms for ${user.email}`);
            }
            
            token.id = newUser.id;
            token.name = newUser.name;
            token.email = newUser.email;
            token.image = newUser.image;
            token.username = newUser.username;
            token.tier = newUser.tier;
            token.billingCycle = newUser.billingCycle;
            token.hasPassword = false; // Google OAuth users don't have password initially
            token.tokenVersion = newUser.tokenVersion;
          }
        } catch (error) {
          console.error("❌ Error in OAuth callback:", error);
          throw error;
        }
      } 
      // Handle initial sign-in for Wallet users (who might not have email)
      else if (user && (user as any).walletAddress) {
         const dbUser = user as any;
         token.id = dbUser.id;
         token.name = dbUser.name;
         token.email = dbUser.email;
         token.image = dbUser.image;
         token.username = dbUser.username;
         token.tier = dbUser.tier;
         token.billingCycle = dbUser.billingCycle;
         token.hasPassword = !!dbUser.password;
         token.tokenVersion = dbUser.tokenVersion;
         token.walletAddress = dbUser.walletAddress;
      }
      // ✅ Optimized: Use caching to prevent excessive DB queries while still keeping data fresh
      else if (token.id) {
        const now = Date.now();
        const cached = userCache.get(token.id as string);
        
        // Use cached data if it's still fresh (less than 5 minutes old)
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          const dbUser = cached.user;
          
          // Check token version
          const tokenVer = token.tokenVersion ?? 0;
          const dbVer = dbUser.tokenVersion ?? 0;
          
          if (tokenVer !== dbVer) {
             console.log(`Token version mismatch (cached) for ${token.id}: token=${tokenVer}, db=${dbVer}`);
             return null;
          }

          token.id = dbUser.id;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.image = dbUser.image;
          token.username = dbUser.username;
          token.tier = dbUser.tier;
          token.billingCycle = dbUser.billingCycle;
          token.hasPassword = !!dbUser.password;
          token.walletAddress = dbUser.walletAddress;
        } else {
          // Cache miss or expired, fetch from DB
          const [dbUser] = await getUserById(token.id as string);
          if (dbUser) {
            // Check token version
            const tokenVer = token.tokenVersion ?? 0;
            const dbVer = dbUser.tokenVersion ?? 0;
            
            if (tokenVer !== dbVer) {
               console.log(`Token version mismatch (db) for ${token.id}: token=${tokenVer}, db=${dbVer}`);
               return null;
            }

            // Update the token with the latest data from the database.
            token.id = dbUser.id;
            token.name = dbUser.name;
            token.email = dbUser.email;
            token.image = dbUser.image;
            token.username = dbUser.username;
            token.tier = dbUser.tier;
            token.billingCycle = dbUser.billingCycle;
            token.hasPassword = !!dbUser.password;
            token.tokenVersion = dbUser.tokenVersion;
            token.walletAddress = dbUser.walletAddress;
            
            // Cache the result
            userCache.set(token.id as string, { user: dbUser, timestamp: now });
          } else {
            // If user is not found in DB, invalidate the session.
            return null;
          }
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.image as string;
        session.user.username = token.username as string;
        session.user.tier = token.tier as string;
        session.user.billingCycle = token.billingCycle as string;
        session.user.hasPassword = token.hasPassword as boolean;
        session.user.walletAddress = token.walletAddress as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }: any) {
      if (url.includes('/api/auth/callback/google')) {
        return `${baseUrl}/?newuser=true`;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authOptions);
