import dynamic from "next/dynamic";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/app/(auth)/auth";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";
import { DEFAULT_CHAT_MODEL } from "@barzakh/shared/lib/ai/models";

const Chat = dynamic(() => import("@/components/chat").then((mod) => mod.Chat), {
  loading: () => (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <div className="flex items-center h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-8 h-8 rounded-full bg-muted/50 animate-pulse" />
        <div className="ml-4 w-32 h-5 rounded bg-muted/50 animate-pulse" />
      </div>
      <div className="flex-1 flex flex-col p-4 gap-6 overflow-hidden">
        <div className="flex justify-end">
          <div className="w-2/3 h-16 rounded-2xl rounded-tr-sm bg-muted/20 animate-pulse" />
        </div>
        <div className="flex justify-start">
          <div className="w-2/3 h-32 rounded-2xl rounded-tl-sm bg-muted/10 animate-pulse" />
        </div>
        <div className="flex justify-end">
          <div className="w-1/2 h-12 rounded-2xl rounded-tr-sm bg-muted/20 animate-pulse" />
        </div>
      </div>
      <div className="p-4 w-full flex justify-center pb-8">
        <div className="w-full max-w-3xl h-14 rounded-full bg-muted/20 animate-pulse" />
      </div>
    </div>
  ),
});

// Dynamic page title based on chat title
export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const { id } = params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return { title: "Barzakh AI" };
  }

  const chat = await getChatById({ id });

  if (!chat || !chat.title) {
    return { title: "Barzakh AI" };
  }

  return {
    title: chat.title,
  };
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  // Validate that id is a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  // Parallelize all async operations for faster page load
  const [chat, session, messagesFromDb, cookieStore] = await Promise.all([
    getChatById({ id }),
    auth(),
    getMessagesByChatId({ id }),
    cookies(),
  ]);

  if (!chat) {
    notFound();
  }

  if (chat.visibility === "private") {
    if (!session || !session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  // Hide archived public/shared chats from non-owners (both guests and logged-in users)
  if (chat.isArchived && session?.user?.id !== chat.userId) {
    return notFound();
  }

  const chatModelFromCookie = cookieStore.get("chat-model");

  if (!chatModelFromCookie) {
    return (
      <Chat
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        selectedChatModel={DEFAULT_CHAT_MODEL}
        selectedVisibilityType={chat.visibility}
        isReadonly={session?.user?.id !== chat.userId || chat.isArchived}
        isArchived={chat.isArchived}
        user={session?.user}
        isSharedChat={chat.visibility === 'public' && !!session?.user?.id && session.user.id !== chat.userId}
      />
    );
  }

  return (
    <Chat
      id={chat.id}
      initialMessages={convertToUIMessages(messagesFromDb)}
      selectedChatModel={chatModelFromCookie.value}
      selectedVisibilityType={chat.visibility}
      isReadonly={session?.user?.id !== chat.userId || chat.isArchived}
      isArchived={chat.isArchived}
      user={session?.user}
      isSharedChat={chat.visibility === 'public' && !!session?.user?.id && session.user.id !== chat.userId}
    />
  );
}
