"use client";
import type { Attachment, Message } from "ai";
import { useChat } from "ai/react";
// NEW: Import useRef and useEffect
import { useState, useRef, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ChatHeader } from "@/components/chat-header";
import type { Vote, Chat as ChatHistory } from "@/lib/db/schema";
import {
  fetcher,
  generateUUID,
  SearchGroupId,
} from "@barzakh/shared/lib/utils/utils";
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
import { ArchivedPage } from "@/components/settings/archived/archived-page";
import TwoFactorSettingsPage from "@/components/settings/2fa/two-factor-page";
import PlanDetailPage from "@/components/settings/plans/plan-detail-page";
import { ArtifactProvider } from "@/context/artifact-context";
import { useSidebar } from "@/components/ui/sidebar";
import { ArtifactViewer } from "./artifact-viewer";

const settingsViews = (user: User | undefined): Record<string, React.ReactNode> => ({
  account: <AccountSettingsPage />,
  email: <EmailSettingsPage />,
  password: <PasswordSettingsPage />,
  billing: <BillingSettingsPage />,
  archived: <ArchivedPage user={user} />,
  "2fa": <TwoFactorSettingsPage />,
  plans: <PlanDetailPage />,
});

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

  // Manage model state locally for dynamic updates without page reload
  const [currentModelId, setCurrentModelId] = useState(selectedChatModel);

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
    body: { id, selectedChatModel: currentModelId },
    initialMessages,
    experimental_throttle: 250,
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
  // Persist attachments in localStorage to survive page refreshes
  const [attachments, setAttachments] = useState<Array<Attachment>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`attachments-${id}`);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error('Failed to parse stored attachments:', error);
        return [];
      }
    }
    return [];
  });
  const [selectedGroup, setSelectedGroup] = useState<SearchGroupId>("search");
  const [isAtBottom, setIsAtBottom] = useState(true);

  // NEW: All scroll logic is now here
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Effect for auto-scroll when new messages are added
  useEffect(() => {
    const el = chatContainerRef.current;
    if (el && isAtBottom) {
      // Use requestAnimationFrame to batch scroll updates
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages.length, isAtBottom]);

  // Save attachments to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`attachments-${id}`, JSON.stringify(attachments));
      } catch (error) {
        console.error('Failed to save attachments to localStorage:', error);
      }
    }
  }, [attachments, id]);

  // Effect to detect scroll position
  useEffect(() => {
    const el = chatContainerRef.current;
    
    // Throttle scroll handler to prevent excessive state updates
    let scrollTimeout: NodeJS.Timeout | null = null;
    const handleScroll = () => {
      if (!el) return;
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      scrollTimeout = setTimeout(() => {
        const threshold = 10;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
        setIsAtBottom(atBottom);
      }, 100);
    };

    if (el) {
      el.addEventListener("scroll", handleScroll);
      handleScroll(); // Call once to set initial state
    }

    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      if (el) {
        el.removeEventListener("scroll", handleScroll);
      }
    };
  }, []); // Empty dependencies so it only runs once on mount

  const { setOpen, setOpenMobile, setSidebarView, isMobile } = useSidebar();

  return (
    <ArtifactProvider>
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
          onBackClick={view !== "chat" ? (() => {
            // Show settings list in the sidebar and ensure it's visible across devices
            if (setSidebarView) setSidebarView('settings');
            if (isMobile) {
              setOpenMobile && setOpenMobile(true);
            } else {
              setOpen && setOpen(true);
            }
            setView("chat");
          }) : undefined}
          selectedModelId={view === "chat" ? currentModelId : undefined}
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
          {messages.length === 0 && <div className="h-[18vh]"></div>}
          
          {/* CHANGED: Add correct ref and id here */}
          <div ref={chatContainerRef} id="chat-scroll" className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <Messages
              chatId={id}
              isLoading={isLoading}
              votes={votes}
              messages={messages}
              setMessages={setMessages}
              // CHANGED: Remove setIsAtBottom prop from here
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
                  selectedModelId={currentModelId}
                  onModelChange={setCurrentModelId}
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
            {settingsViews(user)[view]}
          </div>
        </main>
      </div>

      {/* Artifact Viewer - Slides in from the right */}
      <ArtifactViewer />
    </div>
    </ArtifactProvider>
  );
}