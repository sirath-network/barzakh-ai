"use client";
import type { Attachment, Message } from "ai";
import { useChat } from "ai/react";
// NEW: Import useRef and useEffect
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { ArchiveRestore } from "lucide-react";
import { restoreChat } from "@/app/(chat)/actions";

import { useView } from "@/context/view-context";
import AccountSettingsPage from "@/components/settings/account/account-page";
import EmailSettingsPage from "@/components/settings/email/email-page";
import PasswordSettingsPage from "@/components/settings/password/password-page";
import WalletSettingsPage from "@/components/settings/wallet/wallet-page";
import BillingSettingsPage from "@/components/settings/billing/billing-page";
import { ArchivedPage } from "@/components/settings/archived/archived-page";
import TwoFactorSettingsPage from "@/components/settings/2fa/two-factor-page";
import PlanDetailPage from "@/components/settings/plans/plan-detail-page";
import { ArtifactProvider } from "@/context/artifact-context";
import { useSidebar } from "@/components/ui/sidebar";
import { ArtifactViewer } from "./artifact-viewer";
import { Overview } from "./overview";
import { QuestionSuggestions } from "./Input/question-suggestions";

const settingsViews = (user: User | undefined): Record<string, React.ReactNode> => ({
  account: <AccountSettingsPage />,
  email: <EmailSettingsPage />,
  password: <PasswordSettingsPage />,
  wallet: <WalletSettingsPage />,
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
  isArchived = false,
  user,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  isArchived?: boolean;
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

  // Also fetch archived history to find titles for archived chats
  const { data: archivedHistory } = useSWR<Array<ChatHistory>>(
    user ? "/api/history/archived" : null,
    fetcher
  );

  // Combine both histories for finding chat info
  const allHistory = [...(history || []), ...(archivedHistory || [])];

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
    user && messages.length > 0 ? `/api/vote?chatId=${id}` : null,
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

  // Function to scroll to bottom - used when user sends a message
  const scrollToBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (el) {
      // Small delay to ensure the DOM has updated with the new message
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
    }
  }, []);

  // Effect for auto-scroll when new messages are added (only if already at bottom)
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

  const [isUnarchiving, setIsUnarchiving] = useState(false);
  const [isCurrentlyArchived, setIsCurrentlyArchived] = useState(isArchived);
  const router = useRouter();

  const handleUnarchive = async () => {
    setIsUnarchiving(true);
    try {
      await restoreChat({ chatId: id });
      toast.success("Unarchived successfully");
      // Update local state immediately for better UX
      setIsCurrentlyArchived(false);
      // Refresh history cache and router data without full page reload
      mutate("/api/history");
      mutate("/api/history/archived");
      router.refresh();
    } catch (error) {
      console.error("Failed to unarchive chat:", error);
      toast.error("Failed to unarchive conversation");
    } finally {
      setIsUnarchiving(false);
    }
  };

  const ChatHeaderAny = ChatHeader as any;
  const MessagesAny = Messages as any;
  const MultimodalInputAny = MultimodalInput as any;

  return (
    <ArtifactProvider>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeaderAny
          messages={messages}
          chatId={id}
          isReadonly={isReadonly}
          user={user}
          title={
            view !== "chat"
              ? `${view.charAt(0).toUpperCase() + view.slice(1)} Settings`
              : undefined
          }
          // Pass chat specific props - look in both regular and archived history
          chatTitle={view === "chat" ? allHistory?.find((c: ChatHistory) => c.id === id)?.title : undefined}
          chatVisibility={view === "chat" ? allHistory?.find((c: ChatHistory) => c.id === id)?.visibility : undefined}
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
          isArchived={isCurrentlyArchived}
          onUnarchive={() => setIsCurrentlyArchived(false)}
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

            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center p-4 md:justify-center md:pb-24 md:overflow-y-auto custom-scrollbar">
                <div className="flex-1 w-full max-w-3xl flex flex-col items-center justify-center gap-6 md:gap-8 md:flex-none overflow-y-auto md:overflow-visible">
                  <Overview />
                </div>

                <div className="w-full max-w-3xl mt-4 md:mt-8 flex-none">
                  <div className="w-full mb-4">
                    <QuestionSuggestions append={append} history={history} user={user} />
                  </div>
                  <div className="w-full">
                    <MultimodalInputAny
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
                      onSubmitMessage={scrollToBottom}
                      disableSuggestions={true}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div ref={chatContainerRef} id="chat-scroll" className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col">
                  <MessagesAny
                    chatId={id}
                    isLoading={isLoading}
                    votes={votes}
                    messages={messages}
                    setMessages={setMessages}
                    selectedGroup={selectedGroup}
                    reload={reload}
                    isReadonly={isReadonly}
                  />
                </div>
                <div className="flex-shrink-0">
                  <form className="mx-auto px-4 pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
                    {isCurrentlyArchived ? (
                      <div className="flex flex-col items-center justify-center py-4 px-6">
                        <p className="text-sm text-muted-foreground mb-3 text-center">
                          This conversation is archived. To continue, please unarchive it first.
                        </p>
                        <button
                          type="button"
                          onClick={handleUnarchive}
                          disabled={isUnarchiving}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-foreground rounded-full font-medium transition-colors border border-border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArchiveRestore className="w-4 h-4" />
                          {isUnarchiving ? "Restoring..." : "Unarchive"}
                        </button>
                      </div>
                    ) : (
                      <MultimodalInputAny
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
                        onSubmitMessage={scrollToBottom}
                      />
                    )}
                  </form>
                </div>
              </>
            )}
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