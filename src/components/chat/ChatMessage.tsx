import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType, Citation } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatMessageProps {
  message: ChatMessageType;
  onCitationClick: (citation: Citation) => void;
  onFeedback: (messageId: string, helpful: boolean) => void;
}

export function ChatMessage({ message, onCitationClick, onFeedback }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const isUser = message.role === 'user';

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
    if (message.status === 'no-answer') {
      return (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-status-draft/30 bg-status-draft/10 p-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-status-draft" />
          <div className="text-sm">
            <p className="font-medium text-status-draft">Không tìm thấy nguồn phù hợp</p>
            <p className="mt-1 text-muted-foreground">
              Thử hỏi cụ thể hơn, sử dụng từ khóa liên quan hoặc chọn phòng ban/loại tài liệu phù hợp.
            </p>
          </div>
        </div>
      );
    }

    if (message.status === 'no-permission') {
      return (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <ShieldX className="h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Không đủ quyền truy cập</p>
            <p className="mt-1 text-muted-foreground">
              Bạn không có quyền truy cập vào các tài liệu liên quan. Liên hệ quản trị viên nếu cần.
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
        'flex gap-4 px-4 py-6',
        isUser ? 'bg-muted/30' : 'bg-background'
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn(
          'text-xs',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-sidebar text-sidebar-foreground'
        )}>
          {isUser ? 'You' : 'AI'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="text-sm leading-relaxed">
          {message.content}
          {message.isStreaming && (
            <span className="inline-flex ml-1">
              <span className="animate-pulse-dot">●</span>
            </span>
          )}
        </div>

        {renderStatusMessage()}

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Sources ({message.citations.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((citation, index) => (
                <button
                  key={citation.id}
                  onClick={() => onCitationClick(citation)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-accent transition-colors"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                    {index + 1}
                  </span>
                  <span className="truncate max-w-[180px]">{citation.documentTitle}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions for assistant messages */}
        {!isUser && !message.isStreaming && (
          <div className="mt-4 flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
                  className={cn('h-8 px-2', feedbackGiven === true && 'text-status-approved')}
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
                  className={cn('h-8 px-2', feedbackGiven === false && 'text-destructive')}
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

        {/* Trace info */}
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
