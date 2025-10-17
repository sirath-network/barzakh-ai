import { NextResponse } from "next/server";
import { auth } from '@/app/(auth)/auth';
import { deleteUserAndData } from "@/lib/db/queries";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await deleteUserAndData(session.user.id, session.user.email);
    return NextResponse.json({ message: "Account deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete account:", error);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }
}
