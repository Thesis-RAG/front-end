/** GmailPage: Gmail integration – connect account, sync emails, view email content, and run AI analysis. */
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  RefreshCw,
  Link,
  Inbox,
  Mail,
  Sparkles,
  X,
  Loader2,
  Search,
  Bell,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGmailAuthUrl,
  getGmailStatus,
  fetchGmailEmails,
  syncGmailEmails,
  syncSingleEmail,
  disconnectGmail,
  gmailCallback,
} from "@/services/gmail.api";
import {
  createConversation,
  deleteConversation,
  postMessageStream,
} from "@/services/chat.api";

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

// Return true if the string contains HTML tags.
function isHtml(str: string) {
  return /<[a-z][\s\S]*>/i.test(str);
}

// Strip HTML tags and return plain text content.
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

// Derive a consistent avatar color from the sender's display name.
function getAvatarStyle(from: string) {
  const name = getSenderName(from);
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// Extract the display name from a "Name <email>" formatted string.
function getSenderName(from: string) {
  const match = from.match(/^(.+?)\s*</);
  return match ? match[1].trim().replace(/"/g, "") : from.split("@")[0];
}

// Return the first character of the sender's display name, uppercased.
function getInitial(from: string) {
  return getSenderName(from)[0]?.toUpperCase() ?? "?";
}

// Format a short date label for the email list: time if today, day+month otherwise.
function formatShortDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
}

// Format a full timestamp: time-only for today, date+time for this year, full date+time otherwise.
function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    if (d.getFullYear() === now.getFullYear())
      return d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// Render AI-generated markdown: ### headings, **bold**, - bullets, plain paragraphs.
function AiText({ text, streaming }: { text: string; streaming: boolean }) {
  const lines = text.split("\n");

  const renderInline = (str: string) =>
    str.split(/\*\*(.*?)\*\*/g).map((p, j) =>
      j % 2 === 1 ? (
        <strong key={j} className="font-semibold text-foreground">
          {p}
        </strong>
      ) : (
        p
      ),
    );

  return (
    <div className="text-[13.5px] leading-relaxed space-y-1 text-foreground/90">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;

        if (/^#{1,3}\s/.test(line)) {
          const heading = line.replace(/^#{1,3}\s+/, "");
          return (
            <p
              key={i}
              className="font-semibold text-foreground text-[13px] pt-2 first:pt-0 border-t border-violet-100 dark:border-violet-900/30 mt-2 first:border-0 first:mt-0"
            >
              {renderInline(heading)}
            </p>
          );
        }

        if (/^[-•]\s/.test(line)) {
          const content = line.replace(/^[-•]\s+/, "");
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-violet-500 shrink-0 leading-relaxed">
                •
              </span>
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
  const [emailSearch, setEmailSearch] = useState("");
  const emailSearchRef = useRef<HTMLInputElement>(null);
  const [syncingEmailId, setSyncingEmailId] = useState<string | null>(null);

  // Fetch the inbox and auto-select the first email.
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

  // ── Effects ────────────────────────────────────────────────────────────────

  // Ctrl+K focuses the email search bar.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        emailSearchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Handle OAuth callback: exchange the `code` param for a token, then load the inbox.
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
      .catch(() =>
        toast({ variant: "destructive", title: "Kết nối thất bại" }),
      );
  }, [searchParams, token]);

  // Check connection status on mount and load the inbox if already connected.
  useEffect(() => {
    if (!token) return;
    getGmailStatus(token).then((status) => {
      setConnected(status);
      if (status) loadEmails();
    });
  }, [token]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Redirect to Google OAuth consent screen.
  const handleConnect = async () => {
    if (!token) return;
    try {
      const url = await getGmailAuthUrl(token);
      window.location.href = url;
    } catch {
      toast({ variant: "destructive", title: "Không thể lấy URL xác thực" });
    }
  };

  // Pull new emails from Gmail and refresh the list.
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

  // Sync a single email into the RAG pipeline, then mark it as synced locally.
  const handleSyncEmail = async (email: GmailEmail) => {
    if (!token) return;
    setSyncingEmailId(email.message_id);
    try {
      const result = await syncSingleEmail(token, email.message_id);
      if (result.already_synced) {
        toast({ title: "Email này đã được đồng bộ trước đó" });
      } else {
        toast({ variant: "success", title: "Đã đồng bộ email vào RAG" });
        setEmails((prev) =>
          prev.map((e) =>
            e.message_id === email.message_id ? { ...e, synced: true } : e,
          ),
        );
        if (selectedEmail?.message_id === email.message_id)
          setSelectedEmail({ ...email, synced: true });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSyncingEmailId(null);
    }
  };

  // Revoke the Gmail connection and clear all local state.
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

  // Stream an AI analysis of the selected email body via a temporary conversation.
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

  const unreadCount = emails.filter((e) =>
    e.label_ids.includes("UNREAD"),
  ).length;
  const syncedCount = emails.filter((e) => e.synced).length;
  const filteredEmails = emailSearch.trim()
    ? emails.filter((e) => {
        const q = emailSearch.toLowerCase();
        return (
          e.subject?.toLowerCase().includes(q) ||
          e.from?.toLowerCase().includes(q) ||
          e.snippet?.toLowerCase().includes(q)
        );
      })
    : emails;

  return (
    <div className="enterprise-page flex h-full min-h-0 flex-col">
      {/* ── Custom header ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {/* Title */}
          <div className="shrink-0">
            <h1 className="text-xl font-bold tracking-tight">Gmail</h1>
            <p className="text-[12px] text-muted-foreground leading-tight">
              Xem và đồng bộ email vào hệ thống RAG
            </p>
          </div>

          {/* Search bar — only when connected */}
          {connected && (
            <div className="relative min-w-0 max-w-3xl flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={emailSearchRef}
                value={emailSearch}
                onChange={(e) => setEmailSearch(e.target.value)}
                placeholder="Tìm kiếm email, người gửi, nội dung..."
                className="h-9 pl-9 pr-16"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded border border-border font-mono select-none pointer-events-none">
                Ctrl K
              </kbd>
            </div>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {connected && (
              <>
                {/* Bell */}
                <button className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
                  <Bell className="h-[18px] w-[18px] text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
                  )}
                </button>

                {/* Settings with synced badge */}
                <button className="relative h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
                  <Settings className="h-[18px] w-[18px] text-muted-foreground" />
                  {syncedCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] text-white font-bold px-1 leading-none">
                      {syncedCount}
                    </span>
                  )}
                </button>

                <div className="h-5 w-px bg-border mx-1" />

                {/* Sync */}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-9 text-[12.5px]"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
                  />
                  {syncing ? "Đang đồng bộ..." : "Đồng bộ"}
                </Button>

                {/* Disconnect */}
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-9 gap-1.5 text-[12.5px]"
                  onClick={handleDisconnect}
                >
                  Ngắt kết nối
                </Button>
              </>
            )}

            {!connected && (
              <Button size="sm" onClick={handleConnect} className="gap-2">
                <Link className="h-3.5 w-3.5" />
                Kết nối Gmail
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
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
                <span className="text-xs text-muted-foreground">
                  {emailSearch
                    ? `${filteredEmails.length} / ${emails.length}`
                    : `${emails.length}`}{" "}
                  email
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredEmails.map((email) => {
                  const isSelected =
                    selectedEmail?.message_id === email.message_id;
                  const isUnread = email.label_ids.includes("UNREAD");
                  const avatarStyle = getAvatarStyle(email.from);
                  return (
                    <button
                      key={email.message_id}
                      onClick={() => {
                        setSelectedEmail(email);
                        setAiText("");
                        setAiAnalyzedId(null);
                        if (email.label_ids.includes("UNREAD")) {
                          const updated = { ...email, label_ids: email.label_ids.filter((l) => l !== "UNREAD") };
                          setEmails((prev) => prev.map((e) => e.message_id === email.message_id ? updated : e));
                          setSelectedEmail(updated);
                        }
                      }}
                      className={`group w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border/40 transition-colors ${
                        isSelected
                        ? "bg-primary/10"
                          : "bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 select-none"
                        style={{
                          backgroundColor: avatarStyle.bg,
                          color: avatarStyle.text,
                        }}
                      >
                        {getInitial(email.from)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1 mb-0.5">
                          <span
                            className={`text-sm truncate leading-tight ${isUnread ? "font-bold text-foreground" : "font-normal text-foreground/80"}`}
                          >
                            {getSenderName(email.from)}
                          </span>
                          <span
                            className={`text-xs shrink-0 ${isUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                          >
                            {formatShortDate(email.date)}
                          </span>
                        </div>
                        <p
                          className={`text-xs truncate leading-tight mb-0.5 ${isUnread ? "font-semibold text-foreground" : "text-foreground/70"}`}
                        >
                          {email.subject || "(no subject)"}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-muted-foreground truncate flex-1">
                            {email.snippet}
                          </p>
                          {email.synced && (
                        <span className="shrink-0 rounded-md border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium leading-none text-success">
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
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedEmail.synced ? (
                        <span className="rounded-md border border-success/30 bg-success/10 px-2 py-1 text-[11px] font-medium text-success">
                          Đã đồng bộ RAG
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-9 text-xs"
                          onClick={() => handleSyncEmail(selectedEmail)}
                          disabled={syncingEmailId === selectedEmail.message_id}
                        >
                          {syncingEmailId === selectedEmail.message_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Đồng bộ thư này
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={handleAnalyze}
                        disabled={aiStreaming}
                        className="gap-2 h-9 text-xs bg-gray-800 hover:bg-gray-700 text-white"
                      >
                        {aiStreaming &&
                        aiAnalyzedId === selectedEmail.message_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        AI phân tích
                      </Button>
                    </div>
                  </div>

                  {/* Sender info */}
                  <div className="px-6 py-3 border-b border-border/50 shrink-0">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 select-none"
                        style={{
                          backgroundColor: getAvatarStyle(selectedEmail.from)
                            .bg,
                          color: getAvatarStyle(selectedEmail.from).text,
                        }}
                      >
                        {getInitial(selectedEmail.from)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-1">
                          <p className="text-sm font-semibold text-foreground leading-tight">
                            {getSenderName(selectedEmail.from)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            &lt;
                            {selectedEmail.from.match(/<(.+)>/)
                              ? selectedEmail.from.match(/<(.+)>/)![1]
                              : selectedEmail.from}
                            &gt;
                          </p>
                        </div>

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
                        {selectedEmail.body ||
                          selectedEmail.snippet ||
                          "(no content)"}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── AI Panel ── */}
                {aiOpen && (
                  <div className="w-[320px] shrink-0 border-l border-border flex flex-col overflow-hidden bg-background">
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-gradient-to-r from-violet-600/10 to-blue-600/10">
                      <div className="flex items-center gap-2 flex-1">
                        <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
                        <span className="text-sm font-semibold text-foreground">
                          Phân tích AI
                        </span>
                        {aiStreaming &&
                          aiAnalyzedId === selectedEmail.message_id && (
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

                    <div className="flex-1 overflow-y-auto p-4">
                      {!aiText && !aiStreaming ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                          <Sparkles className="h-8 w-8 opacity-30" />
                          <p className="text-xs text-center">
                            Nhấn <strong>AI phân tích</strong> để tóm tắt email
                            này
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
                              aiStreaming &&
                              aiAnalyzedId === selectedEmail.message_id
                            }
                          />
                        </div>
                      )}
                    </div>

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
