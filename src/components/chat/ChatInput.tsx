/** ChatInput: message composer with file attachment, mode toggle, source filter, and streaming stop control. */
import * as pdfjsLib from "pdfjs-dist";
import * as mammoth from "mammoth";
import { useState, useRef, useEffect } from "react";
import {
  Send,
  Square,
  SlidersHorizontal,
  Bot,
  BookOpen,
  Plus,
  X,
  Paperclip,
  HardDrive,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatFilter } from "@/components/chat/ChatFilter";
import { DrivePicker } from "@/components/chat/DrivePicker";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

interface ChatInputProps {
  onSend: (message: string, fileContent?: string, fileName?: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  chatMode: "rag" | "chatbot";
  externalAttach?: { text: string; name: string } | null;
  onToggleMode: () => void;
  onExternalAttachConsumed?: () => void;
  selectedOuiIds?: string[];
  availableOuis?: { id: string; name: string; ou_name: string }[];
  onToggleOui?: (id: string) => void;
  chatSource: "rag" | "gmail" | "all";
  onChangeChatSource: (source: "rag" | "gmail" | "all") => void;
}

// Multi-functional chat input supporting RAG/chatbot mode, file attachment, OUI filtering, and streaming.
export function ChatInput({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  placeholder = "Đặt câu hỏi về kiến ​​thức doanh nghiệp...",
  chatMode,
  externalAttach,
  onToggleMode,
  onExternalAttachConsumed,
  selectedOuiIds = [],
  availableOuis = [],
  onToggleOui = () => {},
  chatSource,
  onChangeChatSource,
}: ChatInputProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeFilterCount = selectedOuiIds.length;

  // Auto-resize the textarea up to 200 px as the message content grows.
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Close the filter dropdown when the user clicks outside the filter container.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Consume a file attachment injected from a parent component (e.g. email preview).
  useEffect(() => {
    if (externalAttach) {
      setAttachedFile({
        name: externalAttach.name,
        content: externalAttach.text,
      });
      onExternalAttachConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalAttach, onExternalAttachConsumed]);

  // Send the current message and attached file, then reset local state.
  const handleSubmit = () => {
    if (message.trim() && !disabled && !isStreaming) {
      onSend(message.trim(), attachedFile?.content, attachedFile?.name);
      setMessage("");
      setAttachedFile(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  // Submit on Enter (without Shift); allow Shift+Enter for newlines.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Parse the selected local file (PDF, DOCX, or plain text) and store its content as the attachment.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let text = "";

      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
      } else if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        toast({ title: "File trống hoặc không đọc được nội dung" });
        return;
      }

      setAttachedFile({ name: file.name, content: text });
    } catch (err) {
      toast({ title: "Không thể đọc file", description: String(err) });
    }

    e.target.value = "";
  };

  // Attach the file selected from Google Drive and close the picker.
  const handleDriveAttach = (text: string, name: string) => {
    setAttachedFile({ name, content: text });
    setShowDrivePicker(false);
  };

  // True if a Drive folder URL has been configured in localStorage.
  const hasDriveFolder = !!localStorage.getItem("drive_folder_url");

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur-sm px-4 pt-3 pb-4">
      <div className="mx-auto max-w-3xl">
        {/* Mode & source toggle row */}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          <div className="flex items-center gap-0.5 bg-muted/80 rounded-full p-0.5">
            <button
              onClick={() => chatMode !== "rag" && onToggleMode()}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150",
                chatMode === "rag"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <BookOpen className="h-3 w-3" /> RAG SMEs
            </button>
            <button
              onClick={() => chatMode !== "chatbot" && onToggleMode()}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150",
                chatMode === "chatbot"
                  ? "bg-white text-gray-900 shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Bot className="h-3 w-3" /> Chatbot
            </button>
          </div>

          {/* Source filter pills — visible in RAG mode only. */}
          {chatMode === "rag" && (
            <>
              <div className="h-4 w-px bg-border mx-0.5" />
              <div className="flex items-center gap-0.5 bg-muted/80 rounded-full p-0.5">
                {(["rag", "gmail", "all"] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => onChangeChatSource(src)}
                    className={cn(
                      "rounded-full px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                      chatSource === src
                        ? "bg-white text-gray-900 shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {src === "rag" ? "Tài liệu" : src === "gmail" ? "Gmail" : "Tất cả"}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Attached file badge */}
        {attachedFile && (
          <div className="flex items-center gap-1.5 px-1 pb-2">
            <span className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-900 rounded-full px-3 py-1.5 border border-gray-200 font-medium dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
              <Paperclip className="h-3 w-3 shrink-0" />
              <span className="max-w-[240px] truncate">{attachedFile.name}</span>
              <button
                aria-label="Xóa file đính kèm"
                onClick={() => setAttachedFile(null)}
                className="ml-0.5 hover:text-destructive transition-colors shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

        <div className="relative flex items-end gap-2 rounded-xl border-2 border-border bg-card p-2 shadow-card transition-all duration-200 focus-within:border-gray-400/60 focus-within:shadow-card-md">
          <textarea
            ref={textareaRef}
            aria-label="Nhập câu hỏi"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground",
              "max-h-[200px] min-h-[40px] leading-relaxed",
            )}
          />

          <div className="flex items-center gap-0.5">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.csv,.json,.xml,.log,.pdf,.docx"
              onChange={handleFileChange}
            />

            {/* Local file attach button */}
            <button
              type="button"
              aria-label="Đính kèm file từ máy"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Google Drive button */}
            <button
              type="button"
              aria-label="Chọn file từ Google Drive"
              onClick={() => setShowDrivePicker((v) => !v)}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-lg transition-all relative",
                showDrivePicker
                  ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <HardDrive className="h-4 w-4" />
              {hasDriveFolder && !showDrivePicker && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-green-500" />
              )}
            </button>

            {/* Filter button */}
            {chatMode === "rag" && (
              <div className="relative" ref={filterRef}>
                <button
                  aria-label="Lọc theo đơn vị"
                  aria-expanded={showFilter}
                  onClick={() => setShowFilter((v) => !v)}
                  className={cn(
                    "relative h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                    showFilter || activeFilterCount > 0
                      ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-gray-900 text-[10px] text-white font-bold">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {showFilter && (
                  <ChatFilter
                    availableOuis={availableOuis}
                    selectedOuiIds={selectedOuiIds}
                    onToggleOui={onToggleOui}
                    onClose={() => setShowFilter(false)}
                  />
                )}
              </div>
            )}

            {/* Send / Stop */}
            {isStreaming ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Dừng"
                onClick={onStop}
                className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="icon"
                aria-label="Gửi"
                onClick={handleSubmit}
                disabled={!message.trim() || disabled}
                className="h-8 w-8 shrink-0 rounded-lg shadow-sm disabled:opacity-40 bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
          {chatMode === "rag"
            ? "Câu trả lời được tạo từ kho kiến thức. Luôn kiểm tra lại các nguồn đã trích dẫn."
            : "Trợ lý AI đa năng. Câu trả lời dựa trên mô hình ngôn ngữ và có thể không chính xác."}
        </p>
      </div>

      {/* Drive Picker Portal */}
      {showDrivePicker && (
        <DrivePicker
          onAttach={handleDriveAttach}
          onClose={() => setShowDrivePicker(false)}
        />
      )}
    </div>
  );
}
