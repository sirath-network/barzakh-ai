"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { User } from "next-auth";
import { memo, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

import {
  archiveChat,
  restoreChat,
  updateChatVisibility,
  updateChatTitle,
} from "@/app/(chat)/actions";
import {
  ArchiveIcon,
  CheckCircleFillIcon,
  GlobeIcon,
  LockIcon,
  MoreHorizontalIcon,
  ShareIcon,
  TrashIcon,
  ArchiveRestoreIcon,
  LinkIcon,
  PencilEditIcon,
  BarzakhAI,
} from "@/components/icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Chat } from "@/lib/db/schema";
import { fetcher } from "@barzakh/shared/lib/utils/utils";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useView } from "@/context/view-context";

const SidebarMenuItemAny = SidebarMenuItem as any;
const SidebarMenuButtonAny = SidebarMenuButton as any;
const SidebarGroupAny = SidebarGroup as any;
const SidebarGroupContentAny = SidebarGroupContent as any;
const SidebarMenuAny = SidebarMenu as any;
const DropdownMenuAny = DropdownMenu as any;
const DropdownMenuTriggerAny = DropdownMenuTrigger as any;
const DropdownMenuContentAny = DropdownMenuContent as any;
const DropdownMenuItemAny = DropdownMenuItem as any;
const DropdownMenuSeparatorAny = DropdownMenuSeparator as any;
const DropdownMenuSubAny = DropdownMenuSub as any;
const DropdownMenuSubTriggerAny = DropdownMenuSubTrigger as any;
const DropdownMenuPortalAny = DropdownMenuPortal as any;
const DropdownMenuSubContentAny = DropdownMenuSubContent as any;
const DialogAny = Dialog as any;
const DialogContentAny = DialogContent as any;
const DialogHeaderAny = DialogHeader as any;
const DialogTitleAny = DialogTitle as any;
const DialogFooterAny = DialogFooter as any;
const AlertDialogAny = AlertDialog as any;
const AlertDialogContentAny = AlertDialogContent as any;
const AlertDialogHeaderAny = AlertDialogHeader as any;
const AlertDialogTitleAny = AlertDialogTitle as any;
const AlertDialogDescriptionAny = AlertDialogDescription as any;
const AlertDialogFooterAny = AlertDialogFooter as any;
const AlertDialogCancelAny = AlertDialogCancel as any;
const AlertDialogActionAny = AlertDialogAction as any;
const ButtonAny = Button as any;
const InputAny = Input as any;

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  onArchive,
  setOpenMobile,
  onChatClick,
  onTitleUpdate,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  onArchive: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
  onChatClick: () => void;
  onTitleUpdate: (chatId: string, newTitle: string) => void;
}) => {
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId: chat.id,
    initialVisibility: chat.visibility,
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitle(chat.title);
  }, [chat.title]);

  useEffect(() => {
    if (isEditModalOpen && inputRef.current) {
      // Auto-select text when modal opens
      const timeoutId = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isEditModalOpen]);

  const handleOpenEditModal = () => {
    setEditTitle(chat.title);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      toast.error("Chat title cannot be empty");
      return;
    }
    if (trimmedTitle.length > 200) {
      toast.error("Chat title cannot exceed 200 characters");
      return;
    }
    if (trimmedTitle === chat.title) {
      setIsEditModalOpen(false);
      return;
    }

    try {
      await updateChatTitle({ chatId: chat.id, title: trimmedTitle });
      onTitleUpdate(chat.id, trimmedTitle);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Failed to update chat title:", error);
      toast.error("Failed to update chat name");
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(chat.title);
    setIsEditModalOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <SidebarMenuItemAny className="group">
      <div className="relative flex items-center rounded-lg w-full min-w-0">
        <SidebarMenuButtonAny
          asChild
          isActive={isActive}
          className={`
            flex-1 rounded-lg transition-all duration-200 border-0
            ${isActive
              ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary hover:from-primary/20 hover:to-primary/10"
              : "hover:bg-muted/60"
            }
          `}
        >
          <Link
            href={`/c/${chat.id}`}
            onClick={() => {
              setOpenMobile(false);
              onChatClick();
            }}
            className="flex items-center gap-3 px-3 py-2.5 w-full min-w-0"
          >
            <div
              className={`
              w-2 h-2 rounded-full flex-shrink-0 transition-all duration-200
              ${isActive ? "bg-primary shadow-sm" : "bg-muted-foreground/30"}
            `}
            />
            <span className="flex-1 text-sm font-medium truncate">
              {chat.title}
            </span>
          </Link>
        </SidebarMenuButtonAny>

        <DropdownMenuAny modal={true}>
          <DropdownMenuTriggerAny asChild>
            <ButtonAny
              variant="ghost"
              size="sm"
              className={`
                flex-shrink-0 h-8 w-8 p-0 ml-1 mr-1 rounded-md
                transition-all duration-200
                hover:bg-muted hover:text-muted-foreground
                data-[state=open]:opacity-100 data-[state=open]:bg-muted
                /* Always visible on mobile, show on hover for md+ */
                opacity-100 md:opacity-0 md:group-hover:opacity-100
                ${isActive ? "md:opacity-70 md:hover:opacity-100" : ""}
              `}
            >
              <MoreHorizontalIcon />
              <span className="sr-only">More options</span>
            </ButtonAny>
          </DropdownMenuTriggerAny>

          <DropdownMenuContentAny
            side="right"
            align="start"
            className="w-44 shadow-lg border border-border/50 bg-background/98 backdrop-blur-sm rounded-lg"
            sideOffset={8}
          >
            <DropdownMenuItemAny
              className="cursor-pointer"
              onSelect={() => {
                handleOpenEditModal();
              }}
            >
              <span className="mr-2">
                <PencilEditIcon size={16} />
              </span>
              <span className="font-medium">Edit title</span>
            </DropdownMenuItemAny>
            <DropdownMenuSeparatorAny />
            <DropdownMenuItemAny
              className="cursor-pointer"
              onSelect={() => onArchive(chat.id)}
            >
              <span className="mr-2"><ArchiveIcon /></span>
              <span className="font-medium">Archive chat</span>
            </DropdownMenuItemAny>
            {visibilityType === "public" && (
              <DropdownMenuItemAny
                className="cursor-pointer"
                onSelect={() => {
                  const url = `${window.location.origin}/c/${chat.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link copied to clipboard");
                }}
              >
                <span className="mr-2"><LinkIcon /></span>
                <span className="font-medium">Copy link</span>
              </DropdownMenuItemAny>
            )}
            <DropdownMenuSubAny>
              <DropdownMenuSubTriggerAny>
                <span className="mr-2"><ShareIcon /></span>
                <span className="font-medium">Share</span>
              </DropdownMenuSubTriggerAny>
              <DropdownMenuPortalAny>
                <DropdownMenuSubContentAny
                  sideOffset={8}
                  className="w-44 shadow-lg border border-border/50 bg-background/98 backdrop-blur-sm rounded-lg"
                >
                  <DropdownMenuItemAny
                    className="cursor-pointer"
                    onClick={() => setVisibilityType("public")}
                  >
                    <span className="mr-2"><GlobeIcon /></span>
                    <span className="font-medium">Public</span>
                    {visibilityType === "public" && (
                      <CheckCircleFillIcon className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItemAny>
                  <DropdownMenuItemAny
                    className="cursor-pointer"
                    onClick={() => setVisibilityType("private")}
                  >
                    <span className="mr-2"><LockIcon /></span>
                    <span className="font-medium">Private</span>
                    {visibilityType === "private" && (
                      <CheckCircleFillIcon className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItemAny>
                </DropdownMenuSubContentAny>
              </DropdownMenuPortalAny>
            </DropdownMenuSubAny>
            <DropdownMenuSeparatorAny />
            <DropdownMenuItemAny
              className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
              onSelect={() => onDelete(chat.id)}
            >
              <span className="mr-2"><TrashIcon /></span>
              <span className="font-medium">Delete chat</span>
            </DropdownMenuItemAny>
          </DropdownMenuContentAny>
        </DropdownMenuAny>

        {/* Edit Chat Name Modal */}
        <DialogAny open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContentAny className="max-w-sm sm:max-w-md rounded-xl px-6 py-5 sm:px-7 sm:py-6">
            <DialogHeaderAny>
              <DialogTitleAny>Change title name</DialogTitleAny>
            </DialogHeaderAny>
            <div className="py-4 sm:py-5">
              <InputAny
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e: any) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full"
                maxLength={200}
                placeholder="Enter chat name"
              />
            </div>
            <DialogFooterAny className="flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4">
              <ButtonAny
                variant="outline"
                onClick={handleCancelEdit}
                className="w-full sm:w-auto"
              >
                Cancel
              </ButtonAny>
              <ButtonAny
                onClick={handleSaveEdit}
                disabled={!editTitle.trim()}
                className="w-full sm:w-auto"
              >
                Save
              </ButtonAny>
            </DialogFooterAny>
          </DialogContentAny>
        </DialogAny>
      </div>
    </SidebarMenuItemAny>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) return false;
  if (prevProps.chat.visibility !== nextProps.chat.visibility) return false;
  if (prevProps.chat.title !== nextProps.chat.title) return false;
  return true;
});

const ChatItemAny = ChatItem as any;

export function SidebarHistory({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const { setView } = useView();
  const { id } = useParams();
  const pathname = usePathname();
  const {
    data: history,
    isLoading,
    mutate,
  } = useSWR<Array<Chat>>(user ? "/api/history" : null, fetcher, {
    fallbackData: [],
  });

  useEffect(() => {
    mutate();
  }, [pathname, mutate]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

  const handleChatClick = () => {
    setView('chat');
  };

  const handleTitleUpdate = (chatId: string, newTitle: string) => {
    mutate((history) => {
      if (history) {
        const updatedChat = history.find((chat) => chat.id === chatId);
        if (updatedChat) {
          // Move the updated chat to the top with new title and updatedAt
          const otherChats = history.filter((chat) => chat.id !== chatId);
          return [
            { ...updatedChat, title: newTitle, updatedAt: new Date() },
            ...otherChats,
          ];
        }
        return history;
      }
      return history;
    }, false);
  };

  const handleArchive = async (chatId: string) => {
    // Check if user is viewing the chat being archived using pathname
    const currentPath = window.location.pathname;
    const shouldRedirect = currentPath === `/c/${chatId}`;

    try {
      await archiveChat({ chatId });

      mutate((history) => {
        if (history) {
          return history.filter((h) => h.id !== chatId);
        }
      });

      toast.success("Archived successfully");

      // Redirect to new chat if the user is currently viewing the archived chat
      if (shouldRedirect) {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to archive chat:", error);
      toast.error("Failed to archive chat");
    }
  };

  const handleDelete = async () => {
    setShowDeleteDialog(false);

    // Check if user is viewing the chat being deleted using pathname
    const currentPath = window.location.pathname;
    const shouldRedirect = currentPath === `/c/${deleteId}`;

    try {
      const response = await fetch(`/api/chat?id=${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete chat");
      }

      mutate((history) => {
        if (history) {
          return history.filter((h) => h.id !== deleteId);
        }
      });

      toast.success("Chat deleted successfully");

      // Redirect after successful deletion if viewing the deleted chat
      if (shouldRedirect) {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat");
    }
  };

  if (!user) {
    return (
      <SidebarGroupAny className="h-full">
        <SidebarGroupContentAny className="h-full flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-[240px] flex flex-col items-center gap-4 text-center">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <BarzakhAI size={32} />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-semibold text-foreground tracking-tight">
                Welcome to Barzakh AI
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                Sign in to save your chat history and access it from any device.
              </p>
            </div>
          </div>
        </SidebarGroupContentAny>
      </SidebarGroupAny>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroupAny className="h-full">
        <SidebarGroupContentAny className="h-full">
          <div className="flex flex-col space-y-2 px-1 pt-2">
            {[64, 48, 56, 72, 40].map((width, index) => (
              <div
                key={index}
                className="rounded-lg h-10 flex gap-3 px-3 items-center bg-muted/30 animate-pulse"
              >
                <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                <div
                  className="h-4 rounded-md bg-muted-foreground/20"
                  style={{ width: `${width}%` }}
                />
              </div>
            ))}
          </div>
        </SidebarGroupContentAny>
      </SidebarGroupAny>
    );
  }

  if (history?.length === 0) {
    return (
      <SidebarGroupAny className="h-full">
        <SidebarGroupContentAny className="h-full flex items-center justify-center">
          <div className="px-4 py-8 text-center">
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-6 border border-border/20">
              <div className="text-muted-foreground text-sm font-medium mb-2">
                No conversations yet
              </div>
              <div className="text-xs text-muted-foreground/70 leading-relaxed">
                Your conversations will appear here once you start chatting!
              </div>
            </div>
          </div>
        </SidebarGroupContentAny>
      </SidebarGroupAny>
    );
  }

  return (
    <>
      {/* Fixed: Add proper height constraints and scrolling */}
      <SidebarGroupAny className="flex-1 min-h-0 h-full">
        <SidebarGroupContentAny
          className="h-full min-h-0"
          style={{
            // Force proper height calculation
            height: '100%',
            maxHeight: '100%',
            overflow: 'hidden',
          }}
        >
          {/* This is the actual scrollable container */}
          <div
            className="h-full overflow-y-auto overflow-x-hidden"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent',
            }}
          >
            {/* Chats section header */}
            <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
              Chats
            </div>
            <SidebarMenuAny className="space-y-0.5 pb-4 px-1">
              {history?.map((chat) => (
                <ChatItemAny
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === id}
                  onDelete={(chatId: string) => {
                    setDeleteId(chatId);
                    setShowDeleteDialog(true);
                  }}
                  onArchive={handleArchive}
                  setOpenMobile={setOpenMobile}
                  onChatClick={handleChatClick}
                  onTitleUpdate={handleTitleUpdate}
                />
              ))}
            </SidebarMenuAny>
          </div>
        </SidebarGroupContentAny>
      </SidebarGroupAny>

      <AlertDialogAny open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContentAny className="w-[calc(100%-2rem)] sm:w-full max-w-md rounded-xl border-border/50 bg-background/95 backdrop-blur-sm">
          <AlertDialogHeaderAny>
            <AlertDialogTitleAny className="text-lg font-semibold">
              Delete conversation?
            </AlertDialogTitleAny>
            <AlertDialogDescriptionAny className="text-sm text-muted-foreground leading-relaxed">
              This action cannot be undone. This will permanently delete your chat and remove it from our servers.
            </AlertDialogDescriptionAny>
          </AlertDialogHeaderAny>
          <AlertDialogFooterAny className="flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
            <AlertDialogCancelAny
              className="w-full sm:w-auto rounded-lg border-border/50 hover:bg-muted/60 transition-colors duration-200"
            >
              Cancel
            </AlertDialogCancelAny>
            <AlertDialogActionAny
              onClick={handleDelete}
              className="w-full sm:w-auto rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors duration-200"
            >
              Delete
            </AlertDialogActionAny>
          </AlertDialogFooterAny>
        </AlertDialogContentAny>
      </AlertDialogAny>

      {/* Add these styles to ensure scrollbar is visible */}
      <style jsx>{`
        div[style*="overflow-y: auto"]::-webkit-scrollbar {
          width: 6px !important;
          display: block !important;
        }
        
        div[style*="overflow-y: auto"]::-webkit-scrollbar-track {
          background: hsl(var(--muted)) !important;
          border-radius: 3px !important;
        }
        
        div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3) !important;
          border-radius: 3px !important;
        }
        
        div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5) !important;
        }
      `}</style>
    </>
  );
}
