import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    username: string | null;
    tier: string;
    messageCount: number;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      username: string | null;
      tier: string;
    } & DefaultSession["user"];
  }
}
