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
      textareaRef.current.focus(); 
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${
        textareaRef.current.scrollHeight + 2
      }px`;
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
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    // Wrapper ini memberikan konteks (latar, padding) untuk area edit
    <div className="flex flex-col gap-4 w-full bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 shadow-md">
      <Textarea
        ref={textareaRef}
        className="!min-h-[60px]"
        value={draftContent}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Edit your message..."
        rows={1}
      />

      <div className="flex flex-row gap-2 justify-end items-center">
        <Button
          variant="ghost"
          className="h-fit py-1.5 px-3 text-sm"
          onClick={() => setMode("view")}
        >
          <FiX className="mr-1.5 h-4 w-4" />
          Cancel
        </Button>
        <Button
          variant="default"
          className="h-fit py-1.5 px-3 text-sm"
          disabled={isSubmitting || !draftContent.trim()}
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <CgSpinner className="animate-spin mr-1.5 h-4 w-4" />
          ) : (
            <FiSend className="mr-1.5 h-4 w-4" />
          )}
          {isSubmitting ? "Submitting..." : "Save & Submit"}
        </Button>
      </div>
    </div>
  );
}