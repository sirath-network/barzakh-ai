"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { ChevronDown, Pencil, Share, Archive, ArchiveRestore, Trash, Globe, Lock, Check } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    updateChatTitle,
    archiveChat,
    updateChatVisibility,
} from "@/app/(chat)/actions";
import type { VisibilityType } from "./visibility-selector";
import { restoreChat } from "@/app/(chat)/actions";

interface ChatHeaderMenuProps {
    chatId: string;
    currentTitle: string;
    visibility: VisibilityType;
    isArchived?: boolean;
    onTitleChange?: (newTitle: string) => void;
    onUnarchive?: () => void;
    className?: string;
}

export function ChatHeaderMenu({
    chatId,
    currentTitle,
    visibility,
    isArchived = false,
    onTitleChange,
    onUnarchive,
    className,
}: ChatHeaderMenuProps) {
    const router = useRouter();
    const { mutate } = useSWRConfig();

    // State for modals
    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [newTitle, setNewTitle] = useState(currentTitle);
    const [isRenaming, setIsRenaming] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    // Sync state with props
    useEffect(() => {
        setNewTitle(currentTitle);
    }, [currentTitle]);

    // Focus input when rename dialog opens
    useEffect(() => {
        if (isRenameOpen) {
            setTimeout(() => {
                titleInputRef.current?.focus();
                titleInputRef.current?.select();
            }, 100);
        }
    }, [isRenameOpen]);

    const handleRename = async () => {
        const trimmedTitle = newTitle.trim();
        if (!trimmedTitle) {
            toast.error("Title cannot be empty");
            return;
        }

        if (trimmedTitle === currentTitle) {
            setIsRenameOpen(false);
            return;
        }

        setIsRenaming(true);
        try {
            await updateChatTitle({ chatId, title: trimmedTitle });
            mutate("/api/history"); // Refresh sidebar history
            if (onTitleChange) onTitleChange(trimmedTitle);
            setIsRenameOpen(false);
            toast.success("Chat renamed");
        } catch (error) {
            console.error("Failed to rename chat:", error);
            toast.error("Failed to rename chat");
        } finally {
            setIsRenaming(false);
        }
    };

    const handleArchive = async () => {
        // 1. Give immediate feedback and navigation
        toast.success("Chat archived");
        router.push("/");

        // 2. Optimistic update (remove from local history list immediately)
        mutate(
            "/api/history",
            (currentData: any[] | undefined) => {
                if (!currentData) return [];
                return currentData.filter((chat: any) => chat.id !== chatId);
            },
            { revalidate: false } // Don't re-fetch immediately, we just navigated to home which will fetch
        );

        // 3. Perform server action in background
        try {
            await archiveChat({ chatId });
            // Revalidate truly after success to ensure consistency
            mutate("/api/history");
            mutate("/api/history/archived");
        } catch (error) {
            console.error("Failed to archive chat:", error);
            // Don't show error toast as user is already on home page
            // and action might have technically succeeded or fail is minor
            // silently revalidate to restore consistency
            mutate("/api/history");
        }
    };

    const handleUnarchive = async () => {
        try {
            await restoreChat({ chatId });
            mutate("/api/history");
            mutate("/api/history/archived");
            // Call the callback to update parent state immediately
            if (onUnarchive) onUnarchive();
            router.refresh();
            toast.success("Chat unarchived");
        } catch (error) {
            console.error("Failed to unarchive chat:", error);
            toast.error("Failed to unarchive chat");
        }
    };

    const handleDelete = async () => {
        try {
            await fetch(`/api/chat?id=${chatId}`, { method: "DELETE" });
            mutate("/api/history");
            toast.success("Chat deleted");
            router.push("/");
        } catch (error) {
            console.error("Failed to delete chat:", error);
            toast.error("Failed to delete chat");
        }
    };

    const handleVisibilityChange = async (newVisibility: VisibilityType) => {
        if (newVisibility === visibility) return;

        try {
            await updateChatVisibility({ chatId, visibility: newVisibility });
            mutate("/api/history");
            mutate(`/api/chat?id=${chatId}`); // If there's a specific chat endpoint
            toast.success(`Chat is now ${newVisibility}`);
        } catch (error) {
            console.error("Failed to update visibility:", error);
            toast.error("Failed to update visibility");
        }
    };

    const copyLink = () => {
        const url = `${window.location.origin}/c/${chatId}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    // Type assertion for components to avoid excessive 'any' usage in strict mode if needed, 
    // keeping consistent with existing patterns
    const DropdownMenuAny = DropdownMenu as any;
    const DropdownMenuContentAny = DropdownMenuContent as any;
    const DropdownMenuSubAny = DropdownMenuSub as any;
    const DropdownMenuSubTriggerAny = DropdownMenuSubTrigger as any;
    const DropdownMenuSubContentAny = DropdownMenuSubContent as any;
    const DropdownMenuItemAny = DropdownMenuItem as any;
    const DropdownMenuTriggerAny = DropdownMenuTrigger as any;
    const DropdownMenuPortalAny = DropdownMenuPortal as any;
    const DropdownMenuSeparatorAny = DropdownMenuSeparator as any;

    const ButtonAny = Button as any;
    const InputAny = Input as any;

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

    return (
        <>
            <DropdownMenuAny>
                <DropdownMenuTriggerAny asChild>
                    <ButtonAny
                        variant="ghost"
                        className={`flex items-center gap-1 h-8 px-2 text-sm md:text-base font-medium w-auto max-w-full ${className}`}
                    >
                        <span className="truncate max-w-[120px] xs:max-w-[160px] sm:max-w-[220px] md:max-w-[300px] lg:max-w-[400px] xl:max-w-[500px]">{currentTitle}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-50 flex-shrink-0" />
                    </ButtonAny>
                </DropdownMenuTriggerAny>
                <DropdownMenuContentAny align="center" className="w-56">
                    {/* Only show Rename for non-archived chats */}
                    {!isArchived && (
                        <DropdownMenuItemAny onClick={() => setIsRenameOpen(true)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Rename
                        </DropdownMenuItemAny>
                    )}

                    {/* Share options - show inline for better mobile support */}
                    {!isArchived && (
                        <>
                            <DropdownMenuSeparatorAny />
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                Share
                            </div>
                            <DropdownMenuItemAny onClick={() => handleVisibilityChange("public")}>
                                <Globe className="w-4 h-4 mr-2" />
                                Public
                                {visibility === "public" && <Check className="w-4 h-4 ml-auto text-primary" />}
                            </DropdownMenuItemAny>
                            <DropdownMenuItemAny onClick={() => handleVisibilityChange("private")}>
                                <Lock className="w-4 h-4 mr-2" />
                                Private
                                {visibility === "private" && <Check className="w-4 h-4 ml-auto text-primary" />}
                            </DropdownMenuItemAny>
                            {visibility === "public" && (
                                <DropdownMenuItemAny onClick={copyLink}>
                                    <Share className="w-4 h-4 mr-2" />
                                    Copy Link
                                </DropdownMenuItemAny>
                            )}
                            <DropdownMenuSeparatorAny />
                        </>
                    )}

                    {isArchived ? (
                        <DropdownMenuItemAny onClick={handleUnarchive}>
                            <ArchiveRestore className="w-4 h-4 mr-2" />
                            Unarchive
                        </DropdownMenuItemAny>
                    ) : (
                        <DropdownMenuItemAny onClick={handleArchive}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                        </DropdownMenuItemAny>
                    )}

                    <DropdownMenuItemAny
                        onClick={() => setIsDeleteOpen(true)}
                        className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                    >
                        <Trash className="w-4 h-4 mr-2" />
                        Delete
                    </DropdownMenuItemAny>
                </DropdownMenuContentAny>
            </DropdownMenuAny>

            {/* Rename Dialog */}
            <DialogAny open={isRenameOpen} onOpenChange={setIsRenameOpen}>
                <DialogContentAny>
                    <DialogHeaderAny>
                        <DialogTitleAny>Rename Chat</DialogTitleAny>
                    </DialogHeaderAny>
                    <div className="py-2">
                        <InputAny
                            ref={titleInputRef}
                            value={newTitle}
                            onChange={(e: any) => setNewTitle(e.target.value)}
                            placeholder="Chat title"
                            onKeyDown={(e: any) => {
                                if (e.key === "Enter") handleRename();
                            }}
                        />
                    </div>
                    <DialogFooterAny>
                        <ButtonAny variant="outline" onClick={() => setIsRenameOpen(false)}>Cancel</ButtonAny>
                        <ButtonAny onClick={handleRename} disabled={isRenaming || !newTitle.trim()}>
                            Save
                        </ButtonAny>
                    </DialogFooterAny>
                </DialogContentAny>
            </DialogAny>

            {/* Delete Confirmation */}
            <AlertDialogAny open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContentAny>
                    <AlertDialogHeaderAny>
                        <AlertDialogTitleAny>Delete Chat?</AlertDialogTitleAny>
                        <AlertDialogDescriptionAny>
                            This action cannot be undone. This will permanently delete your chat history.
                        </AlertDialogDescriptionAny>
                    </AlertDialogHeaderAny>
                    <AlertDialogFooterAny>
                        <AlertDialogCancelAny>Cancel</AlertDialogCancelAny>
                        <AlertDialogActionAny
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogActionAny>
                    </AlertDialogFooterAny>
                </AlertDialogContentAny>
            </AlertDialogAny>
        </>
    );
}
