"use client";

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
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

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

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
      toast.success("Title name updated");
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
    <SidebarMenuItem className="group">
      <div className="relative flex items-center rounded-lg">
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className={`
            flex-1 rounded-lg transition-all duration-200 border-0
            ${
              isActive
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
        </SidebarMenuButton>

        <DropdownMenu modal={true}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`
                flex-shrink-0 h-8 w-8 p-0 ml-1 mr-1 rounded-md
                opacity-0 group-hover:opacity-100 transition-all duration-200
                hover:bg-muted hover:text-muted-foreground
                data-[state=open]:opacity-100 data-[state=open]:bg-muted
                ${isActive ? "opacity-70 hover:opacity-100" : ""}
              `}
            >
              <MoreHorizontalIcon className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="right"
            align="start"
            className="w-44 shadow-lg border border-border/50 bg-background/98 backdrop-blur-sm rounded-lg"
            sideOffset={8}
          >
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                handleOpenEditModal();
              }}
            >
              <span className="mr-2">
                <PencilEditIcon size={16} />
              </span>
              <span className="font-medium">Edit title</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => onArchive(chat.id)}
            >
              <ArchiveIcon className="mr-2 h-4 w-4" />
              <span className="font-medium">Archive chat</span>
            </DropdownMenuItem>
            {visibilityType === "public" && (
              <DropdownMenuItem
                className="cursor-pointer"
                onSelect={() => {
                  const url = `${window.location.origin}/c/${chat.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link copied to clipboard");
                }}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                <span className="font-medium">Copy link</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ShareIcon className="mr-2 h-4 w-4" />
                <span className="font-medium">Share</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent
                  sideOffset={8}
                  className="w-44 shadow-lg border border-border/50 bg-background/98 backdrop-blur-sm rounded-lg"
                >
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setVisibilityType("public")}
                  >
                    <GlobeIcon className="mr-2 h-4 w-4" />
                    <span className="font-medium">Public</span>
                    {visibilityType === "public" && (
                      <CheckCircleFillIcon className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setVisibilityType("private")}
                  >
                    <LockIcon className="mr-2 h-4 w-4" />
                    <span className="font-medium">Private</span>
                    {visibilityType === "private" && (
                      <CheckCircleFillIcon className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
              onSelect={() => onDelete(chat.id)}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              <span className="font-medium">Delete chat</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Edit Chat Name Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change title name</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full"
                maxLength={200}
                placeholder="Enter chat name"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editTitle.trim()}
                className="w-full sm:w-auto"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) return false;
  if (prevProps.chat.visibility !== nextProps.chat.visibility) return false;
  if (prevProps.chat.title !== nextProps.chat.title) return false;
  return true;
});

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
        return history.map((chat) =>
          chat.id === chatId ? { ...chat, title: newTitle } : chat
        );
      }
      return history;
    }, false);
  };

  const handleArchive = async (chatId: string) => {
    const archivePromise = archiveChat({ chatId });
    toast.promise(archivePromise, {
      loading: "Archiving chat...",
      success: () => {
        mutate((history) => {
          if (history) {
            return history.filter((h) => h.id !== chatId);
          }
        });
        return "Chat archived successfully";
      },
      error: "Failed to archive chat",
    });
  };

  const handleDelete = async () => {
    const deletePromise = fetch(`/api/chat?id=${deleteId}`, {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting chat...",
      success: () => {
        mutate((history) => {
          if (history) {
            return history.filter((h) => h.id !== deleteId);
          }
        });
        return "Chat deleted successfully";
      },
      error: "Failed to delete chat",
    });

    setShowDeleteDialog(false);

    if (deleteId === id) {
      router.push("/");
    }
  };

  if (!user) {
    return (
      <SidebarGroup className="h-full">
        <SidebarGroupContent className="h-full flex items-center justify-center">
          <div className="px-4 py-8 text-center">
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-6 border border-border/30">
              <div className="text-muted-foreground text-sm font-medium mb-2">
                Welcome!
              </div>
              <div className="text-sm text-muted-foreground/80 leading-relaxed">
                Login to save and revisit your previous conversations
              </div>
            </div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup className="h-full">
        <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
          Today
        </div>
        <SidebarGroupContent className="h-full">
          <div className="flex flex-col space-y-2">
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
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (history?.length === 0) {
    return (
      <SidebarGroup className="h-full">
        <SidebarGroupContent className="h-full flex items-center justify-center">
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
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  const groupChatsByDate = (chats: Chat[]): GroupedChats => {
    const now = new Date();
    const oneWeekAgo = subWeeks(now, 1);
    const oneMonthAgo = subMonths(now, 1);

    return chats.reduce(
      (groups, chat) => {
        const chatDate = new Date(chat.createdAt);

        if (isToday(chatDate)) {
          groups.today.push(chat);
        } else if (isYesterday(chatDate)) {
          groups.yesterday.push(chat);
        } else if (chatDate > oneWeekAgo) {
          groups.lastWeek.push(chat);
        } else if (chatDate > oneMonthAgo) {
          groups.lastMonth.push(chat);
        } else {
          groups.older.push(chat);
        }

        return groups;
      },
      {
        today: [],
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: [],
      } as GroupedChats
    );
  };

  const DateGroupHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider border-b border-border/10 bg-muted/20 rounded-lg mx-1 mb-2 mt-4 first:mt-0">
      {children}
    </div>
  );

  return (
    <>
      {/* Fixed: Add proper height constraints and scrolling */}
      <SidebarGroup className="flex-1 min-h-0 h-full">
        <SidebarGroupContent 
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
            <SidebarMenu className="space-y-0.5 pb-4 px-1">
              {history &&
                (() => {
                  const groupedChats = groupChatsByDate(history);

                  return (
                    <div className="space-y-2">
                      {groupedChats.today.length > 0 && (
                        <div>
                          <DateGroupHeader>Today</DateGroupHeader>
                          {groupedChats.today.map((chat) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={chat.id === id}
                              onDelete={(chatId) => {
                                setDeleteId(chatId);
                                setShowDeleteDialog(true);
                              }}
                              onArchive={handleArchive}
                              setOpenMobile={setOpenMobile}
                              onChatClick={handleChatClick}
                              onTitleUpdate={handleTitleUpdate}
                            />
                          ))}
                        </div>
                      )}

                      {groupedChats.yesterday.length > 0 && (
                        <div>
                          <DateGroupHeader>Yesterday</DateGroupHeader>
                          {groupedChats.yesterday.map((chat) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={chat.id === id}
                              onDelete={(chatId) => {
                                setDeleteId(chatId);
                                setShowDeleteDialog(true);
                              }}
                              onArchive={handleArchive}
                              setOpenMobile={setOpenMobile}
                              onChatClick={handleChatClick}
                              onTitleUpdate={handleTitleUpdate}
                            />
                          ))}
                        </div>
                      )}

                      {groupedChats.lastWeek.length > 0 && (
                        <div>
                          <DateGroupHeader>Last 7 days</DateGroupHeader>
                          {groupedChats.lastWeek.map((chat) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={chat.id === id}
                              onDelete={(chatId) => {
                                setDeleteId(chatId);
                                setShowDeleteDialog(true);
                              }}
                              onArchive={handleArchive}
                              setOpenMobile={setOpenMobile}
                              onChatClick={handleChatClick}
                              onTitleUpdate={handleTitleUpdate}
                            />
                          ))}
                        </div>
                      )}

                      {groupedChats.lastMonth.length > 0 && (
                        <div>
                          <DateGroupHeader>Last 30 days</DateGroupHeader>
                          {groupedChats.lastMonth.map((chat) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={chat.id === id}
                              onDelete={(chatId) => {
                                setDeleteId(chatId);
                                setShowDeleteDialog(true);
                              }}
                              onArchive={handleArchive}
                              setOpenMobile={setOpenMobile}
                              onChatClick={handleChatClick}
                              onTitleUpdate={handleTitleUpdate}
                            />
                          ))}
                        </div>
                      )}

                      {groupedChats.older.length > 0 && (
                        <div>
                          <DateGroupHeader>Older</DateGroupHeader>
                          {groupedChats.older.map((chat) => (
                            <ChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={chat.id === id}
                              onDelete={(chatId) => {
                                setDeleteId(chatId);
                                setShowDeleteDialog(true);
                              }}
                              onArchive={handleArchive}
                              setOpenMobile={setOpenMobile}
                              onChatClick={handleChatClick}
                              onTitleUpdate={handleTitleUpdate}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
            </SidebarMenu>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="w-[calc(100%-2rem)] sm:w-full max-w-md rounded-xl border-border/50 bg-background/95 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">
              Delete conversation?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              This action cannot be undone. This will permanently delete your chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
            <AlertDialogCancel 
              className="w-full sm:w-auto rounded-lg border-border/50 hover:bg-muted/60 transition-colors duration-200"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="w-full sm:w-auto rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors duration-200"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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