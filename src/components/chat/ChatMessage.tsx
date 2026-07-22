/** ChatMessage: renders a single chat turn with citation badges, watermark banner, feedback controls, and trace ID panel. */
import { useState, useEffect } from "react";
import { visit } from "unist-util-visit";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Paperclip,
  ShieldAlert,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeMarkdownTables } from "@/lib/markdown-tables";
import { ChatMessage as ChatMessageType, Citation, PolicyRule } from "@/types";
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
  chatMode?: "rag" | "chatbot";
  /** Called when user clicks the Sources button — passes all citations */
  onSourcesClick: (citations: Citation[]) => void;
  onFeedback: (messageId: string, helpful: boolean) => void;
  onCitationHover?: (citationId: string | null) => void;
  onCitationClick?: (citations: Citation[], citationId: string) => void;
}

// Inline superscript badge for a [N] citation; shows a tooltip with the document title on hover.
function CitationBadge({
  num,
  citation,
  onHover,
  onClick,
}: {
  num: string;
  citation?: Citation;
  onHover?: (id: string | null) => void;
  onClick?: (citation: Citation) => void;
}) {
  const index = parseInt(num, 10);
  if (!citation) return <sup>[{index}]</sup>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <sup
          role="button"
          tabIndex={0}
          className="inline-flex items-center justify-center mx-0.5 h-4 min-w-4 px-1 rounded-full bg-gray-900/10 text-gray-900 dark:bg-white/20 dark:text-white text-[10px] font-semibold cursor-pointer hover:bg-gray-900/20 dark:hover:bg-white/30 transition-colors relative top-[-3px]"
          onMouseEnter={() => onHover?.(citation.id)}
          onMouseLeave={() => onHover?.(null)}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(citation);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick?.(citation);
            }
          }}
        >
          {index}
        </sup>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs">
        {citation.documentTitle}
      </TooltipContent>
    </Tooltip>
  );
}

// Remark plugin that converts [N] text nodes into citationNode AST nodes for custom rendering.
function remarkCitations() {
  return (tree: any) => {
    visit(tree, "text", (node: any, index: number, parent: any) => {
      const regex = /\[(\d+)\]/g;
      if (!regex.test(node.value)) return;
      regex.lastIndex = 0;

      const newNodes: any[] = [];
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(node.value)) !== null) {
        if (match.index > lastIndex) {
          newNodes.push({
            type: "text",
            value: node.value.slice(lastIndex, match.index),
          });
        }
        newNodes.push({
          type: "citationNode",
          data: { hName: "citation", hProperties: { num: match[1] } },
        });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < node.value.length) {
        newNodes.push({ type: "text", value: node.value.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...newNodes);
    });
  };
}

