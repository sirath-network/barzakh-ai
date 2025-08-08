// components/messages.tsx

import { ChatRequestOptions, Message } from "ai";
import { PreviewMessage, ThinkingMessage } from "./message";
import { Overview } from "./overview";
import { memo, useEffect, useRef, useCallback } from "react";
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
  setIsAtBottom: (isAtBottom: boolean) => void;
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
  setIsAtBottom,
  selectedGroup,
  reload,
  isReadonly,
}: MessagesProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ==================================================================
  // === BLOK KODE YANG DITAMBAHKAN ===
  //
  // Efek ini akan berjalan setiap kali array 'messages' diperbarui.
  // Ini memastikan bahwa tampilan akan otomatis scroll ke bawah
  // baik saat chat history dimuat maupun saat pesan baru ditambahkan.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]); // Bergantung pada 'messages' untuk trigger
  // ==================================================================


  // Bungkus logika handleScroll dengan useCallback
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const threshold = 250;
    const isBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    setIsAtBottom(isBottom);
  }, [setIsAtBottom]); // Jadikan setIsAtBottom sebagai dependensi

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll);
      handleScroll(); // Panggil saat mount untuk pengecekan awal
    }

    return () => {
      if (el) {
        el.removeEventListener("scroll", handleScroll);
      }
    };
  }, [handleScroll]); // Gunakan handleScroll yang sudah di-memoize sebagai dependensi

  return (
    <div
      id="chat-scroll"
      ref={scrollRef}
      className={`relative flex flex-col min-w-0 w-full gap-4 md:gap-6 overflow-y-scroll custom-scrollbar pt-4 ${
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

      {messages.length > 0 && (
        <div className="shrink-0 min-w-[24px] min-h-[24px]" />
      )}
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isLoading && nextProps.isLoading) return false;
  // Kita hapus pengecekan panjang pesan agar useEffect bisa berjalan
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;
  if (!equal(prevProps.selectedGroup, nextProps.selectedGroup)) return false;

  return true;
});