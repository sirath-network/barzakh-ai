import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const [dbUser] = await db.select().from(user).where(eq(user.email, session.user.email));
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      twoFactorEnabled: dbUser.twoFactorEnabled || false,
      hasSecret: !!dbUser.twoFactorSecret,
    });
  } catch (error) {
    console.error("2FA status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
