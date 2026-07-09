import dynamic from "next/dynamic";
import { cookies } from "next/headers";
import { DEFAULT_CHAT_MODEL } from "@barzakh/shared/lib/ai/models";
import { generateUUID } from "@barzakh/shared/lib/utils/utils";
import type { SearchGroupId } from "@barzakh/shared/lib/utils/utils";
import { auth } from "@/app/(auth)/auth";

const Chat = dynamic(() => import("@/components/chat").then((mod) => mod.Chat), {
  loading: () => (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      {/* Skeleton removed as requested */}
    </div>
  ),
});

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ group?: string }>;
}) {
  const id = generateUUID();
  const [session, cookieStore, params] = await Promise.all([
    auth(),
    cookies(),
    searchParams ?? Promise.resolve<{ group?: string }>({}),
  ]);
  const modelIdFromCookie = cookieStore.get("chat-model");
  const initialGroup: SearchGroupId = "search";

  if (!modelIdFromCookie) {
    return (
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        selectedChatModel={DEFAULT_CHAT_MODEL}
        selectedVisibilityType="private"
        isReadonly={false}
        user={session?.user}
        initialGroup={initialGroup}
      />
    );
  }

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={[]}
      selectedChatModel={modelIdFromCookie.value}
      selectedVisibilityType="private"
      isReadonly={false}
      user={session?.user}
      initialGroup={initialGroup}
    />
  );
}
