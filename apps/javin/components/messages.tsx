// components/messages.tsx

import { ChatRequestOptions, Message } from "ai";
import { ThinkingMessage } from "./thinking-message";
import { PreviewMessage } from "./message";
import { Overview } from "./overview";
import { memo } from "react";
import { Vote } from "@/lib/db/schema";
import equal from "fast-deep-equal";
import { SearchGroupId } from "@javin/shared/lib/utils/utils";

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
      className={`relative flex flex-col min-w-0 w-full gap-4 md:gap-6 pt-4 ${
        messages.length === 0 ? "" : "flex-1"
      }`}
    >
      {messages.length === 0 && <Overview />}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
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
          showIcon={index > 0 && messages[index - 1].role == "user"}
        />
      ))}

      {isLoading &&
        messages.length > 0 &&
        messages[messages.length - 1].role === "user" && <ThinkingMessage />}

      <div className="shrink-0 h-8 w-full" />
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