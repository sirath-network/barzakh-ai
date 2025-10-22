"use server";

import { generateText, Message } from "ai";
import { cookies } from "next/headers";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
  archiveChat as archiveChatById,
  restoreChat as restoreChatById,
} from "@/lib/db/queries";
import { VisibilityType } from "@/components/visibility-selector";
import { myProvider } from "@barzakh/shared/lib/ai/models";
import { SearchGroupId } from "@barzakh/shared/lib/utils/utils";
// import webpush from 'web-push'

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function saveSearchModeAsCookie(mode: SearchGroupId) {
  const cookieStore = await cookies();
  cookieStore.set("search-mode", mode);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: Message;
}) {
  let userText = "";
  if (typeof message.content === "string") {
    userText = message.content;
  } else if (Array.isArray(message.content)) {
    const textPart = (message.content as any[]).find((part) => part.type === "text");
    if (textPart && "text" in textPart) {
      userText = textPart.text;
    }
  }

  if (!userText) {
    return "New Chat";
  }

  const { text: title } = await generateText({
    model: myProvider.languageModel("title-model"),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: userText,
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

export async function archiveChat({ chatId }: { chatId: string }) {
  await archiveChatById({ id: chatId });
}

export async function restoreChat({ chatId }: { chatId: string }) {
  await restoreChatById({ id: chatId });
}