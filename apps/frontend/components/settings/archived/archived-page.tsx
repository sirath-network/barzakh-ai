"use client";

import { memo, useEffect, useState } from "react";
import type { User } from "next-auth";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Archive, ArchiveRestore, RotateCcw, Trash2, MoreHorizontal, ChevronDown, CircleArrowLeft } from "lucide-react";
import { useView } from "@/context/view-context";

import {
  archiveChat,
  restoreChat,
} from "@/app/(chat)/actions";
import {
  ArchiveRestoreIcon,
  MoreHorizontalIcon,
  TrashIcon,
} from "@/components/icons";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { Chat } from "@/lib/db/schema";
import { fetcher } from "@barzakh/shared/lib/utils/utils";

const DropdownMenuAny = DropdownMenu as any;
const DropdownMenuTriggerAny = DropdownMenuTrigger as any;
const DropdownMenuContentAny = DropdownMenuContent as any;
const DropdownMenuItemAny = DropdownMenuItem as any;
const DropdownMenuSeparatorAny = DropdownMenuSeparator as any;
const ButtonAny = Button as any;
const AlertDialogAny = AlertDialog as any;
const AlertDialogContentAny = AlertDialogContent as any;
const AlertDialogHeaderAny = AlertDialogHeader as any;
const AlertDialogTitleAny = AlertDialogTitle as any;
const AlertDialogDescriptionAny = AlertDialogDescription as any;
const AlertDialogFooterAny = AlertDialogFooter as any;
const AlertDialogCancelAny = AlertDialogCancel as any;
const AlertDialogActionAny = AlertDialogAction as any;
const ArchiveRestoreAny = ArchiveRestore as any;
const MoreHorizontalAny = MoreHorizontal as any;
const RotateCcwAny = RotateCcw as any;
const Trash2Any = Trash2 as any;
const ArchiveAny = Archive as any;
const ChevronDownAny = ChevronDown as any;
const CircleArrowLeftAny = CircleArrowLeft as any;

const ArchivedChatItem = ({
  chat,
  isActive,
  onDelete,
  onRestore,
  setOpenMobile,
  setView,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  onRestore: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
  setView: (view: any) => void;
}) => {
  return (
    <div className="group bg-white dark:bg-black/60 rounded-xl border border-gray-200 dark:border-red-900/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden backdrop-blur-sm">
      <div className="relative flex items-center p-4">
        <Link
          href={`/c/${chat.id}`}
          onClick={() => {
            setOpenMobile(false);
            setView('chat');
          }}
          className={`
            flex items-center gap-4 flex-1 min-w-0 rounded-lg p-3 transition-all duration-200
            ${
              isActive
                ? "bg-muted text-foreground"
                : "hover:bg-muted/50"
            }
          `}
        >
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border transition-all duration-200
            ${
              isActive 
                ? "bg-background border-border" 
                : "bg-muted/50 border-border"
            }
          `}>
            <ArchiveRestoreAny className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm truncate ${
              isActive ? "text-foreground" : "text-foreground"
            }`}>
              {chat.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Archived conversation
            </p>
          </div>
        </Link>

        <DropdownMenuAny modal={true}>
          <DropdownMenuTriggerAny asChild>
            <ButtonAny
              variant="ghost"
              size="sm"
              className={`
                flex-shrink-0 h-10 w-10 p-0 rounded-xl border
                opacity-0 group-hover:opacity-100 transition-all duration-200
                hover:bg-muted hover:text-foreground
                data-[state=open]:opacity-100 data-[state=open]:bg-muted
                border-border
                ${isActive ? "opacity-70 hover:opacity-100" : ""}
              `}
            >
              <MoreHorizontalAny className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </ButtonAny>
          </DropdownMenuTriggerAny>

          <DropdownMenuContentAny
            side="right"
            align="start"
            className="w-48 shadow-lg border border-border bg-popover backdrop-blur-sm rounded-xl"
            sideOffset={8}
          >
            <DropdownMenuItemAny
              className="cursor-pointer rounded-lg m-1 hover:bg-muted focus:bg-muted"
              onSelect={() => onRestore(chat.id)}
            >
              <RotateCcwAny className="mr-3 h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Unarchive Conversation</span>
            </DropdownMenuItemAny>
            <DropdownMenuSeparatorAny className="bg-border" />
            <DropdownMenuItemAny
              className="cursor-pointer rounded-lg m-1 text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
              onSelect={() => onDelete(chat.id)}
            >
              <Trash2Any className="mr-3 h-4 w-4" />
              <span className="font-medium">Delete permanently</span>
            </DropdownMenuItemAny>
          </DropdownMenuContentAny>
        </DropdownMenuAny>
      </div>
    </div>
  );
};

