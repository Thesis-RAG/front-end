// src/components/chat/ChatInput.tsx
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
  const activeFilterCount = selectedOuiIds.length;
  const [showFilter, setShowFilter] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Đóng filter khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (externalAttach) {
      setAttachedFile({
        name: externalAttach.name,
        content: externalAttach.text,
      });
      onExternalAttachConsumed?.();
    }
  }, [externalAttach]);

  const handleSubmit = () => {
    if (message.trim() && !disabled && !isStreaming) {
      onSend(message.trim(), attachedFile?.content, attachedFile?.name);
      setMessage("");
      setAttachedFile(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

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

  // Callback từ DrivePicker khi chọn file
  const handleDriveAttach = (text: string, name: string) => {
    setAttachedFile({ name, content: text });
    setShowDrivePicker(false);
  };

  // Kiểm tra đã cấu hình Drive folder chưa
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
                  ? "bg-white text-primary shadow-sm"
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
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Bot className="h-3 w-3" /> Chatbot
            </button>
          </div>

          {/* Gmail source filter — chỉ hiện khi RAG mode */}
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
                        ? "bg-white text-primary shadow-sm"
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
            <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-full px-3 py-1.5 border border-primary/15 font-medium">
              <Paperclip className="h-3 w-3 shrink-0" />
              <span className="max-w-[240px] truncate">{attachedFile.name}</span>
              <button
                onClick={() => setAttachedFile(null)}
                className="ml-0.5 hover:text-destructive transition-colors shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

        <div className="relative flex items-end gap-2 rounded-xl border-2 border-border bg-card p-2 shadow-card transition-all duration-200 focus-within:border-primary/40 focus-within:shadow-card-md">
          <textarea
            ref={textareaRef}
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
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              title="Đính kèm file từ máy"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Google Drive button */}
            <button
              type="button"
              onClick={() => setShowDrivePicker((v) => !v)}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-lg transition-all relative",
                showDrivePicker
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title="Chọn file từ Google Drive"
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
                  onClick={() => setShowFilter((v) => !v)}
                  className={cn(
                    "relative h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                    showFilter || activeFilterCount > 0
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
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
                onClick={onStop}
                className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="icon"
                onClick={handleSubmit}
                disabled={!message.trim() || disabled}
                className="h-8 w-8 shrink-0 rounded-lg shadow-sm disabled:opacity-40"
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
