import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { hash, compare } from "bcryptjs";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await auth();
    console.log("API: Current session:", session);

    if (!session?.user?.email) {
      console.log("API: No session or email found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("API: Request body:", body);
    
    const { fullName, username, avatar, currentPassword, password: newPassword } = body;

    // Fetch existing user
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, session.user.email));

    console.log("API: Found existing user:", existingUser ? 'Yes' : 'No');

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required" }, { status: 400 });
      }

      // Only check password if it's not a social account without a password
      if (existingUser.password) {
        const isMatch = await compare(currentPassword, existingUser.password);
        if (!isMatch) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }
        if (await compare(newPassword, existingUser.password)) {
            return NextResponse.json({ error: "New password cannot be the same as current password" }, { status: 400 });
        }
      }
    }

    // Prepare update object, only including fields that were provided
    const updateData: any = {};
    
    if (fullName !== undefined) {
      updateData.name = fullName?.trim() || null;
    }
    if (username !== undefined) {
      updateData.username = username?.trim() || null;
    }
    if (avatar !== undefined) {
      updateData.image = avatar?.trim() || null;
    }
    
    if (newPassword) {
      updateData.password = await hash(newPassword, 10);
    }

    // Check if there is anything to update
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "No update data provided" }, { status: 400 });
    }

    console.log("API: Update data:", updateData);

    // Perform update
    const updateResult = await db
      .update(user)
      .set(updateData)
      .where(eq(user.email, session.user.email))
      .returning({
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        email: user.email,
      });

    console.log("API: Update result:", updateResult);

    if (!updateResult || updateResult.length === 0) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    const updatedUser = updateResult[0];

    console.log("API: Returning updated user:", updatedUser);

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        username: updatedUser.username,
        image: updatedUser.image,
        email: updatedUser.email,
      },
    });

  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json({ 
      error: "Failed to update profile. Please try again.",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
