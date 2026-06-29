import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  RefreshCw,
  Link,
  Unlink,
  Inbox,
  Mail,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGmailAuthUrl,
  getGmailStatus,
  fetchGmailEmails,
  syncGmailEmails,
  disconnectGmail,
  gmailCallback,
} from "@/services/gmail.api";
import { createConversation, deleteConversation, postMessageStream } from "@/services/chat.api";

interface GmailEmail {
  message_id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  body_html?: string;
  label_ids: string[];
  synced: boolean;
}

function isHtml(str: string) {
  return /<[a-z][\s\S]*>/i.test(str);
}

function stripHtml(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || "").trim();
}

const AVATAR_COLORS = [
  { bg: "#1a73e8", text: "#fff" },
  { bg: "#e52592", text: "#fff" },
  { bg: "#e8710a", text: "#fff" },
  { bg: "#137333", text: "#fff" },
  { bg: "#7b1fa2", text: "#fff" },
  { bg: "#c5221f", text: "#fff" },
  { bg: "#0097a7", text: "#fff" },
  { bg: "#f29900", text: "#fff" },
];

function getAvatarStyle(from: string) {
  const name = getSenderName(from);
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function getSenderName(from: string) {
  const match = from.match(/^(.+?)\s*</);
  return match ? match[1].trim().replace(/"/g, "") : from.split("@")[0];
}

function getInitial(from: string) {
  return getSenderName(from)[0]?.toUpperCase() ?? "?";
}

// Render markdown: ### heading, **bold**, - bullets, paragraphs
function AiText({ text, streaming }: { text: string; streaming: boolean }) {
  const lines = text.split("\n");

  const renderInline = (str: string) =>
    str.split(/\*\*(.*?)\*\*/g).map((p, j) =>
      j % 2 === 1
        ? <strong key={j} className="font-semibold text-foreground">{p}</strong>
        : p,
    );

  return (
    <div className="text-[13.5px] leading-relaxed space-y-1 text-foreground/90">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;

        // ### or ## heading
        if (/^#{1,3}\s/.test(line)) {
          const heading = line.replace(/^#{1,3}\s+/, "");
          return (
            <p key={i} className="font-semibold text-foreground text-[13px] pt-2 first:pt-0 border-t border-violet-100 dark:border-violet-900/30 mt-2 first:border-0 first:mt-0">
              {renderInline(heading)}
            </p>
          );
        }

        // Bullet: - or •
        if (/^[-•]\s/.test(line)) {
          const content = line.replace(/^[-•]\s+/, "");
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-violet-500 shrink-0 leading-relaxed">•</span>
              <span>{renderInline(content)}</span>
            </div>
          );
        }

        return <p key={i}>{renderInline(line)}</p>;
      })}
      {streaming && (
        <span className="inline-block h-4 w-0.5 bg-violet-500 animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  );
}

export default function GmailPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [connected, setConnected] = useState(false);
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<GmailEmail | null>(null);

  // AI panel state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiAnalyzedId, setAiAnalyzedId] = useState<string | null>(null);
  const aiTextRef = useRef("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || !token) return;
    gmailCallback(code, token)
      .then(() => {
        toast({ variant: "success", title: "Kết nối Gmail thành công" });
        setConnected(true);
        setSearchParams({});
        loadEmails();
      })
      .catch(() => toast({ variant: "destructive", title: "Kết nối thất bại" }));
  }, [searchParams, token]);

  useEffect(() => {
    if (!token) return;
    getGmailStatus(token).then((status) => {
      setConnected(status);
      if (status) loadEmails();
    });
  }, [token]);

  const loadEmails = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchGmailEmails(token);
      setEmails(data);
      if (data.length > 0) setSelectedEmail(data[0]);
    } catch {
      toast({ variant: "destructive", title: "Không thể tải email" });
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleConnect = async () => {
    if (!token) return;
    try {
      const url = await getGmailAuthUrl(token);
      window.location.href = url;
    } catch {
      toast({ variant: "destructive", title: "Không thể lấy URL xác thực" });
    }
  };

  const handleSync = async () => {
    if (!token) return;
    setSyncing(true);
    try {
      const result = await syncGmailEmails(token);
      toast({
        variant: "success",
        title: `Đã sync ${result.synced} email mới, bỏ qua ${result.skipped} đã có`,
      });
      loadEmails();
    } catch {
      toast({ variant: "destructive", title: "Sync thất bại" });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!token || !confirm("Ngắt kết nối Gmail?")) return;
    try {
      await disconnectGmail(token);
      setConnected(false);
      setEmails([]);
      setSelectedEmail(null);
      toast({ variant: "success", title: "Đã ngắt kết nối" });
    } catch {
      toast({ variant: "destructive", title: "Thất bại" });
    }
  };

  const handleAnalyze = async () => {
    if (!token || !selectedEmail) return;
    setAiOpen(true);
    setAiText("");
    setAiStreaming(true);
    aiTextRef.current = "";
    setAiAnalyzedId(selectedEmail.message_id);

    try {
      const conv = await createConversation({ title: "Gmail AI" }, token);
      const rawBody = isHtml(selectedEmail.body)
        ? stripHtml(selectedEmail.body)
        : selectedEmail.body || selectedEmail.snippet;
      const emailContent = rawBody.slice(0, 6000);

      const prompt =
        "Phân tích email sau, trình bày ngắn gọn theo các mục:\n" +
        "• **Chủ đề chính**\n" +
        "• **Nội dung tóm tắt**\n" +
        "• **Điểm quan trọng**\n" +
        "• **Hành động cần thực hiện** (nếu có)";

      await postMessageStream(
        conv.id,
        prompt,
        token,
        (chunk) => {
          aiTextRef.current += chunk;
          setAiText(aiTextRef.current);
        },
        () => {
          setAiStreaming(false);
          deleteConversation(conv.id, token).catch(() => {});
        },
        undefined,
        "chatbot",
        emailContent,
        selectedEmail.subject,
      );
    } catch {
      setAiStreaming(false);
      toast({ variant: "destructive", title: "Phân tích thất bại" });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday)
        return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const isThisYear = d.getFullYear() === now.getFullYear();
      if (isThisYear)
        return d.toLocaleString("vi-VN", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
        });
      return d.toLocaleString("vi-VN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString())
        return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "short" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Gmail"
        description="Xem và đồng bộ email vào hệ thống RAG"
        actions={
          connected ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-2 h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? "Đang đồng bộ..." : "Đồng bộ"}
              </Button>
              <Button
                size="sm"
                className="gap-2 h-9 text-xs bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDisconnect}
              >
                Ngắt kết nối
              </Button>
            </div>
          ) : (
            <Button size="sm" className="gap-2 h-8 text-xs" onClick={handleConnect}>
              <Link className="h-3.5 w-3.5" />
              Kết nối Gmail
            </Button>
          )
        }
      />

      <div className="flex-1 overflow-hidden">
        {!connected ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <Mail className="h-16 w-16 opacity-20" />
            <p className="text-lg font-semibold">Chưa kết nối Gmail</p>
            <p className="text-sm">Nhấn "Kết nối Gmail" để bắt đầu</p>
            <Button onClick={handleConnect} className="gap-2 mt-2">
              <Link className="h-4 w-4" />
              Kết nối Gmail
            </Button>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Đang tải email...</span>
            </div>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Inbox className="h-10 w-10 opacity-20" />
            <p className="text-sm">Không có email nào</p>
          </div>
        ) : (
          <div className="flex h-full">
            {/* ── Email list ── */}
            <div className="w-[340px] shrink-0 border-r border-border flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium">Hộp thư đến</span>
                <span className="text-xs text-muted-foreground">{emails.length} email</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {emails.map((email) => {
                  const isSelected = selectedEmail?.message_id === email.message_id;
                  const isUnread = email.label_ids.includes("UNREAD");
                  const avatarStyle = getAvatarStyle(email.from);
                  return (
                    <button
                      key={email.message_id}
                      onClick={() => {
                        setSelectedEmail(email);
                        setAiText("");
                        setAiAnalyzedId(null);
                      }}
                      className={`group w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/40 transition-colors ${
                        isSelected
                          ? "bg-[#c2dbff] dark:bg-blue-900/30"
                          : "bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 select-none"
                        style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.text }}
                      >
                        {getInitial(email.from)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1 mb-0.5">
                          <span className={`text-sm truncate leading-tight ${isUnread ? "font-bold text-foreground" : "font-normal text-foreground/80"}`}>
                            {getSenderName(email.from)}
                          </span>
                          <span className={`text-xs shrink-0 ${isUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                            {formatShortDate(email.date)}
                          </span>
                        </div>
                        <p className={`text-xs truncate leading-tight mb-0.5 ${isUnread ? "font-semibold text-foreground" : "text-foreground/70"}`}>
                          {email.subject || "(no subject)"}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-muted-foreground truncate flex-1">{email.snippet}</p>
                          {email.synced && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium leading-none">
                              Đã sync
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Email detail ── */}
            {selectedEmail ? (
              <div className="flex-1 flex min-w-0 overflow-hidden">
                {/* Email content area */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  {/* Subject bar */}
                  <div className="px-6 pt-5 pb-3 border-b border-border flex items-start justify-between gap-4 shrink-0">
                    <h2 className="text-[17px] font-normal text-foreground leading-snug flex-1 min-w-0">
                      {selectedEmail.subject || "(no subject)"}
                    </h2>
                    <Button
                      size="sm"
                      onClick={handleAnalyze}
                      disabled={aiStreaming}
                      className="gap-2 h-9 shrink-0 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      {aiStreaming && aiAnalyzedId === selectedEmail.message_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      AI phân tích
                    </Button>
                  </div>

                  {/* Sender info */}
                  <div className="px-6 py-3 border-b border-border/50 shrink-0">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 select-none"
                        style={{
                          backgroundColor: getAvatarStyle(selectedEmail.from).bg,
                          color: getAvatarStyle(selectedEmail.from).text,
                        }}
                      >
                        {getInitial(selectedEmail.from)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {getSenderName(selectedEmail.from)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          &lt;{selectedEmail.from.match(/<(.+)>/)
                            ? selectedEmail.from.match(/<(.+)>/)![1]
                            : selectedEmail.from}&gt;
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          đến {selectedEmail.to || "tôi"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                        {formatDate(selectedEmail.date)}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-hidden px-6 py-4">
                    {selectedEmail.body_html ? (
                      <iframe
                        srcDoc={selectedEmail.body_html}
                        sandbox="allow-same-origin"
                        className="w-full h-full border-0 bg-white rounded"
                        title="Email content"
                      />
                    ) : isHtml(selectedEmail.body) ? (
                      <iframe
                        srcDoc={selectedEmail.body}
                        sandbox="allow-same-origin"
                        className="w-full h-full border-0 bg-white rounded"
                        title="Email content"
                      />
                    ) : (
                      <div className="h-full overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] text-foreground/90">
                        {selectedEmail.body || selectedEmail.snippet || "(no content)"}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── AI Panel (Copilot-style) ── */}
                {aiOpen && (
                  <div className="w-[320px] shrink-0 border-l border-border flex flex-col overflow-hidden bg-background">
                    {/* Panel header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-gradient-to-r from-violet-600/10 to-blue-600/10">
                      <div className="flex items-center gap-2 flex-1">
                        <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
                        <span className="text-sm font-semibold text-foreground">Phân tích AI</span>
                        {aiStreaming && aiAnalyzedId === selectedEmail.message_id && (
                          <Loader2 className="h-3.5 w-3.5 text-violet-500 animate-spin" />
                        )}
                      </div>
                      <button
                        onClick={() => setAiOpen(false)}
                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Panel content */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {!aiText && !aiStreaming ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                          <Sparkles className="h-8 w-8 opacity-30" />
                          <p className="text-xs text-center">
                            Nhấn <strong>AI phân tích</strong> để tóm tắt email này
                          </p>
                        </div>
                      ) : !aiText && aiStreaming ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                          Đang phân tích...
                        </div>
                      ) : (
                        <div className="rounded-lg border border-violet-100 dark:border-violet-900/30 bg-violet-50/50 dark:bg-violet-950/20 p-3.5">
                          <AiText
                            text={aiText}
                            streaming={
                              aiStreaming && aiAnalyzedId === selectedEmail.message_id
                            }
                          />
                        </div>
                      )}
                    </div>

                    {/* Re-analyze footer */}
                    {aiText && !aiStreaming && (
                      <div className="px-4 py-3 border-t border-border shrink-0">
                        <button
                          onClick={handleAnalyze}
                          className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Phân tích lại
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Chọn email để xem nội dung
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
