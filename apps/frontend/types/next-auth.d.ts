import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    username: string | null;
    tier: string;
    messageCount: number;
    hasPassword: boolean;
    tokenVersion?: number;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      username: string | null;
      tier: string;
      hasPassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    username?: string | null;
    tier?: string;
    hasPassword?: boolean;
    tokenVersion?: number;
  }
}
