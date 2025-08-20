"use client";
import type { Attachment, Message } from "ai";
import { useChat } from "ai/react";
// BARU: Impor useRef dan useEffect
import { useState, useRef, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ChatHeader } from "@/components/chat-header";
import type { Vote, Chat as ChatHistory } from "@/lib/db/schema";
import {
  fetcher,
  generateUUID,
  SearchGroupId,
} from "@javin/shared/lib/utils/utils";
import { MultimodalInput } from "./Input/multimodal-input";
import { Messages } from "./messages";
import { VisibilityType } from "./visibility-selector";
import { toast } from "sonner";
import { User } from "next-auth";
import { InstallPrompt } from "./install-prompt";

import { useView } from "@/context/view-context";
import AccountSettingsPage from "@/components/settings/account/account-page";
import EmailSettingsPage from "@/components/settings/email/email-page";
import PasswordSettingsPage from "@/components/settings/password/password-page";
import BillingSettingsPage from "@/components/settings/billing/billing-page";

const settingsViews: Record<string, React.ReactNode> = {
  account: <AccountSettingsPage />,
  email: <EmailSettingsPage />,
  password: <PasswordSettingsPage />,
  billing: <BillingSettingsPage />,
};

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
  user,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  user?: User;
}) {
  const { mutate } = useSWRConfig();
  const { view, setView } = useView();

  const { data: history } = useSWR<Array<ChatHistory>>(
    user ? "/api/history" : null,
    fetcher
  );

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, selectedChatModel: selectedChatModel },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate("/api/history");
    },
    onError: (error: any) => {
      console.log(error);
      toast.error(error.message);
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher
  );
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const [selectedGroup, setSelectedGroup] = useState<SearchGroupId>("search");
  const [isAtBottom, setIsAtBottom] = useState(true);

  // BARU: Semua logika scroll sekarang ada di sini
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Efek untuk auto-scroll saat pesan baru ditambahkan
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el && isAtBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, isAtBottom]);

  // Efek untuk mendeteksi posisi scroll
  useEffect(() => {
    const el = chatContainerRef.current;
    
    const handleScroll = () => {
      if (!el) return;
      const threshold = 10;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
      setIsAtBottom(atBottom);
    };

    if (el) {
      el.addEventListener("scroll", handleScroll);
      handleScroll(); // Panggil sekali untuk set state awal
    }

    return () => {
      if (el) {
        el.removeEventListener("scroll", handleScroll);
      }
    };
  }, []); // Dependensi kosong agar hanya berjalan sekali saat mount

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <ChatHeader
        messages={messages}
        chatId={id}
        isReadonly={isReadonly}
        user={user}
        title={
          view !== "chat"
            ? `${view.charAt(0).toUpperCase() + view.slice(1)} Settings`
            : undefined
        }
        onBackClick={view !== "chat" ? () => setView("chat") : undefined}
        selectedModelId={view === "chat" ? selectedChatModel : undefined}
        selectedVisibilityType={
          view === "chat" ? selectedVisibilityType : undefined
        }
        className="text-sm"
      />

      <div className="relative flex-1 overflow-hidden">
        <div
          className={`
            absolute top-0 left-0 w-full h-full flex flex-col
            transition-transform duration-300 ease-in-out
            ${view === "chat" ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <InstallPrompt />
          {messages.length === 0 && <div className="h-[15vh]"></div>}
          
          {/* DIUBAH: Tambahkan ref dan id yang benar di sini */}
          <div ref={chatContainerRef} id="chat-scroll" className="flex-1 overflow-y-auto custom-scrollbar">
            <Messages
              chatId={id}
              isLoading={isLoading}
              votes={votes}
              messages={messages}
              setMessages={setMessages}
              // DIUBAH: Hapus prop setIsAtBottom dari sini
              selectedGroup={selectedGroup}
              reload={reload}
              isReadonly={isReadonly}
            />
          </div>
          <div className="flex-shrink-0">
            <form className="mx-auto px-4 pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
              {!isReadonly && (
                <MultimodalInput
                  chatId={id}
                  input={input}
                  setInput={setInput}
                  handleSubmit={handleSubmit}
                  isLoading={isLoading}
                  isReadonly={isReadonly}
                  selectedModelId={selectedChatModel}
                  stop={stop}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  messages={messages}
                  setMessages={setMessages}
                  append={append}
                  user={user}
                  selectedGroup={selectedGroup}
                  setSelectedGroup={setSelectedGroup}
                  isAtBottom={isAtBottom}
                  history={history}
                />
              )}
            </form>
          </div>
        </div>

        <main
          className={`
            absolute top-0 left-0 w-full h-full flex flex-col
            transition-transform duration-300 ease-in-out
            ${view !== "chat" ? "translate-x-0" : "translate-x-full"}
          `}
        >
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {settingsViews[view]}
          </div>
        </main>
      </div>
    </div>
  );
}