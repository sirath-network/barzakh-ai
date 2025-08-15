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
    async jwt({ token, user, account, trigger, session }) {
      // Handle session updates from the client (e.g., profile update)
      if (trigger === "update" && session?.user) {
        token.name = session.user.name;
        token.image = session.user.image;
        token.username = session.user.username;
      }

      // Handle initial sign-in
      if (user?.email) {
        const [existingUser] = await getUser(user.email);

        if (existingUser) {
          // User exists, link the account.
          token.id = existingUser.id;
          token.email = existingUser.email;
          token.username = existingUser.username;
          token.tier = existingUser.tier;

          // Merge profile information: fill in missing data from provider.
          const nameToSet = existingUser.name || user.name;
          const imageToSet = existingUser.image || user.image;

          token.name = nameToSet;
          token.image = imageToSet;

          // If we updated the name or image, persist it to the database.
          if (nameToSet !== existingUser.name || imageToSet !== existingUser.image) {
            await updateUserProfile({ email: existingUser.email, name: nameToSet, image: imageToSet });
          }
        } else {
          // If user does not exist, create a new user (primarily for OAuth)
          const newUserId = generateUUID();
          const [newUser] = await createUser(
            newUserId,
            user.email,
            null, // No password for OAuth users
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