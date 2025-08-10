import { compare } from "bcrypt-ts";
import NextAuth, { type Session, type User, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { createUser, getUser } from "@/lib/db/queries";
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
    async jwt({ token, user, trigger, session }) {
      // ✅ Jika ada trigger 'update', refresh data dari database
      if (trigger === "update" && session && token.email) {
        const [dbUser] = await getUser(token.email);
        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.image = dbUser.image;
          token.username = dbUser.username;
        }
      }

      // ✅ Logic existing untuk login pertama kali
      if (user?.email) {
        let dbUser;
        let isNewUser = false;
        const [existingUser] = await getUser(user.email);

        if (!existingUser) {
          const generatedId = generateUUID();
          await createUser(generatedId, user.email, null);
          isNewUser = true;
          dbUser = {
            id: generatedId,
            name: user.name ?? null,
            email: user.email,
            image: user.image ?? null,
            username: null,
            tier: "free",
            messageCount: 0,
          };
        } else {
          dbUser = existingUser;
        }

        token.id = dbUser.id;
        token.name = dbUser.name;
        token.email = dbUser.email;
        token.image = dbUser.image;
        token.username = dbUser.username;
        // Mark if this is a new user
        token.isNewUser = isNewUser;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.image as string;
        session.user.username = token.username as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If this was a callback and we have a new user, force a refresh
      if (url.includes('/api/auth/callback/google')) {
        return `${baseUrl}/?newuser=true`;
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    }
  },
};

// 👇 Tetap ekspor handler NextAuth untuk route API auth
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authOptions);