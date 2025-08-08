"use client";

import { ChatRequestOptions, Message } from "ai";
import { Button } from "./ui/button";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Textarea } from "./ui/textarea";
import { deleteTrailingMessages } from "@/app/(chat)/actions";
import { SearchGroupId } from "@javin/shared/lib/utils/utils";
import { FiX, FiSend } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";

export type MessageEditorProps = {
  message: Message;
  setMode: Dispatch<SetStateAction<"view" | "edit">>;
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[])
  ) => void;
  selectedGroup: SearchGroupId;
  reload: (
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
};

export function MessageEditor({
  message,
  setMode,
  setMessages,
  selectedGroup,
  reload,
}: MessageEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [draftContent, setDraftContent] = useState<string>(message.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
      // Secara otomatis fokus dan pilih teks
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    adjustHeight();
  };

  const handleSubmit = async () => {
    if (isSubmitting || !draftContent.trim()) return;

    setIsSubmitting(true);
    await deleteTrailingMessages({ id: message.id });
    setMessages((messages) => {
      const index = messages.findIndex((m) => m.id === message.id);
      if (index !== -1) {
        const updatedMessage = { ...message, content: draftContent };
        return [...messages.slice(0, index), updatedMessage];
      }
      return messages;
    });
    setMode("view");
    reload({ body: { group: selectedGroup } });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
    if (event.key === "Escape") {
      setMode("view");
    }
  };

  return (
    <div className="flex flex-col w-full bg-muted/50 rounded-2xl p-3">
      <Textarea
        ref={textareaRef}
        className="w-full bg-transparent border-0 resize-none px-4 py-2 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
        value={draftContent}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Edit your message..."
        rows={1}
      />
      <div className="flex flex-row gap-2 justify-end items-center mt-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => setMode("view")}
          title="Cancel (Esc)"
        >
          <FiX className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="icon"
          className="h-8 w-8 rounded-full"
          disabled={isSubmitting || !draftContent.trim()}
          onClick={handleSubmit}
          title="Save & Submit (Enter)"
        >
          {isSubmitting ? (
            <CgSpinner className="animate-spin h-4 w-4" />
          ) : (
            <FiSend className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
