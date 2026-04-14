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
  type SearchGroupId,
} from "@barzakh/shared/lib/utils/utils";
import { MultimodalInput } from "./Input/multimodal-input";
import { Messages } from "./messages";
import type { VisibilityType } from "./visibility-selector";
import { toast } from "sonner";
import type { User } from "next-auth";
import { InstallPrompt } from "./install-prompt";
import { ArchiveRestore, Loader2 } from "lucide-react";
import { restoreChat } from "@/app/(chat)/actions";
import { useFingerprint } from "@/hooks/use-fingerprint";

import { useView } from "@/context/view-context";
import { ArtifactProvider } from "@/context/artifact-context";
import { useSidebar } from "@/components/ui/sidebar";
import { ArtifactViewer } from "./artifact-viewer";
import { Overview } from "./overview";
import { QuestionSuggestions } from "./Input/question-suggestions";
import { GuestLimitBanner } from "@/components/guest-limit-banner";
import dynamic from "next/dynamic";

const LoadingSettings = () => (
  <div className="flex items-center justify-center h-16 w-full">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const AccountSettingsPage = dynamic(() => import("@/components/settings/account/account-page"), { loading: () => <LoadingSettings /> });
const EmailSettingsPage = dynamic(() => import("@/components/settings/email/email-page"), { loading: () => <LoadingSettings /> });
const PasswordSettingsPage = dynamic(() => import("@/components/settings/password/password-page"), { loading: () => <LoadingSettings /> });
const WalletSettingsPage = dynamic(() => import("@/components/settings/wallet/wallet-page"), { loading: () => <LoadingSettings /> });
const BillingSettingsPage = dynamic(() => import("@/components/settings/billing/billing-page"), { loading: () => <LoadingSettings /> });
const ArchivedPage = dynamic(() => import("@/components/settings/archived/archived-page").then(mod => mod.ArchivedPage), { loading: () => <LoadingSettings /> });
const TwoFactorSettingsPage = dynamic(() => import("@/components/settings/2fa/two-factor-page"), { loading: () => <LoadingSettings /> });
const PlanDetailPage = dynamic(() => import("@/components/settings/plans/plan-detail-page"), { loading: () => <LoadingSettings /> });

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
  isSharedChat = false,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  isArchived?: boolean;
  user?: User;
  isSharedChat?: boolean;
}) {
  const { mutate } = useSWRConfig();
  const { view, setView } = useView();

  // For shared chats: generate a new ID for the forked chat, keep original for context
  const [forkedChatId] = useState(() => isSharedChat ? generateUUID() : id);
  const originalChatId = isSharedChat ? id : undefined;

  // Use the forked ID for shared chats, otherwise use the server-provided ID directly
  const activeChatId = isSharedChat ? forkedChatId : id;

  // Determine effective readonly state:
  // - If shared chat and user is logged in, they are forking it, so it's NOT readonly for them
  // - If shared chat and no user (guest), it IS readonly
  // - Otherwise use the passed prop
  const effectiveIsReadonly = isSharedChat && user ? false : isReadonly;

  // Manage model state locally for dynamic updates without page reload
  const [currentModelId, setCurrentModelId] = useState(selectedChatModel);
  const fingerprint = useFingerprint();
  const [guestLimitReached, setGuestLimitReached] = useState(false);

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

  const [isIncognito, setIsIncognito] = useState(false);
  const isResettingRef = useRef(false);

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
    id: activeChatId,
    body: {
      id: activeChatId,
      selectedChatModel: currentModelId,
      isTemporary: isIncognito,
      // Pass original chat ID for context when forking a shared chat
      ...(originalChatId && { history_for_context_id: originalChatId }),
      ...(!user && fingerprint && { fingerprint }),
    },
    initialMessages,
    experimental_throttle: 250,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      // Guard against updating URL if we're in the middle of a reset/navigation
      if (isResettingRef.current) return;

      // Don't refresh history for incognito chats (they're not persisted)
      if (!isIncognito) {
        mutate("/api/history");
      }
      // Update URL to forked chat ID when user sends first message on shared chat
      if (isSharedChat && !isIncognito && typeof window !== 'undefined') {
        window.history.replaceState({}, "", `/c/${activeChatId}`);
      }
    },
    onError: (error: any) => {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed?.error === "guest_limit_reached") {
          setGuestLimitReached(true);
          return;
        }
      } catch {
        if (error.message?.includes("guest_limit_reached") || error.message?.includes("Create an account")) {
          setGuestLimitReached(true);
          return;
        }
      }
      toast.error(error.message);
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    user && messages.length > 0 ? `/api/vote?chatId=${activeChatId}` : null,
    fetcher
  );
  // Persist attachments in localStorage to survive page refreshes
  const [attachments, setAttachments] = useState<Array<Attachment>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`attachments-${activeChatId}`);
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
  const [isMounted, setIsMounted] = useState(false);

  // Prevent flash of content before hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Listen for chat reset event (triggered when deleting the current chat)
  useEffect(() => {
    const handleChatReset = () => {
      isResettingRef.current = true;
      stop(); // Stop any active stream immediately
      setMessages([]);
      setInput("");
      setAttachments([]);

      // Reset the flag after a short delay to allow navigation to complete
      setTimeout(() => {
        isResettingRef.current = false;
      }, 1000);
    };

    window.addEventListener("chat:reset", handleChatReset);
    return () => {
      window.removeEventListener("chat:reset", handleChatReset);
    };
  }, [setMessages, setInput, stop]);

  // NEW: All scroll logic is now here
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Function to scroll to bottom - used when user sends a message
  const scrollToBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (el) {
      setIsAtBottom(true);
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

  // Auto-scroll to bottom on initial mount when there are messages
  useEffect(() => {
    if (isMounted && messages.length > 0) {
      const el = chatContainerRef.current;
      if (el) {
        // Small delay to ensure content is rendered
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    }
  }, [isMounted]); // Only run when mounted

  // Save attachments to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`attachments-${activeChatId}`, JSON.stringify(attachments));
      } catch (error) {
        console.error('Failed to save attachments to localStorage:', error);
      }
    }
  }, [attachments, activeChatId]);

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
  }, [isMounted]); // Re-run when mounted to attach scroll listener after render

  // Update document title dynamically when chat title changes (client-side)
  const chatTitle = view === "chat" ? allHistory?.find((c: ChatHistory) => c.id === id)?.title : undefined;
  useEffect(() => {
    if (chatTitle) {
      document.title = chatTitle;
    } else if (view === "chat") {
      document.title = "Barzakh AI";
    }
  }, [chatTitle, view]);

  const { setOpen, setOpenMobile, setSidebarView, isMobile } = useSidebar();

  const [isUnarchiving, setIsUnarchiving] = useState(false);
  const [isCurrentlyArchived, setIsCurrentlyArchived] = useState(isArchived);
  const router = useRouter();

  const handleUnarchive = async () => {
    setIsUnarchiving(true);
    try {
      await restoreChat({ chatId: id });
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

  // Show minimal loading state until mounted to prevent content flash
  if (!isMounted) {
    return (
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <div className="h-14 border-b border-border/40" />
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <ArtifactProvider>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeaderAny
          messages={messages}
          chatId={activeChatId}
          isReadonly={effectiveIsReadonly}
          user={user}
          title={
            view !== "chat"
              ? `${view.charAt(0).toUpperCase() + view.slice(1)} Settings`
              : undefined
          }
          // Pass chat specific props - look in both regular and archived history
          chatTitle={chatTitle}
          chatVisibility={view === "chat" ? allHistory?.find((c: ChatHistory) => c.id === id)?.visibility : undefined}
          isIncognito={isIncognito}
          setIsIncognito={setIsIncognito}
          onBackClick={view !== "chat" ? (() => {
            // Show settings list in the sidebar and ensure it's visible across devices
            if (setSidebarView) setSidebarView('settings');
            if (isMobile) {
              setOpenMobile?.(true);
            } else {
              setOpen?.(true);
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
                  <Overview user={user} />
                </div>

                <div className="w-full max-w-3xl mt-4 md:mt-8 flex-none">
                  <div className="w-full mb-4">
                    <QuestionSuggestions append={append} history={history} user={user} />
                  </div>
                  <div className="w-full">
                    {guestLimitReached && !user ? (
                      <GuestLimitBanner />
                    ) : (
                      <MultimodalInputAny
                        chatId={activeChatId}
                        input={input}
                        setInput={setInput}
                        handleSubmit={handleSubmit}
                        isLoading={isLoading}
                        isReadonly={effectiveIsReadonly}
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
                        isIncognito={isIncognito}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div ref={chatContainerRef} id="chat-scroll" className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col ${!isAtBottom ? "[mask-image:linear-gradient(to_bottom,black_0%,black_calc(100%_-_40px),transparent_100%)]" : ""}`}>
                  <MessagesAny
                    chatId={activeChatId}
                    isLoading={isLoading}
                    votes={votes}
                    messages={messages}
                    setMessages={setMessages}
                    selectedGroup={selectedGroup}
                    reload={reload}
                    isReadonly={effectiveIsReadonly}
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
                      guestLimitReached && !user ? (
                        <GuestLimitBanner />
                      ) : (
                        <MultimodalInputAny
                          chatId={activeChatId}
                          input={input}
                          setInput={setInput}
                          handleSubmit={handleSubmit}
                          isLoading={isLoading}
                          isReadonly={effectiveIsReadonly}
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
                          isIncognito={isIncognito}
                        />
                      )
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