// Renders a user or assistant message bubble with markdown, citations, feedback buttons, and optional trace panel.
export function ChatMessage({
  message,
  chatMode,
  onSourcesClick,
  onFeedback,
  onCitationHover,
  onCitationClick,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [policyPhase, setPolicyPhase] = useState<"checking" | "thinking">("checking");

  // After 2 s of streaming without rules, switch label from "checking" → "thinking".
  useEffect(() => {
    if (!message.isStreaming || (message.appliedRules && message.appliedRules.length > 0)) return;
    setPolicyPhase("checking");
    const t = setTimeout(() => setPolicyPhase("thinking"), 2000);
    return () => clearTimeout(t);
  }, [message.isStreaming, message.appliedRules]);

  const isUser = message.role === "user";
  const isNoAnswer = message.status === "no_answer";
  const hasSources =
    !isUser &&
    message.citations &&
    message.citations.length > 0 &&
    !message.isStreaming;

  const WATERMARK_MARKER = "\n\n---\n⚠️";
  const wmIdx = !isUser ? message.content.indexOf(WATERMARK_MARKER) : -1;
  const mainContent = normalizeMarkdownTables(
    wmIdx >= 0 ? message.content.slice(0, wmIdx) : message.content,
  );
  const hasWatermarkRule = !isUser && Array.isArray(message.appliedRules) &&
    (message.appliedRules as PolicyRule[]).some((r) => r.action === "watermark");
  const hasWatermarkBanner = wmIdx >= 0 || hasWatermarkRule;

  // Copy the message content to the clipboard and show a 2 s confirmation indicator.
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Record user feedback (thumbs up/down) and lock the feedback buttons.
  const handleFeedback = (helpful: boolean) => {
    setFeedbackGiven(helpful);
    onFeedback(message.id, helpful);
  };

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-5 animate-fade-in",
        isUser ? "flex-row-reverse items-end" : "items-start",
      )}
    >
      <Avatar className={cn(
        "h-8 w-8 shrink-0 shadow-sm",
        isUser ? "ring-2 ring-gray-200" : "ring-2 ring-border",
      )}>
        <AvatarFallback
          className={cn(
            "text-[11px] font-bold",
            isUser
              ? "bg-white text-gray-900 border border-gray-400"
              : "bg-gradient-to-br from-slate-700 to-slate-800 text-slate-200",
          )}
        >
          {isUser ? "Bạn" : "AI"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "w-fit max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words",
            isUser
              ? "ml-auto bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-md shadow-gray-900/20"
              : isNoAnswer
                ? "border border-amber-200/70 bg-amber-50 text-amber-900 shadow-card"
                : "bg-card text-foreground shadow-card border border-border/60",
          )}
        >
          {isUser && message.attachedFileName && (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="flex items-center gap-1 text-xs bg-white/20 text-white rounded-full px-2.5 py-1 border border-white/30">
                <Paperclip className="h-3 w-3" />
                {message.attachedFileName}
              </span>
            </div>
          )}
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-1.5 px-1 py-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.32s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.16s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
            </div>
          ) : isUser ? (
            <span className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</span>
          ) : (
            <div
              className={cn(
                "prose prose-sm max-w-none",
                "prose-p:my-0 prose-p:leading-normal",
                "prose-ul:my-1 prose-ul:pl-4",
                "prose-ol:my-1 prose-ol:pl-4",
                "prose-li:my-0 prose-li:leading-normal",
                "prose-strong:font-semibold",
                "prose-headings:font-semibold prose-headings:my-1",
                "prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-sm",
                "prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg",
                "[&_p+ul]:mt-1 [&_p+ol]:mt-1 [&_li>p]:my-0",
              )}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkCitations]}
                components={
                  {
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2">
                        <table className="min-w-full border-collapse text-sm">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-muted/60">{children}</thead>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border px-3 py-1.5 text-left font-semibold">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border px-3 py-1.5 align-top">{children}</td>
                    ),
                    citation: ({ num }: any) => (
                      <CitationBadge
                        num={num}
                        citation={message.citations?.[parseInt(num, 10) - 1]}
                        onHover={onCitationHover}
                        onClick={(citation) =>
                          onCitationClick?.(message.citations!, citation.id)
                        }
                      />
                    ),
                  } as any
                }
              >
                {mainContent}
              </ReactMarkdown>
              {hasWatermarkBanner && (
                <div className="not-prose mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
                  <ShieldAlert className="shrink-0 h-4 w-4 text-amber-500 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed m-0">
                    Nội dung này được truy cập theo điều kiện kiểm soát phân quyền.{" "}
                    <span className="font-medium">Hoạt động truy vấn đã được ghi nhận.</span>
                  </p>
                </div>
              )}
              {message.isStreaming && (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-gray-900 dark:bg-white" />
              )}
            </div>
          )}
        </div>

        {/* ── Bottom action row ── */}
        {!isUser && !message.isStreaming && (
          <div className="mt-2.5 flex items-center gap-0.5 flex-wrap">
            {/* Sources button */}
            {hasSources && (
              <Button
                variant="outline"
                size="sm"
                className="group h-7 gap-1.5 px-2.5 text-xs rounded-full border-gray-300 bg-gray-100 text-gray-900 hover:text-white hover:bg-gray-800 hover:border-gray-400 transition-all dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                onClick={() => onSourcesClick(message.citations!)}
              >
                <BookOpen className="h-3 w-3" />
                Nguồn
                <span className="ml-0.5 inline-flex h-4 min-w-4 px-0.5 items-center justify-center rounded-full bg-gray-900/15 text-gray-900 group-hover:bg-white group-hover:text-gray-900 dark:bg-white/20 dark:text-white text-[10px] font-bold">
                  {message.citations!.length}
                </span>
              </Button>
            )}

            {hasSources && <div className="mx-1 h-4 w-px bg-border" />}

            {/* Copy */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all",
                    copied && "text-green-600 hover:text-green-600",
                  )}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sao chép</TooltipContent>
            </Tooltip>

            {/* Thumbs up */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all",
                    feedbackGiven === true && "text-green-600 bg-green-50 hover:bg-green-50 hover:text-green-600",
                  )}
                  onClick={() => handleFeedback(true)}
                  disabled={feedbackGiven !== null}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hữu ích</TooltipContent>
            </Tooltip>

            {/* Thumbs down */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all",
                    feedbackGiven === false && "text-destructive bg-destructive/10 hover:bg-destructive/10 hover:text-destructive",
                  )}
                  onClick={() => handleFeedback(false)}
                  disabled={feedbackGiven !== null}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Không hữu ích</TooltipContent>
            </Tooltip>

            {/* Details / Trace */}
            {message.traceId && (
              <>
                <div className="h-4 w-px bg-border mx-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:bg-gray-800 rounded-full"
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
          <div className="mt-2 w-[85%] rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs animate-fade-in">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground font-medium">Trace ID</span>
              <div className="flex items-center gap-1.5">
                <code className="rounded-md bg-background border border-border px-2 py-1 font-mono text-[11px]">
                  {message.traceId}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Sao chép Trace ID"
                  className="h-6 w-6 p-0"
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

        {/* ── Streaming indicator: RAG shows policy-check → Thinking; chatbot shows only Thinking ── */}
        {!isUser && message.isStreaming && (!message.appliedRules || message.appliedRules.length === 0) && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {chatMode !== "chatbot" && policyPhase === "checking" && (
              <Shield className="h-3 w-3 animate-pulse shrink-0" />
            )}
            <span className="animate-pulse">
              {chatMode !== "chatbot" && policyPhase === "checking"
                ? "Đang áp dụng chính sách phân quyền..."
                : "Thinking..."}
            </span>
          </div>
        )}

        {/* ── Applied policy rules ── */}
        {!isUser && message.appliedRules && message.appliedRules.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground mr-0.5 shrink-0">
              {message.isStreaming ? "Đang áp dụng:" : "Chính sách:"}
            </span>
            {(message.appliedRules as PolicyRule[]).map((rule) => (
              <span
                key={rule.rule_code}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  rule.action === "block"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : rule.action === "conditional"
                      ? "border-purple-200 bg-purple-50 text-purple-700"
                      : rule.action === "watermark"
                        ? "border-amber-300 bg-amber-50 text-amber-800"
                        : "border-border bg-muted text-muted-foreground",
                )}
              >
                {rule.action === "watermark"
                  ? <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                  : <Shield className="h-3 w-3 shrink-0" />}
                <span>{rule.name}</span>
                {!message.isStreaming && (
                  <span
                    className={cn(
                      "ml-0.5 rounded-full px-1.5 text-[10px] font-semibold",
                      rule.action === "block"
                        ? "bg-red-100 text-red-600"
                        : rule.action === "conditional"
                          ? "bg-purple-100 text-purple-600"
                          : rule.action === "watermark"
                            ? "bg-amber-200 text-amber-700"
                            : "bg-muted/80 text-muted-foreground",
                    )}
                  >
                    {rule.action === "block"
                      ? "Chặn"
                      : rule.action === "conditional"
                        ? "Có điều kiện"
                        : rule.action === "watermark"
                          ? "Đang ghi nhận"
                          : rule.action}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
