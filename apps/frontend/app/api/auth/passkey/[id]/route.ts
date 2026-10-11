import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { deletePasskeyCredential } from "@/lib/db/queries";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Passkey ID required" }, { status: 400 });
    }

    const deleted = await deletePasskeyCredential(id, session.user.id);
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Passkey not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Passkey removed successfully" });
  } catch (error) {
    console.error("Failed to delete passkey:", error);
    return NextResponse.json({ error: "Failed to delete passkey" }, { status: 500 });
  }
}
