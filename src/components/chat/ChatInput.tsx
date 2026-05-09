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
import { Project } from "@/services/projects.api";
import { Department } from "@/services/departments.api";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

interface ChatInputProps {
  onSend: (message: string, fileContent?: string, fileName?: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  // Filter props
  availableProjects: Project[];
  availableDepts: Department[];
  selectedProjectIds: string[];
  selectedDeptIds: string[];
  deptFilterOn: boolean;
  userRole: string;
  activeFilterCount: number;
  chatMode: "rag" | "chatbot";
  externalAttach?: { text: string; name: string } | null;
  onToggleProject: (id: string) => void;
  onToggleDept: (id: string) => void;
  onToggleDeptFilter: () => void;
  onToggleMode: () => void;
  onExternalAttachConsumed?: () => void;
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  placeholder = "Đặt câu hỏi về kiến ​​thức doanh nghiệp...",
  availableProjects,
  availableDepts,
  selectedProjectIds,
  selectedDeptIds,
  deptFilterOn,
  userRole,
  activeFilterCount,
  chatMode,
  externalAttach,
  onToggleProject,
  onToggleDept,
  onToggleDeptFilter,
  onToggleMode,
  onExternalAttachConsumed,
}: ChatInputProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
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
    <div className="border-t border-border bg-background p-4">
      <div className="mx-auto max-w-3xl">
        {/* Mode toggle */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onToggleMode}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border",
              chatMode === "rag"
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted text-muted-foreground border-border hover:bg-muted/80",
            )}
          >
            <BookOpen className="h-3 w-3" />
            RAG SMEs
          </button>
          <button
            onClick={onToggleMode}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border",
              chatMode === "chatbot"
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted text-muted-foreground border-border hover:bg-muted/80",
            )}
          >
            <Bot className="h-3 w-3" />
            Chatbot
          </button>
        </div>

        {/* Attached file badge */}
        {attachedFile && (
          <div className="flex items-center gap-1.5 px-2 pb-1">
            <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1 border border-primary/20">
              <Paperclip className="h-3 w-3" />
              {attachedFile.name}
              <button
                onClick={() => setAttachedFile(null)}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

        <div className="relative flex items-end gap-2 rounded-lg border border-input bg-card p-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
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
              "max-h-[200px] min-h-[40px]",
            )}
          />

          <div className="flex items-center gap-1">
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
              className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Đính kèm file từ máy"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Google Drive button */}
            <button
              type="button"
              onClick={() => setShowDrivePicker((v) => !v)}
              className={cn(
                "h-9 w-9 flex items-center justify-center rounded-md transition-colors relative",
                showDrivePicker
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title="Choose file from Google Drive"
            >
              <HardDrive className="h-4 w-4" />
              {/* Dot indicator nếu đã cấu hình folder */}
              {hasDriveFolder && !showDrivePicker && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />
              )}
            </button>

            {/* Filter button */}
            {chatMode === "rag" && (
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilter((v) => !v)}
                  className={cn(
                    "relative h-9 w-9 flex items-center justify-center rounded-md transition-colors",
                    showFilter || activeFilterCount > 0
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-medium">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {showFilter && (
                  <ChatFilter
                    availableProjects={availableProjects}
                    availableDepts={availableDepts}
                    selectedProjectIds={selectedProjectIds}
                    selectedDeptIds={selectedDeptIds}
                    deptFilterOn={deptFilterOn}
                    userRole={userRole}
                    onToggleProject={onToggleProject}
                    onToggleDept={onToggleDept}
                    onToggleDeptFilter={onToggleDeptFilter}
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
                className="h-9 w-9 shrink-0"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="icon"
                onClick={handleSubmit}
                disabled={!message.trim() || disabled}
                className="h-9 w-9 shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          {chatMode === "rag"
            ? "Câu trả lời được tạo ra từ kho kiến ​​thức. Luôn luôn kiểm tra lại các nguồn đã trích dẫn."
            : "Trợ lý AI đa năng. Câu trả lời dựa trên mô hình ngôn ngữ và có thể không chính xác. Luôn kiểm tra lại thông tin quan trọng."}
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