export function ArchivedPage({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const { id } = useParams();
  const { mutate: globalMutate } = useSWRConfig();
  const { setView } = useView();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const {
    data: archivedHistory,
    isLoading,
    mutate,
  } = useSWR<Array<Chat>>(user ? "/api/history/archived" : null, fetcher, {
    fallbackData: [],
  });

  const handleRestore = async (chatId: string) => {
    const restorePromise = restoreChat({ chatId });
    toast.promise(restorePromise, {
      loading: "Restoring chat...",
      success: () => {
        mutate((history) => {
          if (history) {
            return history.filter((h) => h.id !== chatId);
          }
        });
        globalMutate("/api/history");
        return "Unarchived successfully";
      },
      error: "Failed to unarchive conversation",
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
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
        return "Chat deleted permanently";
      },
      error: "Failed to delete chat",
    });

    setShowDeleteDialog(false);
  };

  // Filter items based on selected items per page
  const displayedItems = archivedHistory?.slice(0, itemsPerPage) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-red-950 dark:to-gray-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
            {/* Header skeleton */}
            <div className="p-8 border-b border-gray-200 dark:border-red-900/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-red-800/50 rounded-xl flex items-center justify-center shadow-lg border border-gray-200 dark:border-red-700/50 animate-pulse">
                  <ArchiveAny className="w-6 h-6 text-gray-600 dark:text-red-300" />
                </div>
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
            
            {/* Content skeleton */}
            <div className="p-8">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white dark:bg-black/40 rounded-xl border border-gray-200 dark:border-red-900/30 shadow-lg overflow-hidden backdrop-blur-sm">
                    <div className="flex items-center p-4">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse flex-shrink-0"></div>
                      <div className="flex-1 ml-4 space-y-2">
                        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse flex-shrink-0"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-red-950 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm border border-border">
              <ArchiveAny className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Archived Conversations</h1>
              <p className="text-sm md:text-base text-muted-foreground">Manage your archived conversations</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Card */}
          <div className="lg:col-span-2 bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
            <div className="p-6 md:p-8 border-b border-gray-200 dark:border-red-900/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Archived Chats</h2>
                  <p className="text-muted-foreground text-sm">
                    {archivedHistory?.length || 0} archived {(archivedHistory?.length || 0) === 1 ? 'conversation' : 'conversations'}
                  </p>
                </div>
                
                {/* Items Per Page Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Show:</span>
                  <DropdownMenuAny>
                    <DropdownMenuTriggerAny asChild>
                      <ButtonAny
                        variant="outline"
                        className="h-9 px-3 border-gray-300 dark:border-red-900/50 bg-white dark:bg-black/20 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-red-900/30"
                      >
                        {itemsPerPage}
                        <ChevronDownAny className="ml-2 h-4 w-4" />
                      </ButtonAny>
                    </DropdownMenuTriggerAny>
                    <DropdownMenuContentAny 
                      align="end" 
                      className="w-20 border border-gray-200 dark:border-red-900/50 bg-white dark:bg-black/95 backdrop-blur-sm"
                    >
                      <DropdownMenuItemAny 
                        onClick={() => setItemsPerPage(10)}
                        className="cursor-pointer text-sm"
                      >
                        10
                      </DropdownMenuItemAny>
                      <DropdownMenuItemAny 
                        onClick={() => setItemsPerPage(25)}
                        className="cursor-pointer text-sm"
                      >
                        25
                      </DropdownMenuItemAny>
                      <DropdownMenuItemAny 
                        onClick={() => setItemsPerPage(50)}
                        className="cursor-pointer text-sm"
                      >
                        50
                      </DropdownMenuItemAny>
                      <DropdownMenuItemAny 
                        onClick={() => setItemsPerPage(100)}
                        className="cursor-pointer text-sm"
                      >
                        100
                      </DropdownMenuItemAny>
                    </DropdownMenuContentAny>
                  </DropdownMenuAny>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8">
              {displayedItems.length > 0 ? (
                <div className="space-y-4">
                  {displayedItems.map((chat) => (
                    <ArchivedChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={chat.id === id}
                      onDelete={(chatId) => {
                        setDeleteId(chatId);
                        setShowDeleteDialog(true);
                      }}
                      onRestore={handleRestore}
                      setOpenMobile={setOpenMobile}
                      setView={setView}
                    />
                  ))}
                  
                  {/* Show more indicator */}
                  {archivedHistory && archivedHistory.length > itemsPerPage && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {itemsPerPage} of {archivedHistory.length} conversations
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center mb-4 border border-gray-200 dark:border-red-900/30">
                    <ArchiveAny className="w-8 h-8 text-gray-400 dark:text-red-400/60" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                    No archived conversations
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-center text-sm max-w-xs">
                    When you archive conversations, they'll appear here. You can restore them anytime or delete them permanently.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
              <div className="p-6 md:p-8 border-b border-gray-200 dark:border-red-900/30">
                <h3 className="text-lg font-bold text-foreground">Quick Actions</h3>
              </div>
              <div className="p-6 md:p-8 space-y-3">
                <ButtonAny 
                  variant="outline" 
                  className="w-full justify-start gap-2 border-gray-200 dark:border-red-900/50 bg-white dark:bg-black/40 text-foreground hover:bg-gray-50 dark:hover:bg-red-900/30"
                  onClick={() => window.location.href = '/'}
                >
                  <CircleArrowLeftAny className="w-4 h-4" />
                  Back to Conversations
                </ButtonAny>
              </div>
            </div>
            {/* Archive Info */}
            <div className="bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
              <div className="p-6 md:p-8 border-b border-gray-200 dark:border-red-900/30">
                <h3 className="text-lg font-bold text-foreground mb-2">About Archives</h3>
                <p className="text-muted-foreground text-sm">How archiving works</p>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ArchiveAny className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Safe Storage</h4>
                    <p className="text-xs text-muted-foreground mt-1">Archived chats are stored securely and don't appear in your main chat list</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <RotateCcwAny className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Easy Restoration</h4>
                    <p className="text-xs text-muted-foreground mt-1">Restore any chat anytime to continue where you left off</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Trash2Any className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Permanent Deletion</h4>
                    <p className="text-xs text-muted-foreground mt-1">Permanently delete conversations you no longer need</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-4 md:mt-6 bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-red-900/50 p-4 md:p-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm md:text-base font-bold text-foreground mb-1">Need Help?</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Having trouble managing your archived conversations? Our support team is here to help.
              </p>
            </div>
            <button onClick={() => window.open("https://barzakh.framer.ai/contact", "_blank")}
              className="bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-800 dark:text-white px-3 py-2 md:px-4 md:py-3 rounded-lg font-medium transition-colors border border-gray-300 dark:border-white/20 text-xs md:text-sm">
              Contact Support
            </button>
          </div>
        </div>

        {/* Delete Dialog */}
        <AlertDialogAny open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContentAny className="w-[calc(100%-2rem)] sm:w-full max-w-md rounded-xl border border-gray-200 dark:border-red-900/50 bg-white/98 dark:bg-black/95 backdrop-blur-sm shadow-2xl">
            <AlertDialogHeaderAny className="space-y-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto">
                <Trash2Any className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitleAny className="text-lg font-bold text-gray-900 dark:text-white text-center">
                Delete conversation permanently?
              </AlertDialogTitleAny>
              <AlertDialogDescriptionAny className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-center">
                This action cannot be undone. This will permanently delete your conversation and remove it from our servers forever.
              </AlertDialogDescriptionAny>
            </AlertDialogHeaderAny>
            <AlertDialogFooterAny className="flex-col-reverse sm:flex-row sm:justify-center gap-3 mt-6">
              <AlertDialogCancelAny className="w-full sm:w-auto rounded-lg border border-gray-300 dark:border-red-900/50 hover:bg-gray-50 dark:hover:bg-red-900/20 transition-colors duration-200 font-medium">
                Cancel
              </AlertDialogCancelAny>
              <AlertDialogActionAny
                onClick={handleDelete}
                className="w-full sm:w-auto rounded-lg bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white transition-colors duration-200 font-semibold shadow-lg"
              >
                Delete Forever
              </AlertDialogActionAny>
            </AlertDialogFooterAny>
          </AlertDialogContentAny>
        </AlertDialogAny>
      </div>
    </div>
  );
}