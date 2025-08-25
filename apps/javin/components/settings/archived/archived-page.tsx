"use client";

import { memo, useEffect, useState } from "react";
import type { User } from "next-auth";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Archive, MessageCircle, RotateCcw, Trash2, MoreHorizontal } from "lucide-react";

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
import { fetcher } from "@javin/shared/lib/utils/utils";

const ArchivedChatItem = ({
  chat,
  isActive,
  onDelete,
  onRestore,
  setOpenMobile,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  onRestore: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
}) => {
  return (
    <div className="group bg-white dark:bg-black/40 rounded-xl border border-gray-200 dark:border-red-900/30 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden backdrop-blur-sm">
      <div className="relative flex items-center p-4">
        <Link
          href={`/chat/${chat.id}`}
          onClick={() => setOpenMobile(false)}
          className={`
            flex items-center gap-4 flex-1 min-w-0 rounded-lg p-3 transition-all duration-200
            ${
              isActive
                ? "bg-gradient-to-r from-red-50 to-red-25 dark:from-red-950/50 dark:to-red-900/30 text-red-700 dark:text-red-300"
                : "hover:bg-gray-50 dark:hover:bg-red-900/20"
            }
          `}
        >
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md border transition-all duration-200
            ${
              isActive 
                ? "bg-red-100 dark:bg-red-800/50 border-red-200 dark:border-red-700/50" 
                : "bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50"
            }
          `}>
            <MessageCircle className={`w-5 h-5 ${isActive ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm truncate ${
              isActive ? "text-red-900 dark:text-red-200" : "text-gray-900 dark:text-white"
            }`}>
              {chat.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Archived conversation
            </p>
          </div>
        </Link>

        <DropdownMenu modal={true}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`
                flex-shrink-0 h-10 w-10 p-0 rounded-xl border
                opacity-0 group-hover:opacity-100 transition-all duration-200
                hover:bg-gray-50 dark:hover:bg-red-900/30 hover:text-gray-700 dark:hover:text-gray-200
                data-[state=open]:opacity-100 data-[state=open]:bg-gray-50 dark:data-[state=open]:bg-red-900/30
                border-gray-200 dark:border-red-900/30
                ${isActive ? "opacity-70 hover:opacity-100" : ""}
              `}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="right"
            align="start"
            className="w-48 shadow-2xl border border-gray-200 dark:border-red-900/50 bg-white/98 dark:bg-black/95 backdrop-blur-sm rounded-xl"
            sideOffset={8}
          >
            <DropdownMenuItem
              className="cursor-pointer rounded-lg m-1 hover:bg-gray-50 dark:hover:bg-red-900/20 focus:bg-gray-50 dark:focus:bg-red-900/20"
              onSelect={() => onRestore(chat.id)}
            >
              <RotateCcw className="mr-3 h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-medium text-gray-700 dark:text-gray-200">Restore chat</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-200 dark:bg-red-900/30" />
            <DropdownMenuItem
              className="cursor-pointer rounded-lg m-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 focus:bg-red-50 dark:focus:bg-red-900/30"
              onSelect={() => onDelete(chat.id)}
            >
              <Trash2 className="mr-3 h-4 w-4" />
              <span className="font-medium">Delete permanently</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export function ArchivedPage({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const { id } = useParams();
  const { mutate: globalMutate } = useSWRConfig();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
        return "Chat restored successfully";
      },
      error: "Failed to restore chat",
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-red-950 dark:to-gray-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
            <div className="p-8 flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-gray-300 dark:border-red-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600 dark:text-gray-300 font-medium">Loading archived chats...</p>
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
        <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
          {/* Header */}
          <div className="p-8 border-b border-gray-200 dark:border-red-900/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-red-800/50 rounded-xl flex items-center justify-center shadow-lg border border-gray-200 dark:border-red-700/50">
                <Archive className="w-6 h-6 text-gray-600 dark:text-red-300" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Archived Conversations
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  {archivedHistory?.length || 0} archived {(archivedHistory?.length || 0) === 1 ? 'conversation' : 'conversations'}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {archivedHistory && archivedHistory.length > 0 ? (
              <div className="space-y-4">
                {archivedHistory.map((chat) => (
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
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-24 h-24 bg-gray-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-6 border border-gray-200 dark:border-red-900/30">
                  <Archive className="w-12 h-12 text-gray-400 dark:text-red-400/60" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No archived conversations
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                  When you archive conversations, they'll appear here. You can restore them anytime or delete them permanently.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="w-[calc(100%-2rem)] sm:w-full max-w-md rounded-xl border border-gray-200 dark:border-red-900/50 bg-white/98 dark:bg-black/95 backdrop-blur-sm shadow-2xl">
            <AlertDialogHeader className="space-y-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-gray-900 dark:text-white text-center">
                Delete conversation permanently?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-center">
                This action cannot be undone. This will permanently delete your conversation and remove it from our servers forever.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-center gap-3 mt-6">
              <AlertDialogCancel className="w-full sm:w-auto rounded-lg border border-gray-300 dark:border-red-900/50 hover:bg-gray-50 dark:hover:bg-red-900/20 transition-colors duration-200 font-medium">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="w-full sm:w-auto rounded-lg bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white transition-colors duration-200 font-semibold shadow-lg"
              >
                Delete Forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}