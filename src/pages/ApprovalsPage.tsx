/** ApprovalsPage: admin page for reviewing pending documents and managing document access requests. */
import { useState, useEffect } from "react";
import { CheckCircle, Clock, FileText, Lock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchOrgUnits,
  fetchOrgUnitInstances,
  OrgUnit,
  OrgUnitInstance,
} from "@/services/org_units.api";
import { SENSITIVITY_LEVEL } from "@/types";
import { DocRecord, ApprovalCard } from "@/components/approvals/ApprovalCard";
import { AccessRequestCard } from "@/components/approvals/AccessRequestCard";
import { GrantedAccessCard } from "@/components/approvals/GrantedAccessCard";

// Main page component: tab-based view for pending documents, access requests, and granted-access management.
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
  const [revokingARId, setRevokingARId] = useState<string | null>(null);

  // Fetch pending document approvals and refresh the list.
  const load = () => {
    setLoading(true);
    fetchPendingApprovals(token)
      .then(setDocs)
      .catch(() =>
        toast({ variant: "destructive", title: "Failed to load approvals" }),
      )
      .finally(() => setLoading(false));
  };

  // Fetch all access requests and refresh the access-request list.
  const loadAccessRequests = () => {
    setLoadingAR(true);
    fetchAllAccessRequests(token)
      .then(setAccessRequests)
      .catch(() => toast({ variant: "destructive", title: "Không thể tải yêu cầu truy cập" }))
      .finally(() => setLoadingAR(false));
  };

  // Load documents and access requests on mount.
  useEffect(() => {
    load();
    loadAccessRequests();
  }, []);

  // Load org units and OUI instances for label resolution in approval cards.
  useEffect(() => {
    fetchOrgUnits(token)
      .then(setOrgUnits)
      .catch(() => {});
    fetchOrgUnitInstances(token)
      .then(setOuis)
      .catch(() => {});
  }, []);

  // Derived subsets recomputed on each render.
  const pendingReview = docs.filter((d) => d.status === "review");
  const pendingUploaded = docs.filter((d) => d.status === "uploaded");
  const approvedAR = accessRequests.filter(
    (r) => r.status === "approved" && (r.expires_at === null || new Date(r.expires_at) > new Date()),
  );
  const pendingAR = accessRequests.filter((r) => r.status === "pending");

  // Open the approve/reject confirmation dialog for a document.
  const handleAction = (doc: DocRecord, type: "approve" | "reject") => {
    setSelected(doc);
    setActionType(type);
    setComment("");
    setApproveSensitivity(doc.sensitivity);
  };

  // Open the document file in a new tab via a pre-signed URL.
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

  // Submit the approve or reject action for the selected document.
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

  // Revoke an approved access grant after a browser confirmation prompt.
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

  // Submit the approve or reject action for the selected access request.
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

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Phê duyệt"
        description="Xét duyệt tài liệu và phiên bản mới"
      />

      <Tabs defaultValue="review" className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar — top */}
        <div className="border-b border-border px-6 shrink-0">
          <TabsList className="mt-2">
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 px-6 pt-4 pb-0 shrink-0">
          {[
            {
              label: "Chờ xét duyệt",
              value: pendingReview.length,
              icon: Clock,
              bg: "bg-orange-50 dark:bg-orange-950/40",
              iconCls: "text-orange-500",
            },
            {
              label: "Đã tải lên (chờ xử lý)",
              value: pendingUploaded.length,
              icon: FileText,
              bg: "bg-yellow-50 dark:bg-yellow-950/40",
              iconCls: "text-yellow-600",
            },
            {
              label: "Yêu cầu truy cập",
              value: pendingAR.length,
              icon: Lock,
              bg: "bg-blue-50 dark:bg-blue-950/40",
              iconCls: "text-blue-600",
            },
            {
              label: "Tổng chờ xử lý",
              value: docs.length,
              icon: CheckCircle,
              bg: "bg-green-50 dark:bg-green-950/40",
              iconCls: "text-green-600",
            },
          ].map(({ label, value, icon: Icon, bg, iconCls }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-5 flex items-start gap-4 shadow-sm">
              <div className={`h-11 w-11 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${iconCls}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] text-muted-foreground font-medium">{label}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">
                  {loading || loadingAR ? "—" : value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto px-6 pt-4 pb-6">
          <TabsContent value="review" className="mt-0 space-y-4">
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
        </div>
      </Tabs>

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
                <code className="ml-1 text-sm text-muted-foreground">
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

