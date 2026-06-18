// components/messages.tsx

import { ChatRequestOptions, Message } from "ai";
import { ThinkingMessage } from "./thinking-message";
import { PreviewMessage } from "./message";
import { Overview } from "./overview";
import { memo } from "react";
import { Vote } from "@/lib/db/schema";
import equal from "fast-deep-equal";
import { SearchGroupId } from "@barzakh/shared/lib/utils/utils";

const PreviewMessageAny = PreviewMessage as any;
const ThinkingMessageAny = ThinkingMessage as any;

interface MessagesProps {
  chatId: string;
  isLoading: boolean;
  votes: Array<Vote> | undefined;
  messages: Array<Message>;
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[])
  ) => void;
  selectedGroup: SearchGroupId;
  reload: (
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
}

function PureMessages({
  chatId,
  isLoading,
  votes,
  messages,
  setMessages,
  selectedGroup,
  reload,
  isReadonly,
}: MessagesProps) {
  return (
    <div
      className={`relative flex flex-col min-w-0 w-full max-w-full gap-3 md:gap-4 pt-3 ${
        messages.length === 0 ? "flex-1 justify-center md:justify-start" : "flex-1"
      }`}
    >
      {messages.length === 0 && <Overview />}

      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const isUserAfterAssistant =
          message.role === "user" && prevMessage?.role === "assistant";

        return (
          <div
            key={message.id}
            className={isUserAfterAssistant ? "mt-5 md:mt-6" : ""}
          >
            <PreviewMessageAny
              chatId={chatId}
              message={message}
              isLoading={isLoading && messages.length - 1 === index}
              vote={
                votes
                  ? votes.find((vote) => vote.messageId === message.id)
                  : undefined
              }
              setMessages={setMessages}
              selectedGroup={selectedGroup}
              reload={reload}
              isReadonly={isReadonly}
              allMessages={messages}
            />
          </div>
        );
      })}

      {isLoading &&
        messages.length > 0 &&
        messages[messages.length - 1].role === "user" && (
          <ThinkingMessageAny messages={messages} />
        )}

      <div className="shrink-0 h-28 md:h-10 w-full" />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;
  if (!equal(prevProps.selectedGroup, nextProps.selectedGroup)) return false;
  return true;
});