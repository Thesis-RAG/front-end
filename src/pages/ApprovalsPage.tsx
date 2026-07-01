import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, FileText, Eye, Lock, ShieldCheck, ShieldX, Ban, Infinity } from "lucide-react";
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
  fetchAllAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  revokeAccessRequest,
  AccessRequestRead,
} from "@/services/documents.api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  // Access request state
  const [accessRequests, setAccessRequests] = useState<AccessRequestRead[]>([]);
  const [loadingAR, setLoadingAR] = useState(false);
  const [selectedAR, setSelectedAR] = useState<AccessRequestRead | null>(null);
  const [arAction, setArAction] = useState<"approve" | "reject" | null>(null);
  const [arNote, setArNote] = useState("");
  const [arExpiry, setArExpiry] = useState("");
  const [submittingAR, setSubmittingAR] = useState(false);

  const load = () => {
    setLoading(true);
    fetchPendingApprovals(token)
      .then(setDocs)
      .catch(() =>
        toast({ variant: "destructive", title: "Failed to load approvals" }),
      )
      .finally(() => setLoading(false));
  };

  const loadAccessRequests = () => {
    setLoadingAR(true);
    fetchAllAccessRequests(token)
      .then(setAccessRequests)
      .catch(() => toast({ variant: "destructive", title: "Không thể tải yêu cầu truy cập" }))
      .finally(() => setLoadingAR(false));
  };

  useEffect(() => {
    load();
    loadAccessRequests();
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

  const [revokingARId, setRevokingARId] = useState<string | null>(null);

  const handleRevokeAR = async (req: AccessRequestRead) => {
    if (!confirm(`Thu hồi quyền truy cập tài liệu "${req.document_title}" của ${req.requester_name}?`)) return;
    setRevokingARId(req.id);
    try {
      await revokeAccessRequest(req.id, token);
      toast({ variant: "success", title: "Đã thu hồi quyền truy cập" });
      loadAccessRequests();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Không thể thu hồi", description: err?.message });
    } finally {
      setRevokingARId(null);
    }
  };

  const approvedAR = accessRequests.filter(
    (r) => r.status === "approved" && (r.expires_at === null || new Date(r.expires_at) > new Date()),
  );

  const confirmARAction = async () => {
    if (!selectedAR || !arAction) return;
    setSubmittingAR(true);
    try {
      if (arAction === "approve") {
        await approveAccessRequest(selectedAR.id, token, {
          admin_note: arNote || undefined,
          expires_at: arExpiry ? new Date(arExpiry).toISOString() : undefined,
        });
        toast({ variant: "success", title: "Đã phê duyệt yêu cầu truy cập" });
      } else {
        await rejectAccessRequest(selectedAR.id, token, arNote || undefined);
        toast({ variant: "success", title: "Đã từ chối yêu cầu truy cập" });
      }
      setSelectedAR(null);
      setArAction(null);
      loadAccessRequests();
    } catch {
      toast({ variant: "destructive", title: "Thao tác thất bại" });
    } finally {
      setSubmittingAR(false);
    }
  };

  const pendingAR = accessRequests.filter((r) => r.status === "pending");

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
            <TabsTrigger value="access-requests" className="gap-2 text-[12.5px]">
              Yêu cầu truy cập
              {pendingAR.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-amber-500 text-white"
                >
                  {pendingAR.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="granted" className="gap-2 text-[12.5px]">
              Đã cấp quyền
              {approvedAR.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-green-500 text-white"
                >
                  {approvedAR.length}
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

          <TabsContent value="access-requests" className="space-y-4">
            {loadingAR ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : accessRequests.length === 0 ? (
              <EmptyState
                icon={Lock}
                title="Không có yêu cầu truy cập nào"
                description="Chưa có người dùng nào gửi yêu cầu xem tài liệu."
              />
            ) : (
              accessRequests.map((req) => (
                <AccessRequestCard
                  key={req.id}
                  req={req}
                  onApprove={() => { setSelectedAR(req); setArAction("approve"); setArNote(""); setArExpiry(""); }}
                  onReject={() => { setSelectedAR(req); setArAction("reject"); setArNote(""); setArExpiry(""); }}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="granted" className="space-y-4">
            {loadingAR ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : approvedAR.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="Chưa có quyền truy cập nào được cấp"
                description="Các yêu cầu được phê duyệt sẽ xuất hiện ở đây."
              />
            ) : (
              approvedAR.map((req) => (
                <GrantedAccessCard
                  key={req.id}
                  req={req}
                  onRevoke={() => handleRevokeAR(req)}
                  revoking={revokingARId === req.id}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Access Request Action Dialog */}
      <Dialog open={!!selectedAR} onOpenChange={() => setSelectedAR(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[20px]">
              {arAction === "approve" ? "Phê duyệt yêu cầu truy cập" : "Từ chối yêu cầu truy cập"}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              Tài liệu: <strong>{selectedAR?.document_title ?? selectedAR?.document_id}</strong>
              {" · "}Người yêu cầu: <strong>{selectedAR?.requester_name ?? selectedAR?.user_id}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {arAction === "approve" && (
              <div>
                <Label className="text-[13px]">Thời hạn truy cập (tùy chọn)</Label>
                <Input
                  type="datetime-local"
                  value={arExpiry}
                  onChange={(e) => setArExpiry(e.target.value)}
                  className="mt-2 text-[12px]"
                  placeholder="Để trống = không giới hạn thời gian"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Để trống nếu không muốn giới hạn thời gian</p>
              </div>
            )}
            <div>
              <Label className="text-[13px]">
                {arAction === "reject" ? "Lý do từ chối (tùy chọn)" : "Ghi chú (tùy chọn)"}
              </Label>
              <Textarea
                value={arNote}
                onChange={(e) => setArNote(e.target.value)}
                placeholder={arAction === "reject" ? "Giải thích lý do..." : "Thêm ghi chú..."}
                className="mt-2 text-[12px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAR(null)}>Hủy</Button>
            <Button
              variant={arAction === "approve" ? "default" : "destructive"}
              onClick={confirmARAction}
              disabled={submittingAR}
            >
              {submittingAR ? "Đang xử lý..." : arAction === "approve" ? "Phê duyệt" : "Từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

function AccessRequestCard({
  req,
  onApprove,
  onReject,
}: {
  req: AccessRequestRead;
  onApprove: () => void;
  onReject: () => void;
}) {
  const statusIcon = {
    pending: <Clock className="h-4 w-4 text-amber-500" />,
    approved: <ShieldCheck className="h-4 w-4 text-green-600" />,
    rejected: <ShieldX className="h-4 w-4 text-destructive" />,
  }[req.status];

  const statusLabel = {
    pending: "Đang chờ",
    approved: "Đã phê duyệt",
    rejected: "Đã từ chối",
  }[req.status];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-[15px]">{req.document_title ?? req.document_id}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {statusIcon} {statusLabel}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">
              Người yêu cầu: <span className="font-medium">{req.requester_name ?? req.user_id}</span>
              {" · "}Gửi lúc: {formatDate(req.created_at)}
            </div>
            {req.expires_at && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                Hạn truy cập: {formatDate(req.expires_at)}
              </div>
            )}
            {req.admin_note && (
              <div className="mt-1 text-[11px] text-muted-foreground italic">
                Ghi chú: {req.admin_note}
              </div>
            )}
          </div>
          {req.status === "pending" && (
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={onApprove} className="text-xs">
                <ShieldCheck className="mr-1.5 h-4 w-4" /> Phê duyệt
              </Button>
              <Button variant="outline" size="sm" onClick={onReject} className="text-xs hover:bg-gray-100 hover:text-black">
                <XCircle className="mr-1.5 h-4 w-4" /> Từ chối
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GrantedAccessCard({
  req,
  onRevoke,
  revoking,
}: {
  req: AccessRequestRead;
  onRevoke: () => void;
  revoking: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[15px] truncate">{req.document_title ?? req.document_id}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {req.requester_name ?? req.user_id}
              {req.admin_note ? ` · ${req.admin_note}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <ARCountdown expiresAt={req.expires_at} />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            disabled={revoking}
            onClick={onRevoke}
          >
            <Ban className="mr-1.5 h-3.5 w-3.5" />
            {revoking ? "Đang thu hồi..." : "Thu hồi quyền"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ARCountdown({ expiresAt }: { expiresAt: string | null }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) return <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium"><Infinity className="h-3.5 w-3.5" /> Vĩnh viễn</span>;
  if (remaining === null) return null;
  if (remaining === 0) return <span className="text-destructive text-sm font-medium">Đã hết hạn</span>;

  const s = Math.floor(remaining / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}n`);
  if (h > 0) parts.push(`${h}g`);
  if (m > 0) parts.push(`${m}p`);
  parts.push(`${String(sec).padStart(2, "0")}s`);
  const color = s < 3600 ? "text-destructive" : s < 86400 ? "text-amber-500" : "text-foreground";
  return <span className={`font-mono text-sm font-semibold tabular-nums ${color}`}>{parts.join(" ")}</span>;
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
