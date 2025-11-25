"use client";

import { Attachment, ChatRequestOptions, Message } from "ai";
import { Button } from "./ui/button";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { Textarea } from "./ui/textarea";
import { deleteTrailingMessages } from "@/app/(chat)/actions";
import { SearchGroupId } from "@barzakh/shared/lib/utils/utils";
import { FiX, FiSend } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import { Image as ImageIcon, Paperclip } from "lucide-react";
import { PreviewAttachment } from "./preview-attachment";

const TextareaAny = Textarea as any;
const ButtonAny = Button as any;
const CgSpinnerAny = CgSpinner as any;
const FiXAny = FiX as any;
const FiSendAny = FiSend as any;
const ImageIconAny = ImageIcon as any;
const PaperclipAny = Paperclip as any;

type EditableMedia = {
  id: string;
  url: string;
  name?: string;
  contentType?: string;
  source: "content" | "attachment";
  attachment?: Attachment;
  originalUrl?: string;
};

type EditableMessageState = {
  text: string;
  images: EditableMedia[];
  files: EditableMedia[];
};

type MessageContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      image: string;
      name?: string;
      alt?: string;
      contentType?: string;
      originalUrl?: string;
    };

const ORIGINAL_IMAGE_META_REGEX =
  /\[ORIGINAL_IMAGE_URLS_FOR_EDITING:\s*([^\]]+)\]/i;

const extractOriginalImageMeta = (text: string) => {
  if (!text) {
    return { cleanedText: "", originalUrls: [] };
  }

  const match = text.match(ORIGINAL_IMAGE_META_REGEX);
  if (!match) {
    return { cleanedText: text, originalUrls: [] };
  }

  const cleanedText = text.replace(match[0], "").trimEnd();
  const originalUrls = match[1]
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  return { cleanedText, originalUrls };
};

const buildEditableState = (message: Message): EditableMessageState => {
  const textParts: string[] = [];
  const inlineImages: EditableMedia[] = [];

  const rawContent = message.content;

  if (typeof rawContent === "string") {
    textParts.push(rawContent);
  } else if (Array.isArray(rawContent)) {
    const structuredContent = rawContent as MessageContentPart[];
    structuredContent.forEach((part, index) => {
      if (part?.type === "text" && typeof part.text === "string") {
        textParts.push(part.text);
      }

      if (part?.type === "image" && typeof part.image === "string") {
        inlineImages.push({
          id: `${message.id}-content-image-${index}`,
          name: part?.name ?? part?.alt ?? `Image ${inlineImages.length + 1}`,
          url: part.image,
          contentType: part?.contentType ?? "image/*",
          source: "content",
          originalUrl: part?.originalUrl,
        });
      }
    });
  }

  const joinedText = textParts.join("\n\n");
  const { cleanedText, originalUrls } = extractOriginalImageMeta(joinedText);

  const inlineImagesWithMeta = inlineImages.map((image, index) => ({
    ...image,
    originalUrl: originalUrls[index] ?? image.originalUrl ?? image.url,
  }));

  const attachmentImages: EditableMedia[] = [];
  const fileAttachments: EditableMedia[] = [];

  (message.experimental_attachments ?? []).forEach(
    (attachment: Attachment, index) => {
      if (!attachment) return;

      const attachmentId =
        (attachment as Attachment & { id?: string }).id ??
        `${message.id}-attachment-${index}`;

      const base: EditableMedia = {
        id: attachmentId,
        name: attachment.name ?? `Attachment ${index + 1}`,
        url: attachment.url ?? "",
        contentType: attachment.contentType,
        source: "attachment",
        attachment: { ...attachment },
        originalUrl: attachment.url,
      };

      if (attachment.contentType?.startsWith("image/")) {
        attachmentImages.push(base);
      } else {
        fileAttachments.push(base);
      }
    }
  );

  return {
    text: cleanedText,
    images: [...inlineImagesWithMeta, ...attachmentImages],
    files: fileAttachments,
  };
};

const buildContentPayload = (
  text: string,
  images: EditableMedia[]
): Message["content"] => {
  const hasText = text.trim().length > 0;
  const inlineImages = images.filter((image) => image.source === "content");
  const metadataUrls = inlineImages
    .map((image) => image.originalUrl)
    .filter((url): url is string => Boolean(url && url.length));

  type StructuredContentPart =
    | { type: "text"; text: string }
    | { type: "image"; image: string };

  const contentParts: StructuredContentPart[] = [];

  if (hasText) {
    contentParts.push({ type: "text", text });
  }

  inlineImages.forEach((image) => {
    contentParts.push({ type: "image", image: image.url });
  });

  if (metadataUrls.length > 0) {
    contentParts.push({
      type: "text",
      text: `\n\n[ORIGINAL_IMAGE_URLS_FOR_EDITING: ${metadataUrls.join(", ")}]`,
    });
  }

  if (contentParts.length === 0) {
    return "";
  }

  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return contentParts[0].text;
  }

  return contentParts as unknown as Message["content"];
};

