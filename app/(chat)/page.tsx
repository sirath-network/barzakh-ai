import { cookies } from "next/headers";

import { Chat } from "@/components/chat";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { auth } from "@/app/(auth)/auth";
import { saveSearchModeAsCookie } from "./actions";

export default async function Page() {
  const id = generateUUID();
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const modelIdFromCookie = cookieStore.get("chat-model");
  const searchModeId = cookieStore.get("search-mode");
  // console.log("search mode id", searchModeId?.value);
  // if (!searchModeId) {
  //   saveSearchModeAsCookie("search");
  // }

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
          //@ts-ignore
          searchModeId={searchModeId?.value}
        />
        <DataStreamHandler id={id} />
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
        //@ts-ignore
        searchModeId={searchModeId?.value}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
