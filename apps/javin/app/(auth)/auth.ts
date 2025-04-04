import { compare } from "bcrypt-ts";
import NextAuth, { type User, type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { createUser, getUser } from "@/lib/db/queries";

import { authConfig } from "./auth.config";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);
        if (users.length === 0) return null;
        // biome-ignore lint: Forbidden non-null assertion.
        const passwordsMatch = await compare(password, users[0].password!);
        if (!passwordsMatch) return null;
        return users[0] as any;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // If this is the first time JWT is being created
      if (user?.email) {
        const [dbUser] = await getUser(user.email);
        if (dbUser) {
          token.id = dbUser.id;
          token.tier = dbUser.tier;
          token.messageCount = dbUser.messageCount;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tier = token.tier as string; // Assign tier from token to session
        session.user.messageCount = token.messageCount as number; // Assign tier from token to session
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.email) {
        const [existingUser] = await getUser(user.email);
        if (!existingUser) {
          await createUser(user.email, null); // Assuming password is nullable in your DB
        }
      }
    },
  },
});
