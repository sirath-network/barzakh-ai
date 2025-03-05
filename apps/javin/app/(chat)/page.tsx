import { cookies } from "next/headers";
import { Chat } from "@/components/chat";
import { DEFAULT_CHAT_MODEL } from "@javin/shared/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { auth } from "@/app/(auth)/auth";

export default async function Page() {
  const id = generateUUID();
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const modelIdFromCookie = cookieStore.get("chat-model");

  if (!modelIdFromCookie) {
    return (
      <>
        <Chat
          key={id}
          id={id}
          initialMessages={[]}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          selectedVisibilityType="private"
          isReadonly={false}
          user={session?.user}
        />
      </>
    );
  }

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        selectedChatModel={modelIdFromCookie.value}
        selectedVisibilityType="private"
        isReadonly={false}
        user={session?.user}
      />
    </>
  );
}
