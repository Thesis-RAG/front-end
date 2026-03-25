import { useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  AlertTriangle,
  ShieldX,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage as ChatMessageType, Citation } from "@/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatMessageProps {
  message: ChatMessageType;
  onCitationClick: (citation: Citation) => void;
  onFeedback: (messageId: string, helpful: boolean) => void;
}

export function ChatMessage({
  message,
  onCitationClick,
  onFeedback,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (helpful: boolean) => {
    setFeedbackGiven(helpful);
    onFeedback(message.id, helpful);
  };

  const renderStatusMessage = () => {
    if (message.status === "no-answer") {
      return (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-status-draft/30 bg-status-draft/10 p-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-status-draft" />
          <div className="text-sm">
            <p className="font-medium text-status-draft">
              Không tìm thấy nguồn phù hợp
            </p>
            <p className="mt-1 text-muted-foreground">
              Thử hỏi cụ thể hơn, sử dụng từ khóa liên quan hoặc chọn phòng
              ban/loại tài liệu phù hợp.
            </p>
          </div>
        </div>
      );
    }

    if (message.status === "no-permission") {
      return (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <ShieldX className="h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              Không đủ quyền truy cập
            </p>
            <p className="mt-1 text-muted-foreground">
              Bạn không có quyền truy cập vào các tài liệu liên quan. Liên hệ
              quản trị viên nếu cần.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        "flex gap-4 px-4 py-6",
        isUser ? "flex-row-reverse items-end" : "items-start",
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-sidebar text-sidebar-foreground",
          )}
        >
          {isUser ? "You" : "AI"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "w-fit max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isUser
              ? "ml-auto bg-gray-100 text-gray-900"
              : "bg-background text-gray-900",
          )}
        >
          {message.isStreaming ? (
            <div className="mt-3 flex translate-y-1 items-center gap-2">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
            </div>
          ) : (
            <div>{message.content}</div>
          )}
        </div>

        {renderStatusMessage()}

        {message.citations && message.citations.length > 0 && (
          <div className="mt-4">
            <p
              className={cn(
                "mb-2 text-xs font-medium text-muted-foreground",
                isUser && "text-right",
              )}
            >
              Sources ({message.citations.length})
            </p>
            <div
              className={cn("flex flex-wrap gap-2", isUser && "justify-end")}
            >
              {message.citations.map((citation, index) => (
                <button
                  key={citation.id}
                  onClick={() => onCitationClick(citation)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                    {index + 1}
                  </span>
                  <span className="max-w-[180px] truncate">
                    {citation.documentTitle}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {!isUser && !message.isStreaming && (
          <div className="mt-4 flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-border" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2",
                    feedbackGiven === true && "text-status-approved",
                  )}
                  onClick={() => handleFeedback(true)}
                  disabled={feedbackGiven !== null}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Helpful</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2",
                    feedbackGiven === false && "text-destructive",
                  )}
                  onClick={() => handleFeedback(false)}
                  disabled={feedbackGiven !== null}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Not helpful</TooltipContent>
            </Tooltip>

            {message.traceId && (
              <>
                <div className="h-4 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => setShowTrace(!showTrace)}
                >
                  Details
                  {showTrace ? (
                    <ChevronUp className="ml-1 h-3 w-3" />
                  ) : (
                    <ChevronDown className="ml-1 h-3 w-3" />
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {showTrace && message.traceId && (
          <div
            className={cn(
              "mt-3 rounded-md border border-border bg-muted/50 p-3 text-xs animate-fade-in",
              isUser && "text-right",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Trace ID:</span>
              <div className="flex items-center gap-2">
                <code className="rounded bg-background px-1.5 py-0.5 font-mono">
                  {message.traceId}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(message.traceId!);
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
