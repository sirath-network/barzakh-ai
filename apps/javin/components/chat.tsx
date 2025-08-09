"use client";
import type { Attachment, Message } from "ai";
import { useChat } from "ai/react";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ChatHeader } from "@/components/chat-header";
import type { Vote } from "@/lib/db/schema";
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

// 1. Impor hook, komponen, dan ikon yang diperlukan untuk view baru
import { useView } from "@/context/view-context";
import AccountSettingsPage from "@/components/settings/account/account-page";
import EmailSettingsPage from "@/components/settings/email/email-page";
 // Asumsi file ini ada di components/settings/
// import PasswordSettingsPage from "./settings/password-page"; // Anda bisa menambahkan ini nanti
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import PasswordSettingsPage from "@/components/settings/password/password-page";
import BillingSettingsPage from "@/components/settings/billing/billing-page";

// 2. Buat objek pemetaan untuk merender halaman pengaturan dengan mudah
const settingsViews: Record<string, React.ReactNode> = {
  account: <AccountSettingsPage />,
  email: <EmailSettingsPage />,
  password: <PasswordSettingsPage />,
  billing: <BillingSettingsPage />
};

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
  selectedVisibilityType,
  isReadonly,
  user,
}: {
  id:string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  user?: User;
}) {
  const { mutate } = useSWRConfig();
  
  // 3. Dapatkan state view dan fungsi untuk mengubahnya dari context
  const { view, setView } = useView();

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

  // 4. Gunakan conditional rendering berdasarkan nilai 'view'
  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      {/* Header Tetap Sama, Selalu di Atas */}
      <ChatHeader
        messages={messages}
        chatId={id}
        isReadonly={isReadonly}
        user={user}
        title={view !== 'chat' ? `${view.charAt(0).toUpperCase() + view.slice(1)} Settings` : undefined}
        onBackClick={view !== 'chat' ? () => setView('chat') : undefined}
        selectedModelId={view === 'chat' ? selectedChatModel : undefined}
        selectedVisibilityType={view === 'chat' ? selectedVisibilityType : undefined}
        className="text-sm"
      />

      {/* Kontainer Utama untuk Animasi
        - 'relative': Menjadi "panggung" untuk elemen absolute di dalamnya.
        - 'flex-1': Mengisi sisa ruang.
        - 'overflow-hidden': Mencegah scrollbar horizontal saat elemen digeser keluar layar.
      */}
      <div className="relative flex-1 overflow-hidden">

        {/* 1. Wrapper untuk Tampilan Chat */}
        <div
          className={`
            absolute top-0 left-0 w-full h-full flex flex-col
            transition-transform duration-300 ease-in-out
            ${view === 'chat' ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Konten Asli Tampilan Chat Anda */}
          <InstallPrompt />
          {messages.length === 0 && <div className="h-[15vh]"></div>}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <Messages
                chatId={id}
                isLoading={isLoading}
                votes={votes}
                messages={messages}
                setMessages={setMessages}
                setIsAtBottom={setIsAtBottom}
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
                  />
                )}
            </form>
          </div>
        </div>

        {/* 2. Wrapper untuk Tampilan Pengaturan */}
        <main
          className={`
            absolute top-0 left-0 w-full h-full flex flex-col
            transition-transform duration-300 ease-in-out
            ${view !== 'chat' ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          {/* Render komponen pengaturan yang sesuai */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {settingsViews[view]}
          </div>
        </main>

      </div>
    </div>
  );
}