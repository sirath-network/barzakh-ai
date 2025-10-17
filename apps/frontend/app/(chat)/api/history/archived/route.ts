import { auth } from "@/app/(auth)/auth";
import { getArchivedChatsByUserId } from "@/lib/db/queries";

export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json("Unauthorized!", { status: 401 });
  }

  // biome-ignore lint: Forbidden non-null assertion.
  const chats = await getArchivedChatsByUserId({ id: session.user.id! });
  return Response.json(chats);
}
