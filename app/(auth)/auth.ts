import { compare } from "bcrypt-ts";
import NextAuth, { type User, type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { parse } from "cookie";
import {
  createUser,
  createUserByWalletAddress,
  getUserByEmail,
  getUserByWalletAddress,
} from "@/lib/db/queries";

import { authConfig } from "./auth.config";
import { SiweMessage } from "siwe";
import { getCsrfToken } from "next-auth/react";
import { cookies } from "next/headers";
import { generateUUID } from "@/lib/utils";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "email-login",
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUserByEmail(email);
        if (users.length === 0) return null;
        // biome-ignore lint: Forbidden non-null assertion.
        const passwordsMatch = await compare(password, users[0].password!);
        if (!passwordsMatch) return null;
        return users[0] as any;
      },
    }),
    Credentials({
      name: "Ethereum",
      credentials: {
        message: {
          label: "Message",
          type: "text",
          placeholder: "0x0",
        },
        signature: {
          label: "Signature",
          type: "text",
          placeholder: "0x0",
        },
      },
      async authorize(credentials, req) {
        // console.log(
        //   "credentials.message --------------- ",
        //   typeof credentials.signature
        // );
        try {
          const siwe = new SiweMessage(credentials?.message || "{}");
          const nextAuthUrl = new URL(process.env.NEXTAUTH_URL!);
          // Extract the nonce from cookies (since getCsrfToken() can't be used server-side)
          const csrf = (await cookies())
            .get("next-auth.csrf-token")
            ?.value.split("|")[0];

          const result = await siwe.verify({
            signature: credentials.signature as string,
            domain: nextAuthUrl.host,
            nonce: csrf, // Use extracted nonce
          });
          // console.log("result -------------- ", result);
          if (result.success) {
            console.log("sign in success with wallet", siwe.address);
            const walletAddress = siwe.address;
            const users = await getUserByWalletAddress(walletAddress);

            if (users.length === 0) {
              let id = generateUUID();
              await createUserByWalletAddress(id, walletAddress);
              return {
                id: id,
                walletAddress: siwe.address,
                tier: "free",
                messageCount: 0,
              };
            } else {
              return {
                id: users[0].id,
                walletAddress: siwe.address,
                tier: "free",
                messageCount: 0,
              };
            }
          }
          return null;
        } catch (e) {
          console.log(e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // console.log("user", token)
      if (user) {
        token.id = user.id;
        token.tier = user.tier; // Add tier to the token
        token.messageCount = user.messageCount as number; // Add tier to the token
        token.walletAddress = user.walletAddress as string;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tier = token.tier as string; // Assign tier from token to session
        session.user.messageCount = token.messageCount as number; // Assign tier from token to session
        session.user.walletAddress = token.walletAddress as string;
      }
      return session;
    },
  },
});
