import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  recallMemories,
  checkMemWalHealth,
  getUserNamespace,
} from "@barzakh/shared/lib/memory";
import {
  getWalrusMemorySettings,
  tombstoneWalrusMemory,
  clearAllWalrusMemories,
} from "@/lib/db/queries";

/**
 * GET /api/memory
 *
 * Returns the current user's recalled memories and MemWal health status.
 * Filters out tombstoned memories and uses the active namespace version.
 */
export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "What do you know about me?";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    // Check health
    const health = await checkMemWalHealth();

    // Fetch user memory settings (namespace version and tombstones)
    const settings = await getWalrusMemorySettings(userId);

    // Recall memories - for dashboard show stored memories without strict distance cutoff
    // Merges on-chain Walrus blobs with instantaneous hot cache
    const memories = await recallMemories(userId, query, limit, 1.0, {
      namespaceVersion: settings.namespaceVersion,
      cachedMemories: settings.cachedMemories,
      tombstones: {
        blobIds: settings.deletedBlobIds,
        texts: settings.deletedTexts,
      },
    });

    return NextResponse.json({
      userId,
      namespace: getUserNamespace(userId, settings.namespaceVersion),
      namespaceVersion: settings.namespaceVersion,
      tombstonesCount: settings.deletedBlobIds.length + settings.deletedTexts.length,
      health,
      query,
      memoryCount: memories.length,
      memories: memories.map((m, i) => ({
        index: i + 1,
        blobId: m.blobId || null,
        text: m.text,
        relevance: (1 - m.distance).toFixed(3),
        status: m.blobId ? "synced" : "indexing",
      })),
    });
  } catch (error) {
    console.error("[Memory API GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to recall memories", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/memory
 *
 * Deletes memories:
 * - If { clearAll: true }: bumps namespaceVersion, resetting user's entire memory space instantly.
 * - If { blobId, text }: tombstones the specific memory so it's never recalled or injected again.
 */
export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    const body = await request.json().catch(() => ({}));
    const { blobId, text, clearAll } = body;

    if (clearAll) {
      const res = await clearAllWalrusMemories(userId);
      return NextResponse.json({
        success: true,
        clearedAll: true,
        newNamespaceVersion: res.namespaceVersion,
        namespace: getUserNamespace(userId, res.namespaceVersion),
        message: "All memories cleared successfully",
      });
    }

    if (!blobId && !text) {
      return NextResponse.json(
        { error: "Either blobId, text, or clearAll must be provided" },
        { status: 400 }
      );
    }

    const updatedSettings = await tombstoneWalrusMemory(userId, blobId, text);

    return NextResponse.json({
      success: true,
      tombstoned: { blobId, text },
      settings: updatedSettings,
      message: "Memory deleted successfully",
    });
  } catch (error) {
    console.error("[Memory API DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete memory", details: String(error) },
      { status: 500 }
    );
  }
}
