import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { hash, compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(100, "Password cannot be longer than 100 characters.")
  .refine(
    (password) => {
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[!@#$%^&*]/.test(password);
      return hasLowercase && hasUppercase && hasNumber && hasSpecialChar;
    },
    {
      message:
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (!@#$%^&*).",
    }
  );

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const usernameParam = searchParams.get("username")?.trim() ?? "";

    if (!usernameParam) {
      return NextResponse.json({ error: "USERNAME_REQUIRED" }, { status: 400 });
    }

    const normalized = usernameParam.toLowerCase();

    if (normalized.length < 3 || normalized.length > 20) {
      return NextResponse.json({ error: "USERNAME_INVALID_LENGTH" }, { status: 400 });
    }

    const valid = /^[a-z0-9]+$/.test(normalized);
    if (!valid) {
      return NextResponse.json({ error: "USERNAME_INVALID" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(user)
      .where(eq(user.username, normalized));

    if (existing.length === 0 || existing[0].email === session.user.email) {
      return NextResponse.json({ available: true });
    }

    return NextResponse.json({ available: false });
  } catch (error) {
    console.error("API: Username availability check failed", error);
    return NextResponse.json({ error: "USERNAME_CHECK_FAILED" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    console.log("API: Current session:", session);

    if (!session?.user?.email) {
      console.log("API: No session or email found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
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

    // If changing password, verify current password (only for users with existing passwords)
    if (newPassword) {
      // Only require current password for users who have one (not Google OAuth users)
      if (existingUser.password && !currentPassword) {
        return NextResponse.json({ error: "Current password is required" }, { status: 400 });
      }
      
      try {
        passwordValidation.parse(newPassword);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
        }
        throw error;
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
      const trimmed = username?.trim() || null;
      if (trimmed) {
        const normalized = trimmed.toLowerCase();
        // Validate allowed characters: lowercase letters and digits only
        const valid = /^[a-z0-9]+$/.test(normalized);
        if (!valid) {
          return NextResponse.json({ error: "USERNAME_INVALID" }, { status: 400 });
        }
        // Check uniqueness against other users
        const existingSameUsername = await db
          .select()
          .from(user)
          .where(eq(user.username, normalized));
        if (existingSameUsername.length > 0 && existingSameUsername[0].email !== session.user.email) {
          return NextResponse.json({ error: "USERNAME_TAKEN" }, { status: 409 });
        }
        updateData.username = normalized;
      } else {
        // Reject attempts to clear username
        return NextResponse.json({ error: "USERNAME_REQUIRED" }, { status: 400 });
      }
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
