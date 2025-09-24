import { compare } from "bcrypt-ts";
import NextAuth, { type Session, type User, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { createUser, getUser, updateUserProfile } from "@/lib/db/queries";
import { authConfig } from "./auth.config";
import { generateUUID } from "@javin/shared/lib/utils/utils";

export const authOptions: NextAuthOptions = {
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);
        if (users.length === 0) return null;
        const passwordsMatch = await compare(password, users[0].password!);
        if (!passwordsMatch) return null;
        return users[0] as any;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // ✅ This is the key change. We will always re-fetch user data from the DB.
      // This ensures that any changes (like a plan upgrade) are immediately reflected in the session.
      if (token.email) {
        const [dbUser] = await getUser(token.email);
        if (dbUser) {
          // Update the token with the latest data from the database.
          token.id = dbUser.id;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.image = dbUser.image;
          token.username = dbUser.username;
          token.tier = dbUser.tier; // This is the most important part!
        } else {
          // If user is not found in DB, invalidate the session.
          return null;
        }
      } 
      // Handle initial sign-in for OAuth providers.
      else if (user?.email) {
        const [existingUser] = await getUser(user.email);
        if (existingUser) {
          // User already exists, populate token from DB.
          token.id = existingUser.id;
          token.email = existingUser.email;
          token.name = existingUser.name;
          token.image = existingUser.image;
          token.username = existingUser.username;
          token.tier = existingUser.tier;
        } else {
          // New OAuth user, create them.
          const newUserId = generateUUID();
          const [newUser] = await createUser(
            newUserId,
            user.email,
            null,
            user.name,
            user.image
          );
          token.id = newUser.id;
          token.name = newUser.name;
          token.email = newUser.email;
          token.image = newUser.image;
          token.username = newUser.username;
          token.tier = newUser.tier;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.image as string;
        session.user.username = token.username as string;
        session.user.tier = token.tier as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.includes('/api/auth/callback/google')) {
        return `${baseUrl}/?newuser=true`;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    }
  },
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authOptions);
