import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, FileText, Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SensitivityLevelBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchPendingApprovals,
  approveDocument,
  rejectDocument,
  updateDocument,
  openDocumentFile,
} from "@/services/documents.api";
import {
  fetchOrgUnits,
  fetchOrgUnitInstances,
  OrgUnit,
  OrgUnitInstance,
} from "@/services/org_units.api";
import { SENSITIVITY_LEVEL, SENSITIVITY_COLOR } from "@/types";

interface DocRecord {
  id: string;
  title: string;
  status: string;
  sensitivity: number;
  oui_ids: string[];
  owner_user_id: string;
  version_count: number;
  created_at: string;
  updated_at: string;
  current_version_id?: string;
}

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ApprovalsPage() {
  const { token } = useAuth();
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [ouis, setOuis] = useState<OrgUnitInstance[]>([]);
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DocRecord | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [approveSensitivity, setApproveSensitivity] = useState<number | null>(
    null,
  );

  const load = () => {
    setLoading(true);
    fetchPendingApprovals(token)
      .then(setDocs)
      .catch(() =>
        toast({ variant: "destructive", title: "Failed to load approvals" }),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    fetchOrgUnits(token)
      .then(setOrgUnits)
      .catch(() => {});
    fetchOrgUnitInstances(token)
      .then(setOuis)
      .catch(() => {});
  }, []);

  const pendingReview = docs.filter((d) => d.status === "review");
  const pendingUploaded = docs.filter((d) => d.status === "uploaded");

  const handleAction = (doc: DocRecord, type: "approve" | "reject") => {
    setSelected(doc);
    setActionType(type);
    setComment("");
    setApproveSensitivity(doc.sensitivity);
  };

  const handleView = async (doc: DocRecord) => {
    if (!doc.current_version_id) {
      toast({ variant: "destructive", title: "Chưa có file" });
      return;
    }
    try {
      await openDocumentFile(doc.id, doc.current_version_id, token);
    } catch {
      toast({ variant: "destructive", title: "Không thể mở tài liệu" });
    }
  };

  const confirmAction = async () => {
    if (!selected || !actionType) return;
    setSubmitting(true);
    try {
      if (actionType === "approve") {
        if (approveSensitivity && approveSensitivity !== selected.sensitivity) {
          await updateDocument(
            selected.id,
            { sensitivity: approveSensitivity },
            token,
          );
        }
        await approveDocument(selected.id, token);
        toast({ variant: "success", title: "Đã xét duyệt tài liệu" });
      } else {
        await rejectDocument(selected.id, comment, token);
        toast({ variant: "success", title: "Đã từ chối tài liệu" });
      }
      setSelected(null);
      setActionType(null);
      load();
    } catch {
      toast({ variant: "destructive", title: `Failed to ${actionType}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Phê duyệt"
        description="Xét duyệt tài liệu và phiên bản mới"
      />
      <div className="flex-1 overflow-auto p-6">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Đang chờ xét duyệt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {pendingReview.length}
                </span>
                <Clock className="h-5 w-5 text-status-review" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Đã tải lên (Đang chờ xử lý)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {pendingUploaded.length}
                </span>
                <FileText className="h-5 w-5 text-status-draft" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tổng số chờ xử lý
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{docs.length}</span>
                <CheckCircle className="h-5 w-5 text-status-approved" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="review" className="space-y-4">
          <TabsList>
            <TabsTrigger value="review" className="gap-2 text-[12.5px]">
              Đang chờ xét duyệt
              {pendingReview.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-blue-500 text-white"
                >
                  {pendingReview.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="uploaded" className="gap-2 text-[12.5px]">
              Đã tải lên
              {pendingUploaded.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 w-5 rounded-full p-0 text-xs"
                >
                  {pendingUploaded.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : pendingReview.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="Không có tài liệu nào đang chờ xử lý"
                description="Tất cả các tài liệu đã được xem xét."
              />
            ) : (
              pendingReview.map((doc) => (
                <ApprovalCard
                  key={doc.id}
                  doc={doc}
                  orgUnits={orgUnits}
                  ouis={ouis}
                  onApprove={() => handleAction(doc, "approve")}
                  onReject={() => handleAction(doc, "reject")}
                  onView={() => handleView(doc)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="uploaded" className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : pendingUploaded.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Không có tài liệu nào đang chờ xử lý"
                description="Không có tài liệu nào đang chờ xét duyệt"
              />
            ) : (
              pendingUploaded.map((doc) => (
                <ApprovalCard
                  key={doc.id}
                  doc={doc}
                  orgUnits={orgUnits}
                  ouis={ouis}
                  onApprove={() => handleAction(doc, "approve")}
                  onReject={() => handleAction(doc, "reject")}
                  onView={() => handleView(doc)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[20px]">
              {actionType === "approve"
                ? "Xét duyệt tài liệu"
                : "Từ chối tài liệu"}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {actionType === "approve"
                ? "Bạn có chắc muốn xét duyệt tài liệu này không? Bạn có thể thêm ghi chú."
                : "Vui lòng cung cấp lý do từ chối."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex">
              <p className="mb-1 text-[13px] font-medium mr-2">Tài liệu:</p>
              <Badge
                variant="secondary"
                className="text-[12px] text-muted-foreground items-center flex gap-1"
              >
                <div className="mr-1">{selected?.title}</div>
                <code className="ml-1text-sm text-muted-foreground">
                  • v{selected?.version_count}
                </code>
              </Badge>
            </div>

            {actionType === "approve" && (
              <div className="mt-3">
                <label className="text-[13px] font-medium">Độ nhạy cảm</label>
                <Select
                  value={String(approveSensitivity)}
                  onValueChange={(v) => setApproveSensitivity(Number(v))}
                >
                  <SelectTrigger className="mt-2 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SENSITIVITY_LEVEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="mt-4">
              <label className="text-[13px] font-medium">
                {actionType === "reject"
                  ? "Lý do (yêu cầu)"
                  : "Ghi chú (tùy chọn)"}
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  actionType === "reject"
                    ? "Giải thích lý do..."
                    : "Thêm ghi chú..."
                }
                className="mt-2 text-[12px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Hủy
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={confirmAction}
              disabled={
                submitting || (actionType === "reject" && !comment.trim())
              }
            >
              {submitting
                ? "Processing..."
                : actionType === "approve"
                  ? "Xét duyệt"
                  : "Từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalCard({
  doc,
  orgUnits,
  ouis,
  onApprove,
  onReject,
  onView,
}: {
  doc: DocRecord;
  orgUnits: OrgUnit[];
  ouis: OrgUnitInstance[];
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}) {
  const getOuiLabel = (ouiId: string) => {
    const oui = ouis.find((o) => o.id === ouiId);
    const ou = orgUnits.find((u) => u.id === oui?.ou_id);
    return oui ? `${ou?.name ?? ""} / ${oui.name}` : ouiId.slice(0, 8);
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-[15px]">{doc.title}</span>
              {/* ← thay SensitivityLevelBadge bằng: */}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${SENSITIVITY_COLOR[doc.sensitivity] ?? "bg-gray-100 text-gray-700"}`}
              >
                {SENSITIVITY_LEVEL[doc.sensitivity] ?? doc.sensitivity}
              </span>
            </div>
            <div className="flex flex-row items-center gap-4 my-2">
              <div className="text-[12px]">Đơn vị:</div>
              {doc.oui_ids.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {doc.oui_ids.map((id) => (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="text-[11px] font-normal"
                    >
                      {getOuiLabel(id)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground mb-2">
              <span className="text-[12px] font-semibold">
                Phiên bản:{" "}
                <code className="rounded bg-muted px-1">
                  v{doc.version_count}
                </code>
              </span>
              <span>·</span>
              <span className="text-[12px] font-semibold">Cập nhật cuối:</span>
              <span className="text-[11.5px]">
                {formatDate(doc.updated_at)}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-mono">
              ID: {doc.id.slice(0, 30)}...
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onView}
              className="text-xs bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800"
            >
              <Eye className="mr-1.5 h-4 w-4" /> Xem tài liệu
            </Button>
            <Button size="sm" onClick={onApprove} className="text-xs">
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Xét duyệt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="text-xs hover:bg-gray-100 hover:text-black"
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Từ chối
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <Icon className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
