/** AuditPage: two-tab audit console for query-trace logs and background-job monitoring. */
import { useState, useEffect } from "react";
import {
  Search,
  Download,
  CheckCircle,
  AlertTriangle,
  ShieldX,
  Copy,
  Check,
  Clock,
  Loader2,
  XCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Timer,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import {
  fetchTraces,
  fetchJobs,
  retryJob,
  cancelJob,
  TraceRecord,
  JobRecord,
} from "@/services/audit.api";

// Truncate a long string to head...tail form for compact display.
const truncateMiddle = (s: string, head = 6, tail = 4) =>
  s.length <= head + tail + 3 ? s : `${s.slice(0, head)}...${s.slice(-tail)}`;

// Extract the total latency in milliseconds from a trace's timings object.
const getLatency = (timings: any): string => {
  if (!timings) return "—";
  const total = timings.total_ms ?? timings.total ?? null;
  return total != null ? `${Math.round(total)}ms` : "—";
};

// Count unique document IDs referenced in a retrieved-sources array.
const getDocs = (sources: any[]): number => {
  if (!Array.isArray(sources)) return 0;
  return new Set(sources.map((s) => s.metadata?.document_id).filter(Boolean))
    .size;
};

// Count total citation chunks in a retrieved-sources array.
const getCitations = (sources: any[]): number =>
  Array.isArray(sources) ? sources.length : 0;

// Shorten a UUID-like job ID to a compact head...tail representation.
const shortId = (id: string) =>
  id.length > 10 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;

// Render a job's document title with an optional version badge.
const formatDocLabel = (job: JobRecord) => {
  const title = job.doc_title ?? job.document_id ?? "";
  const ver = job.version_no != null ? job.version_no : null;
  return (
    <span className="text-[12.5px]">
      {title}
      {ver != null && (
        <code className="ml-1 text-muted-foreground font-mono font-bold">
          (v{ver})
        </code>
      )}
    </span>
  );
};

// Human-readable labels for job statuses.
const statusLabels: Record<string, string> = {
  queued: "Hàng đợi",
  running: "Đang chạy",
  succeeded: "Thành công",
  failed: "Thất bại",
};

// Color classes for job stat counters keyed by status.
const statColors: Record<string, { text: string; count: string }> = {
  queued: { text: "text-muted-foreground", count: "text-muted-foreground" },
  running: { text: "text-yellow-500", count: "text-yellow-600" },
  succeeded: { text: "text-green-600", count: "text-green-700" },
  failed: { text: "text-red-500", count: "text-red-700" },
};

// The four job status values used to render stat cards and filter the table.
const JOB_STATUSES = ["queued", "running", "succeeded", "failed"] as const;

// Thin shell: renders the page header and delegates content to QueryLogsTab and JobsTab.
export default function AuditPage() {
  return (
    <div className="enterprise-page flex h-full min-h-0 flex-col">
      <PageHeader
        title="Kiểm toán"
        description="Xem lại lịch sử truy vấn và trạng thái công việc nền của hệ thống."
      />
      <div className="page-scroll flex-1">
        <Tabs defaultValue="queries" className="h-full flex flex-col">
          <div className="border-b border-border px-4 sm:px-6">
            <TabsList className="mt-2">
              <TabsTrigger className="text-[12px]" value="queries">
                Logs Truy vấn
              </TabsTrigger>
              <TabsTrigger className="text-[12px]" value="jobs">
                Giám sát Công việc
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="queries" className="mt-0 flex-1 p-4 sm:p-6">
            <QueryLogsTab />
          </TabsContent>
          <TabsContent value="jobs" className="mt-0 flex-1 p-4 sm:p-6">
            <JobsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Tab displaying a filterable, searchable table of query traces.
function QueryLogsTab() {
  const { token } = useAuth();
  const [traces, setTraces] = useState<TraceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch all traces on mount.
  useEffect(() => {
    fetchTraces(token)
      .then(setTraces)
      .catch(() =>
        toast({ variant: "destructive", title: "Failed to load traces" }),
      )
      .finally(() => setLoading(false));
  }, []);

  // Traces matching the current search query and status filter.
  const filtered = traces.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      (t.user_input ?? "").toLowerCase().includes(q) ||
      (t.trace_id ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Icon + label + className lookup for each trace status value.
  const statusConfig: Record<
    string,
    { icon: React.ReactNode; label: string; className: string }
  > = {
    completed: {
      icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      label: "Hoàn thành",
      className:
        "bg-green-100 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5 text-xs font-medium",
    },
    "no-permission": {
      icon: <ShieldX className="h-4 w-4 text-red-600" />,
      label: "Không có quyền",
      className:
        "bg-red-100 text-red-700 border border-red-200 rounded-full px-2.5 py-0.5 text-xs font-medium",
    },
    "no-answer": {
      icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
      label: "Không có kết quả",
      className:
        "bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full px-2.5 py-0.5 text-xs font-medium",
    },
    blocked: {
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
      label: "Bị chặn",
      className:
        "bg-red-100 text-red-700 border border-red-200 rounded-full px-2.5 py-0.5 text-xs font-medium",
    },
  };

  // Copy a trace ID to the clipboard and show a temporary checkmark for 2 s.
  const copyTraceId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Compute stats from all traces (not just filtered)
  const total = traces.length;
  const completedCount = traces.filter((t) => t.status === "completed").length;
  const runningCount = traces.filter((t) => t.status === "running").length;
  const errorCount = traces.filter((t) =>
    ["blocked", "no-answer", "no-permission"].includes(t.status),
  ).length;

  // % change vs last week
  const now = Date.now();
  const oneWeek = 7 * 24 * 3600 * 1000;
  const thisWeek = traces.filter(
    (t) => now - new Date(t.created_at).getTime() < oneWeek,
  ).length;
  const lastWeek = traces.filter((t) => {
    const age = now - new Date(t.created_at).getTime();
    return age >= oneWeek && age < 2 * oneWeek;
  }).length;
  const weekChange =
    lastWeek === 0 ? null : ((thisWeek - lastWeek) / lastWeek) * 100;

  const pct = (n: number) =>
    total === 0 ? "0%" : `${((n / total) * 100).toFixed(1)}%`;

  // Average latency — only traces that have timings data
  const tracesWithLatency = traces.filter(
    (t) => t.timings && (t.timings.total_ms ?? t.timings.total) != null,
  );
  const avgLatencyMs =
    tracesWithLatency.length === 0
      ? null
      : tracesWithLatency.reduce(
          (sum, t) => sum + (t.timings.total_ms ?? t.timings.total ?? 0),
          0,
        ) / tracesWithLatency.length;
  const avgLatencyLabel =
    avgLatencyMs === null
      ? "—"
      : avgLatencyMs >= 1000
        ? `${(avgLatencyMs / 1000).toFixed(2)}s`
        : `${Math.round(avgLatencyMs)}ms`;

  return (
    <div className="space-y-4">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-5 gap-4">
        {/* Total */}
        <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-info/10">
            <Activity className="h-5 w-5 text-info" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-muted-foreground font-medium">Tổng truy vấn</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {total.toLocaleString("vi-VN")}
            </p>
            {weekChange !== null ? (
              <p className={`mt-1 flex items-center gap-0.5 text-[11px] font-medium ${weekChange >= 0 ? "text-success" : "text-destructive"}`}>
                {weekChange >= 0
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                {Math.abs(weekChange).toFixed(1)}% so với tuần trước
              </p>
            ) : (
              <p className="text-[11px] mt-1 text-muted-foreground">Tuần này</p>
            )}
          </div>
        </div>

        {/* Completed */}
        <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-success/10">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-muted-foreground font-medium">Hoàn thành</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {completedCount.toLocaleString("vi-VN")}
            </p>
            <p className="mt-1 text-[11px] font-medium text-success">{pct(completedCount)}</p>
          </div>
        </div>

        {/* Running */}
        <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <RefreshCw className="h-5 w-5 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-muted-foreground font-medium">Đang chạy</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {runningCount.toLocaleString("vi-VN")}
            </p>
            <p className="mt-1 text-[11px] font-medium text-warning">{pct(runningCount)}</p>
          </div>
        </div>

        {/* Error */}
        <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-muted-foreground font-medium">Lỗi / Bị chặn</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {errorCount.toLocaleString("vi-VN")}
            </p>
            <p className="mt-1 text-[11px] font-medium text-destructive">{pct(errorCount)}</p>
          </div>
        </div>

        {/* Avg latency */}
        <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Timer className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-muted-foreground font-medium">Độ trễ TB</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{avgLatencyLabel}</p>
            <p className="text-[11px] mt-1 text-muted-foreground">
              {tracesWithLatency.length > 0
                ? `trên ${tracesWithLatency.length.toLocaleString("vi-VN")} truy vấn`
                : "Chưa có dữ liệu"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm truy vấn, ID trace..."
            className="pl-10 placeholder:text-[12.5px]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 text-[12.5px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem className="text-[12.5px]" value="all">
              Tất cả trạng thái
            </SelectItem>
            <SelectItem className="text-[12.5px]" value="completed">
              Hoàn thành
            </SelectItem>
            <SelectItem className="text-[12.5px]" value="running">
              Đang chạy
            </SelectItem>
            <SelectItem className="text-[12.5px]" value="no-answer">
              Không trả lời
            </SelectItem>
            <SelectItem className="text-[12.5px]" value="no-permission">
              Không có quyền
            </SelectItem>
            <SelectItem className="text-[12.5px]" value="blocked">
              Bị chặn
            </SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2 text-[12.5px]">
          <Download className="h-4 w-4" /> Xuất
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold text-foreground">Thời gian</TableHead>
              <TableHead className="font-bold text-foreground">
                ID Nhân viên
              </TableHead>
              <TableHead className="font-bold text-foreground w-[35%]">
                Query
              </TableHead>
              <TableHead className="font-bold text-foreground">Trạng thái</TableHead>
              <TableHead className="font-bold text-foreground text-center">Tài liệu</TableHead>
              <TableHead className="font-bold text-foreground text-center">Nguồn</TableHead>
              <TableHead className="font-bold text-foreground text-center">Độ trễ</TableHead>
              <TableHead className="font-bold text-foreground">Trace ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-muted-foreground"
                >
                  Không tìm thấy truy vấn nào
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => {
                const sc = statusConfig[t.status] ?? {
                  icon: null,
                  label: t.status,
                  className:
                    "bg-gray-100 text-gray-700 border border-gray-200 rounded-full px-2.5 py-0.5 text-xs font-medium",
                };
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-[11.5px] text-muted-foreground whitespace-nowrap">
                      {formatDate(t.created_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {truncateMiddle(t.user_id ?? "", 8, 4)}
                    </TableCell>
                    <TableCell
                      className="max-w-[300px] truncate text-[12.5px]"
                      title={t.user_input ?? ""}
                    >
                      {t.user_input ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5",
                          sc.className,
                        )}
                      >
                        {sc.icon}
                        <span>{sc.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-[12.5px] font-normal">
                      {getDocs(t.retrieved_sources)}
                    </TableCell>
                    <TableCell className="text-center text-[12.5px] font-normal">
                      {getCitations(t.retrieved_sources)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground text-[12.5px]">
                      {getLatency(t.timings)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {(t.trace_id ?? "").slice(0, 12)}...
                        </code>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyTraceId(t.trace_id)}
                            >
                              {copiedId === t.trace_id ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-white">
                            Copy trace ID
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Tab displaying job stat counters and a full job table with retry/cancel actions.
function JobsTab() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all jobs and refresh the list.
  const load = () => {
    setLoading(true);
    fetchJobs(token)
      .then(setJobs)
      .catch(() =>
        toast({ variant: "destructive", title: "Failed to load jobs" }),
      )
      .finally(() => setLoading(false));
  };

  // Load jobs on mount.
  useEffect(() => {
    load();
  }, []);

  // Icon + label + className lookup for each job status value.
  const statusConfig: Record<
    string,
    { className: string; label: string; icon: React.ReactNode }
  > = {
    queued: {
      icon: <Clock className="h-3 w-3" />,
      className:
        "bg-muted text-muted-foreground border border-border hover:bg-muted",
      label: "Hàng đợi",
    },
    running: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className:
        "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/15",
      label: "Đang chạy",
    },
    succeeded: {
      icon: <CheckCircle className="h-3 w-3" />,
      className:
        "bg-green-100 text-green-700 border border-green-200 hover:bg-green-100",
      label: "Thành công",
    },
    failed: {
      icon: <XCircle className="h-3 w-3" />,
      className:
        "bg-red-100 text-red-700 border border-red-200 hover:bg-red-100",
      label: "Thất bại",
    },
  };

  // Re-enqueue a failed job.
  const handleRetry = async (jobId: string) => {
    try {
      await retryJob(jobId, token);
      toast({ variant: "success", title: "Job requeued" });
      load();
    } catch {
      toast({ variant: "destructive", title: "Retry failed" });
    }
  };

  // Cancel a running job.
  const handleCancel = async (jobId: string) => {
    try {
      await cancelJob(jobId, token);
      toast({ variant: "success", title: "Job cancelled" });
      load();
    } catch {
      toast({ variant: "destructive", title: "Cancel failed" });
    }
  };

  const jobTotal = jobs.length;
  const jobCounts = {
    queued:    jobs.filter((j) => j.status === "queued").length,
    running:   jobs.filter((j) => j.status === "running").length,
    succeeded: jobs.filter((j) => j.status === "succeeded").length,
    failed:    jobs.filter((j) => j.status === "failed").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {/* Queued */}
        <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-muted-foreground font-medium">Hàng đợi</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{jobCounts.queued}</p>
            <p className="text-[11px] mt-1 text-muted-foreground">
              {jobTotal === 0 ? "0%" : `${((jobCounts.queued / jobTotal) * 100).toFixed(1)}%`}
            </p>
          </div>
        </div>

        {/* Running */}
        <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <Loader2 className="h-5 w-5 animate-spin text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-muted-foreground font-medium">Đang chạy</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{jobCounts.running}</p>
            <p className="mt-1 text-[11px] font-medium text-warning">
              {jobTotal === 0 ? "0%" : `${((jobCounts.running / jobTotal) * 100).toFixed(1)}%`}
            </p>
          </div>
        </div>

        {/* Succeeded */}
        <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-success/10">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-muted-foreground font-medium">Thành công</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{jobCounts.succeeded}</p>
            <p className="mt-1 text-[11px] font-medium text-success">
              {jobTotal === 0 ? "0%" : `${((jobCounts.succeeded / jobTotal) * 100).toFixed(1)}%`}
            </p>
          </div>
        </div>

        {/* Failed */}
        <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <XCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] text-muted-foreground font-medium">Thất bại</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{jobCounts.failed}</p>
            <p className="mt-1 text-[11px] font-medium text-destructive">
              {jobTotal === 0 ? "0%" : `${((jobCounts.failed / jobTotal) * 100).toFixed(1)}%`}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-foreground font-bold">Job ID</TableHead>
              <TableHead className="text-foreground font-bold">Loại</TableHead>
              <TableHead className="text-foreground font-bold w-[40%]">
                Tài liệu
              </TableHead>
              <TableHead className="text-foreground font-bold">Trạng thái</TableHead>
              <TableHead className="text-foreground font-bold">Lần thử</TableHead>
              <TableHead className="text-foreground font-bold">Bắt đầu</TableHead>
              <TableHead className="text-foreground font-bold">Kết thúc</TableHead>
              <TableHead className="text-foreground font-bold w-[8%]">
                Hành động
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-muted-foreground"
                >
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-muted-foreground"
                >
                  Không tìm thấy công việc nào
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => {
                const sc = statusConfig[job.status] ?? {
                  icon: null,
                  className:
                    "bg-muted text-muted-foreground border border-border hover:bg-muted",
                  label: job.status,
                };
                return (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {shortId(job.id)}
                          </code>
                        </TooltipTrigger>
                        <TooltipContent>{job.id}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="font-normal capitalize"
                      >
                        {job.job_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-sm">{formatDocLabel(job)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {job.doc_title ?? job.document_id ?? "—"}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "font-normal inline-flex items-center gap-1",
                          sc.className,
                        )}
                      >
                        {sc.icon}
                        {sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-[12px]">
                      {job.retry_count}
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">
                      {formatDate(job.started_at ?? job.created_at)}
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">
                      {formatDate(job.finished_at)}
                    </TableCell>
                    <TableCell>
                      {job.status === "running" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancel(job.id)}
                        >
                          Hủy
                        </Button>
                      )}
                      {job.status === "failed" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(job.id)}
                            >
                              Thử lại
                            </Button>
                          </TooltipTrigger>
                          {job.error_message && (
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">{job.error_message}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
