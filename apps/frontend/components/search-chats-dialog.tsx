"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useWindowSize } from "usehooks-ts";
import { X, SquarePen, Archive, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "@/lib/framer-motion";
import { fetcher } from "@barzakh/shared/lib/utils/utils";
import type { Chat } from "@/lib/db/schema";
import { useSidebar } from "@/components/ui/sidebar";
import { useView } from "@/context/view-context";

const XAny = X as any;
const SquarePenAny = SquarePen as any;
const ArchiveAny = Archive as any;
const MessageCircleAny = MessageCircle as any;

interface SearchChatsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

// Helper to group chats by time period
function groupChatsByPeriod(chats: Chat[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: { label: string; chats: Chat[] }[] = [
        { label: "Today", chats: [] },
        { label: "Previous 7 Days", chats: [] },
        { label: "Previous 30 Days", chats: [] },
        { label: "Older", chats: [] },
    ];

    for (const chat of chats) {
        const chatDate = new Date(chat.updatedAt || chat.createdAt);
        if (chatDate >= today) {
            groups[0].chats.push(chat);
        } else if (chatDate >= sevenDaysAgo) {
            groups[1].chats.push(chat);
        } else if (chatDate >= thirtyDaysAgo) {
            groups[2].chats.push(chat);
        } else {
            groups[3].chats.push(chat);
        }
    }

    // Only return groups that have chats
    return groups.filter((g) => g.chats.length > 0);
}

// Chat item in search results
const SearchChatItem = memo(function SearchChatItem({
    chat,
    isArchived,
    onClick,
}: {
    chat: Chat;
    isArchived?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
        >
            {isArchived ? (
                <ArchiveAny className="w-5 h-5 text-muted-foreground" />
            ) : (
                <MessageCircleAny className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="flex-1 text-sm font-medium truncate">{chat.title}</span>
        </button>
    );
});

export function SearchChatsDialog({ isOpen, onClose }: SearchChatsDialogProps) {
    const router = useRouter();
    const { setOpenMobile } = useSidebar();
    const { setView } = useView();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const { width: windowWidth } = useWindowSize();

    // Fetch active chats
    const { data: activeChats = [] } = useSWR<Chat[]>(
        isOpen ? "/api/history" : null,
        fetcher
    );

    // Fetch archived chats
    const { data: archivedChats = [] } = useSWR<Chat[]>(
        isOpen ? "/api/history/archived" : null,
        fetcher
    );

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset search when dialog closes
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery("");
            setDebouncedQuery("");
        }
    }, [isOpen]);

    // Auto-close mobile sidebar when dialog opens on small screens
    useEffect(() => {
        if (isOpen && windowWidth < 768) {
            setOpenMobile(false);
        }
    }, [isOpen, windowWidth, setOpenMobile]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Filter chats by search query
    const filterChats = useCallback(
        (chats: Chat[]) => {
            if (!debouncedQuery.trim()) return chats;
            const query = debouncedQuery.toLowerCase();
            return chats.filter((chat) =>
                chat.title.toLowerCase().includes(query)
            );
        },
        [debouncedQuery]
    );

    // Combine and mark archived chats
    const filteredActiveChats = filterChats(activeChats);
    const filteredArchivedChats = filterChats(archivedChats);

    // Combine all chats with archive flag, sort by updatedAt
    const allFilteredChats = [
        ...filteredActiveChats.map((c) => ({ ...c, isArchived: false })),
        ...filteredArchivedChats.map((c) => ({ ...c, isArchived: true })),
    ].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
    });

    const groupedChats = groupChatsByPeriod(allFilteredChats as Chat[]);

    const handleChatClick = (chatId: string) => {
        router.push(`/c/${chatId}`);
        setOpenMobile(false);
        setView("chat");
        onClose();
    };

    const handleNewChat = () => {
        router.push("/");
        setOpenMobile(false);
        setView("chat");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] pointer-events-none"
                    >
                        <div className="w-[90vw] max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden pointer-events-auto">
                            {/* Header with search input */}
                            <div className="flex items-center px-4 py-3 border-b border-border">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search chats..."
                                    className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm font-medium focus:outline-none"
                                    autoFocus
                                />
                                <button
                                    onClick={onClose}
                                    className="p-1 hover:bg-muted rounded-md transition-colors"
                                >
                                    <XAny className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Body with results */}
                            <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                                {/* New chat option */}
                                <button
                                    onClick={handleNewChat}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                                >
                                    <SquarePenAny className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-sm font-medium">New chat</span>
                                </button>

                                {/* Grouped results */}
                                {groupedChats.map((group) => (
                                    <div key={group.label}>
                                        <div className="px-4 py-2 text-xs font-medium text-muted-foreground">
                                            {group.label}
                                        </div>
                                        {group.chats.map((chat: any) => (
                                            <SearchChatItem
                                                key={chat.id}
                                                chat={chat}
                                                isArchived={chat.isArchived}
                                                onClick={() => handleChatClick(chat.id)}
                                            />
                                        ))}
                                    </div>
                                ))}

                                {/* No results */}
                                {allFilteredChats.length === 0 && debouncedQuery && (
                                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                        No chats found for "{debouncedQuery}"
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
