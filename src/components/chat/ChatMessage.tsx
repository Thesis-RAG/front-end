import { useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Paperclip,
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
  userQuery?: string;
  /** Called when user clicks the Sources button — passes all citations */
  onSourcesClick: (citations: Citation[]) => void;
  onFeedback: (messageId: string, helpful: boolean) => void;
}

export function ChatMessage({
  message,
  onSourcesClick,
  onFeedback,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const isUser = message.role === "user";
  const isNoAnswer = message.status === "no_answer";
  const hasSources =
    !isUser &&
    message.citations &&
    message.citations.length > 0 &&
    !message.isStreaming;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (helpful: boolean) => {
    setFeedbackGiven(helpful);
    onFeedback(message.id, helpful);
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
              : isNoAnswer
                ? "bg-yellow-50 text-gray-900"
                : "bg-background text-gray-900",
          )}
        >
          {isUser && message.attachedFileName && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1 border border-primary/20">
                <Paperclip className="h-3 w-3" />
                {message.attachedFileName}
              </span>
            </div>
          )}
          {message.isStreaming && !message.content ? (
            <div className="mt-3 flex translate-y-1 items-center gap-2">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
            </div>
          ) : (
            <div>
              {message.content}
              {message.isStreaming && (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-gray-600" />
              )}
            </div>
          )}
        </div>

        {/* ── Bottom action row ── */}
        {!isUser && !message.isStreaming && (
          <div className="mt-3 flex items-center gap-1 flex-wrap">
            {/* Sources button — single, Vertex AI style */}
            {hasSources && (
              <Button
                variant="outline"
                size="sm"
                className="group h-7 gap-1.5 px-2.5 text-xs rounded-full border-border hover:bg-accent"
                onClick={() => onSourcesClick(message.citations!)}
              >
                <BookOpen className="h-3 w-3" />
                Nguồn
                <span
                  // 2. Thêm group-hover để đổi màu nền và màu chữ của con số khi hover vào Button
                  className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold transition-colors group-hover:bg-background group-hover:text-foreground"
                >
                  {message.citations!.length}
                </span>
              </Button>
            )}

            <div className="mx-1 h-4 w-px bg-border" />

            {/* Copy */}
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

            {/* Thumbs up */}
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

            {/* Thumbs down */}
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

            {/* Details / Trace */}
            {message.traceId && (
              <>
                <div className="h-4 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => setShowTrace(!showTrace)}
                >
                  Chi tiết
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

        {/* Trace ID panel */}
        {showTrace && message.traceId && (
          <div className="mt-3 rounded-md border border-border bg-muted/50 p-3 text-xs animate-fade-in">
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
