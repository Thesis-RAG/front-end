import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  RefreshCw,
  Link,
  Unlink,
  Inbox,
  Reply,
  Forward,
  MoreHorizontal,
  Star,
  Archive,
  Trash2,
  Mail,
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

interface GmailEmail {
  message_id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  label_ids: string[];
  synced: boolean;
}

function isHtml(str: string) {
  return /<[a-z][\s\S]*>/i.test(str);
}

// Avatar background colors matching Gmail's palette (Google colors on white)
const AVATAR_COLORS = [
  { bg: "#1a73e8", text: "#fff" }, // Google Blue
  { bg: "#e52592", text: "#fff" }, // Pink
  { bg: "#e8710a", text: "#fff" }, // Orange
  { bg: "#137333", text: "#fff" }, // Green
  { bg: "#7b1fa2", text: "#fff" }, // Purple
  { bg: "#c5221f", text: "#fff" }, // Red
  { bg: "#0097a7", text: "#fff" }, // Teal
  { bg: "#f29900", text: "#fff" }, // Yellow
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

export default function GmailPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [connected, setConnected] = useState(false);
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<GmailEmail | null>(null);

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

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday)
        return d.toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
      const isThisYear = d.getFullYear() === now.getFullYear();
      if (isThisYear)
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
  };

  const formatShortDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday)
        return d.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
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
                variant="outline"
                size="sm"
                className="gap-2 h-8 text-xs bg-blue-900 text-white hover:bg-blue-800"
                onClick={handleSync}
                disabled={syncing}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? "Đang đồng bộ..." : "Đồng bộ email"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-8 text-xs bg-red-700 text-white hover:bg-red-900"
                onClick={handleDisconnect}
              >
                <Unlink className="h-3.5 w-3.5" />
                Ngắt kết nối
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="gap-2 h-8 text-xs"
              onClick={handleConnect}
            >
              <Link className="h-3.5 w-3.5" />
              Kết nối Gmail
            </Button>
          )
        }
      />

      <div className="flex-1 overflow-hidden">
        {!connected ? (
          /* ─── Not connected ─── */
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
          /* ─── Split panel ─── */
          <div className="flex h-full">
            {/* LEFT: Email list — Gmail-style */}
            <div className="w-[360px] shrink-0 border-r border-border flex flex-col overflow-hidden">
              {/* List header */}
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Hộp thư đến
                </span>
                <span className="text-xs text-muted-foreground">
                  {emails.length} email gần nhất
                </span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {emails.map((email) => {
                  const isSelected =
                    selectedEmail?.message_id === email.message_id;
                  const isUnread = email.label_ids.includes("UNREAD");
                  const avatarStyle = getAvatarStyle(email.from);

                  return (
                    <button
                      key={email.message_id}
                      onClick={() => setSelectedEmail(email)}
                      className={`
                        group w-full flex items-start gap-3 px-4 py-3 text-left
                        border-b border-border/40 transition-colors
                        ${isSelected ? "bg-[#c2dbff] dark:bg-blue-900/30" : isUnread ? "bg-background hover:bg-muted/50" : "bg-background/60 hover:bg-muted/50"}
                      `}
                    >
                      {/* Avatar */}
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
                        {/* Row 1: sender + date */}
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

                        {/* Row 2: subject */}
                        <p
                          className={`text-xs truncate leading-tight mb-0.5 ${isUnread ? "font-semibold text-foreground" : "text-foreground/70"}`}
                        >
                          {email.subject || "(no subject)"}
                        </p>

                        {/* Row 3: snippet + badge */}
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-muted-foreground truncate flex-1">
                            {email.snippet}
                          </p>
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

            {/* RIGHT: Email detail — Gmail-style */}
            {selectedEmail ? (
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* ── Subject bar ── */}
                <div className="px-6 pt-5 pb-3 border-b border-border">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-xl font-normal text-foreground leading-tight">
                      {selectedEmail.subject || "(no subject)"}
                    </h2>
                    {/* Action icons (decorative, matching Gmail toolbar) */}
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      <button
                        className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors"
                        title="Lưu trữ"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors"
                        title="Đánh dấu"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors"
                        title="Khác"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Sender info card ── */}
                <div className="px-6 py-3 border-b border-border/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 select-none"
                        style={{
                          backgroundColor: getAvatarStyle(selectedEmail.from)
                            .bg,
                          color: getAvatarStyle(selectedEmail.from).text,
                        }}
                      >
                        {getInitial(selectedEmail.from)}
                      </div>

                      <div className="min-w-0">
                        {/* Sender name */}
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {getSenderName(selectedEmail.from)}
                        </p>
                        {/* From address */}
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                          &lt;
                          {selectedEmail.from.match(/<(.+)>/)
                            ? selectedEmail.from.match(/<(.+)>/)![1]
                            : selectedEmail.from}
                          &gt;
                        </p>
                        {/* To */}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          đến {selectedEmail.to || "tôi"}
                        </p>
                      </div>
                    </div>

                    {/* Date + actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(selectedEmail.date)}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors"
                          title="Trả lời"
                        >
                          <Reply className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors"
                          title="Chuyển tiếp"
                        >
                          <Forward className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground transition-colors"
                          title="Khác"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-hidden px-6 py-4">
                  {isHtml(selectedEmail.body) ? (
                    <iframe
                      srcDoc={selectedEmail.body}
                      sandbox="allow-same-origin"
                      className="w-full h-full border-0 bg-white"
                      title="Email content"
                    />
                  ) : (
                    <div className="h-full overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                      {selectedEmail.body ||
                        selectedEmail.snippet ||
                        "(no content)"}
                    </div>
                  )}
                </div>

                {/* ── Reply bar (Gmail-style bottom) ── */}
                <div className="px-6 pb-5 pt-1 shrink-0">
                  <div className="flex items-center gap-2 border border-border rounded-full px-4 py-2 hover:shadow-sm transition-shadow cursor-pointer">
                    <Reply className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Trả lời...
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded">
                        <Reply className="h-3.5 w-3.5" />
                        Trả lời
                      </button>
                      <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded">
                        <Forward className="h-3.5 w-3.5" />
                        Chuyển tiếp
                      </button>
                    </span>
                  </div>
                </div>
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
