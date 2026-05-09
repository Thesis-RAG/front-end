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
import {
  fetchTraces,
  fetchJobs,
  retryJob,
  cancelJob,
  TraceRecord,
  JobRecord,
} from "@/services/audit.api";

// ── helpers ───────────────────────────────────────────────────────────────────
const truncateMiddle = (s: string, head = 6, tail = 4) =>
  s.length <= head + tail + 3 ? s : `${s.slice(0, head)}...${s.slice(-tail)}`;

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleString("vi-VN") : "—";

// ── page ─────────────────────────────────────────────────────────────────────
export default function AuditPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Kiểm toán"
        description="Xem lại lịch sử truy vấn và trạng thái công việc nền của hệ thống."
      />
      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="queries" className="h-full flex flex-col">
          <div className="border-b border-border px-6">
            <TabsList className="mt-2">
              <TabsTrigger className="text-[12px]" value="queries">
                Logs Truy vấn
              </TabsTrigger>
              <TabsTrigger className="text-[12px]" value="jobs">
                Giám sát Công việc
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="queries" className="flex-1 p-6 mt-0">
            <QueryLogsTab />
          </TabsContent>
          <TabsContent value="jobs" className="flex-1 p-6 mt-0">
            <JobsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Query Logs ────────────────────────────────────────────────────────────────
function QueryLogsTab() {
  const { token } = useAuth();
  const [traces, setTraces] = useState<TraceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTraces(token)
      .then(setTraces)
      .catch(() =>
        toast({ variant: "destructive", title: "Failed to load traces" }),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = traces.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      (t.user_input ?? "").toLowerCase().includes(q) ||
      (t.trace_id ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const copyTraceId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusConfig: Record<
    string,
    { icon: React.ReactNode; label: string; className: string }
  > = {
    completed: {
      icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      label: "Completed",
      className:
        "bg-green-100 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5 text-xs font-medium",
    },
    "no-permission": {
      icon: <ShieldX className="h-4 w-4 text-red-600" />,
      label: "No Permission",
      className:
        "bg-red-100 text-red-700 border border-red-200 rounded-full px-2.5 py-0.5 text-xs font-medium",
    },
    "no-answer": {
      icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
      label: "No Answer",
      className:
        "bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full px-2.5 py-0.5 text-xs font-medium",
    },
    blocked: {
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
      label: "Blocked",
      className:
        "bg-red-100 text-red-700 border border-red-200 rounded-full px-2.5 py-0.5 text-xs font-medium",
    },
  };

  const getLatency = (timings: any): string => {
    if (!timings) return "—";
    const total = timings.total_ms ?? timings.total ?? null;
    return total != null ? `${Math.round(total)}ms` : "—";
  };

  const getDocs = (sources: any[]): number => {
    if (!Array.isArray(sources)) return 0;
    return new Set(sources.map((s) => s.metadata?.document_id).filter(Boolean))
      .size;
  };

  const getCitations = (sources: any[]): number =>
    Array.isArray(sources) ? sources.length : 0;

  return (
    <div className="space-y-4">
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
              <TableHead className="font-bold text-black">Thời gian</TableHead>
              <TableHead className="font-bold text-black">
                ID Nhân viên
              </TableHead>
              <TableHead className="font-bold text-black w-[35%]">
                Query
              </TableHead>
              <TableHead className="font-bold text-black">Trạng thái</TableHead>
              <TableHead className="font-bold text-black">Tài liệu</TableHead>
              <TableHead className="font-bold text-black">Nguồn</TableHead>
              <TableHead className="font-bold text-black">Độ trễ</TableHead>
              <TableHead className="font-bold text-black">Trace ID</TableHead>
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
                          <TooltipContent>Copy trace ID</TooltipContent>
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

// ── Job Monitor ───────────────────────────────────────────────────────────────
function JobsTab() {
  const { token } = useAuth();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchJobs(token)
      .then(setJobs)
      .catch(() =>
        toast({ variant: "destructive", title: "Failed to load jobs" }),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRetry = async (jobId: string) => {
    try {
      await retryJob(jobId, token);
      toast({ variant: "success", title: "Job requeued" });
      load();
    } catch {
      toast({ variant: "destructive", title: "Retry failed" });
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      await cancelJob(jobId, token);
      toast({ variant: "success", title: "Job cancelled" });
      load();
    } catch {
      toast({ variant: "destructive", title: "Cancel failed" });
    }
  };

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

  const statusLabels: Record<string, string> = {
    queued: "Hàng đợi",
    running: "Đang chạy",
    succeeded: "Thành công",
    failed: "Thất bại",
  };

  const statColors: Record<string, { text: string; count: string }> = {
    queued: { text: "text-muted-foreground", count: "text-muted-foreground" },
    running: { text: "text-yellow-500", count: "text-yellow-600" },
    succeeded: { text: "text-green-600", count: "text-green-700" },
    failed: { text: "text-red-500", count: "text-red-700" },
  };

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

  const shortId = (id: string) =>
    id.length > 10 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id;

  const statuses = ["queued", "running", "succeeded", "failed"] as const;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {statuses.map((s) => {
          const c = statColors[s];

          return (
            <div
              key={s}
              className="rounded-lg border border-border bg-card p-4"
            >
              <p className={cn("text-sm font-medium", c.text)}>
                {statusLabels[s] || s}
              </p>

              <p className={cn("mt-1 text-2xl font-semibold", c.count)}>
                {jobs.filter((j) => j.status === s).length}
              </p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-black font-bold">Job ID</TableHead>
              <TableHead className="text-black font-bold">Loại</TableHead>
              <TableHead className="text-black font-bold w-[40%]">
                Tài liệu
              </TableHead>
              <TableHead className="text-black font-bold">Trạng thái</TableHead>
              <TableHead className="text-black font-bold">Lần thử</TableHead>
              <TableHead className="text-black font-bold">Bắt đầu</TableHead>
              <TableHead className="text-black font-bold">Kết thúc</TableHead>
              <TableHead className="text-black font-bold w-[8%]">
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
