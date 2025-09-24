import { auth } from "@/app/(auth)/auth";
import { resetRemainingMessageCountForUser } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await resetRemainingMessageCountForUser(session.user.id);

    return NextResponse.json({
      message: "Message limit reset successfully.",
    });
  } catch (error) {
    console.error("Failed to reset message limit:", error);
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