const buildAttachmentPayload = (
  images: EditableMedia[],
  files: EditableMedia[]
): Attachment[] | undefined => {
  const attachmentSources = [...images, ...files].filter(
    (item) => item.source === "attachment"
  );

  if (attachmentSources.length === 0) {
    return undefined;
  }

  return attachmentSources.map((item) =>
    item.attachment
      ? { ...item.attachment }
      : {
          url: item.url ?? "",
          name: item.name,
          contentType: item.contentType,
        }
  );
};

const toAttachment = (media: EditableMedia): Attachment => {
  if (media.attachment) return media.attachment;
  return {
    url: media.url,
    name: media.name,
    contentType: media.contentType,
  };
};

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
  const [editorState, setEditorState] = useState<EditableMessageState>(() =>
    buildEditableState(message)
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
      // Automatically focus and select text
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
    const value = event.target.value;
    setEditorState((prev) => ({
      ...prev,
      text: value,
    }));
    adjustHeight();
  };

  const handleRemoveImage = (id: string) => {
    setEditorState((prev) => ({
      ...prev,
      images: prev.images.filter((image) => image.id !== id),
    }));
  };

  const handleRemoveFile = (id: string) => {
    setEditorState((prev) => ({
      ...prev,
      files: prev.files.filter((file) => file.id !== id),
    }));
  };

  const isMessageEmpty =
    editorState.text.trim().length === 0 &&
    editorState.images.length === 0 &&
    editorState.files.length === 0;

  const handleSubmit = async () => {
    if (isSubmitting || isMessageEmpty) return;

    try {
      setIsSubmitting(true);
      await deleteTrailingMessages({ id: message.id });

      const updatedContent = buildContentPayload(
        editorState.text,
        editorState.images
      );
      const updatedAttachments = buildAttachmentPayload(
        editorState.images,
        editorState.files
      );

      setMessages((messages) => {
        const index = messages.findIndex((m) => m.id === message.id);
        if (index === -1) {
          return messages;
        }

        const updatedMessage: Message = {
          ...message,
          content: updatedContent,
          experimental_attachments: updatedAttachments,
        };

        return [...messages.slice(0, index), updatedMessage];
      });

      setMode("view");
      await reload({ body: { group: selectedGroup } });
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-3xl">
        {editorState.images.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-3">
              {editorState.images.map((image) => (
                <PreviewAttachment
                  key={image.id}
                  attachment={toAttachment(image)}
                  onRemove={() => handleRemoveImage(image.id)}
                  size="default"
                />
              ))}
            </div>
          </div>
        )}
        {editorState.files.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-3">
              {editorState.files.map((file) => (
                <PreviewAttachment
                  key={file.id}
                  attachment={toAttachment(file)}
                  onRemove={() => handleRemoveFile(file.id)}
                  size="default"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col w-full gap-5 rounded-3xl border border-border/40 bg-background/80 p-5 shadow-lg shadow-black/10 dark:bg-neutral-950/50">
        <div className="rounded-2xl border border-border/50 bg-background/90 p-1.5 shadow-inner shadow-black/5">
          <TextareaAny
            ref={textareaRef}
            className="w-full border-none bg-transparent px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            value={editorState.text}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Edit your message..."
            rows={1}
          />
        </div>
        <div className="flex flex-col gap-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            Editing this message will branch a new conversation. Use the arrow keys
            to hop between branches.
          </p>
          <div className="flex flex-col gap-2 text-sm font-medium text-foreground md:flex-row">
            <ButtonAny
              type="button"
              variant="ghost"
              className="h-10 rounded-xl border border-border/50 px-4 text-sm font-semibold md:w-auto"
              onClick={() => setMode("view")}
            >
              Cancel
            </ButtonAny>
            <ButtonAny
              type="button"
              variant="default"
              className="h-10 rounded-xl px-5 text-sm font-semibold shadow-md shadow-primary/30 md:w-auto"
              disabled={isSubmitting || isMessageEmpty}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <CgSpinnerAny className="h-4 w-4 animate-spin" />
              ) : (
                "Save edits"
              )}
            </ButtonAny>
          </div>
        </div>
      </div>

    </div>
  );
}
