"use server";

import { generateText, Message } from "ai";
import { cookies } from "next/headers";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
  updateChatTitleById,
  archiveChat as archiveChatById,
  restoreChat as restoreChatById,
  getChatById,
} from "@/lib/db/queries";
import { auth } from "@/app/(auth)/auth";
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
    model: myProvider.languageModel("xai-grok-4.1-fast"),
    system: `\n
    - Generate a creative, concise, and intelligent title (3-6 words) for this chat based on the user's first message.
    - Focus on the core intent, topic, or question rather than just summarizing words.
    - If it's a coding question, mention the language or technology.
    - Avoid generic titles like "Hello" or "Question".
    - Do not use quotes, colons, or unnecessary punctuation.
    - Make it sound like a sleek headline.`,
    prompt: userText,
  });

  return title;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const [message] = await getMessageById({ id });
  if (!message) {
    throw new Error("Message not found");
  }

  // Verify ownership via the chat
  const chat = await getChatById({ id: message.chatId });
  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

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
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const chat = await getChatById({ id: chatId });
  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  await updateChatVisiblityById({ chatId, visibility });
}

export async function updateChatTitle({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const chat = await getChatById({ id: chatId });
  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  // Validate title
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error("Chat title cannot be empty");
  }
  if (trimmedTitle.length > 200) {
    throw new Error("Chat title cannot exceed 200 characters");
  }
  await updateChatTitleById({ chatId, title: trimmedTitle });
}

export async function archiveChat({ chatId }: { chatId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const chat = await getChatById({ id: chatId });
  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  await archiveChatById({ id: chatId });
}

export async function restoreChat({ chatId }: { chatId: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const chat = await getChatById({ id: chatId });
  if (!chat || chat.userId !== session.user.id) {
    throw new Error("Forbidden");
  }

  await restoreChatById({ id: chatId });
}
 

// VAPID below
// DONT DELETE. WILL BE IMP IN FUTURE


// webpush.setVapidDetails(
//   'mailto:mohammad@lvmodel.com',
//   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
//   process.env.VAPID_PRIVATE_KEY!
// )
 
// let subscription: PushSubscription | null = null
 
// export async function subscribeUser(sub: PushSubscription) {
//   subscription = sub
//   // In a production environment, you would want to store the subscription in a database
//   // For example: await db.subscriptions.create({ data: sub })
//   return { success: true }
// }
 
// export async function unsubscribeUser() {
//   subscription = null
//   // In a production environment, you would want to remove the subscription from the database
//   // For example: await db.subscriptions.delete({ where: { ... } })
//   return { success: true }
// }
 
// export async function sendNotification(message: string) {
//   if (!subscription) {
//     throw new Error('No subscription available')
//   }
 
//   try {
//     await webpush.sendNotification(
//       // @ts-expect-error
//       subscription,
//       JSON.stringify({
//         title: 'Test Notification',
//         body: message,
//         icon: '/icon.png',
//       })
//     )
//     return { success: true }
//   } catch (error) {
//     console.error('Error sending push notification:', error)
//     return { success: false, error: 'Failed to send notification' }
//   }
// }