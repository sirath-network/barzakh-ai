import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    username: string | null;
    tier: string;
    messageCount: number;
    hasPassword: boolean;
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
