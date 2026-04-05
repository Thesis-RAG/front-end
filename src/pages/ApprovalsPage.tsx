import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SensitivityLevelBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/services/documents.api";

interface DocRecord {
  id: string;
  title: string;
  status: string;
  sensitivity_level: string;
  department_id: string;
  owner_user_id: string;
  version_count: number;
  created_at: string;
  updated_at: string;
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
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DocRecord | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const pendingReview = docs.filter((d) => d.status === "review");
  const pendingUploaded = docs.filter((d) => d.status === "uploaded");

  const handleAction = (doc: DocRecord, type: "approve" | "reject") => {
    setSelected(doc);
    setActionType(type);
    setComment("");
  };

  const confirmAction = async () => {
    if (!selected || !actionType) return;
    setSubmitting(true);
    try {
      if (actionType === "approve") {
        await approveDocument(selected.id, token);
        toast({ variant: "success", title: "Document approved" });
      } else {
        await rejectDocument(selected.id, comment, token);
        toast({ variant: "success", title: "Document rejected" });
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
        title="Approvals"
        description="Document and new version approval"
      />
      <div className="flex-1 overflow-auto p-6">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Review
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
                Uploaded (Pending Ingest)
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
                Total Pending
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
              In Review
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
              Uploaded
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
                title="No pending reviews"
                description="All documents have been reviewed"
              />
            ) : (
              pendingReview.map((doc) => (
                <ApprovalCard
                  key={doc.id}
                  doc={doc}
                  onApprove={() => handleAction(doc, "approve")}
                  onReject={() => handleAction(doc, "reject")}
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
                title="No uploaded documents"
                description="No documents waiting for approval"
              />
            ) : (
              pendingUploaded.map((doc) => (
                <ApprovalCard
                  key={doc.id}
                  doc={doc}
                  onApprove={() => handleAction(doc, "approve")}
                  onReject={() => handleAction(doc, "reject")}
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
                ? "Approve Document"
                : "Reject Document"}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {actionType === "approve"
                ? "This will approve the document and make it available in the knowledge base."
                : "Please provide a reason for rejection."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex">
              <p className="mb-1 text-[13px] font-medium mr-2">Document:</p>
              <Badge
                variant="secondary"
                className="text-[12px] text-muted-foreground"
              >
                <div className="mr-1">{selected?.title}</div>
                <code className="ml-1text-sm text-muted-foreground">
                  • v{selected?.version_count}
                </code>
              </Badge>
            </div>

            <div className="mt-4">
              <label className="text-[13px] font-medium">
                {actionType === "reject"
                  ? "Reason (required)"
                  : "Comment (optional)"}
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  actionType === "reject" ? "Explain why..." : "Add notes..."
                }
                className="mt-2 text-[12px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
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
                  ? "Approve"
                  : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalCard({
  doc,
  onApprove,
  onReject,
}: {
  doc: DocRecord;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-[15px]">{doc.title}</span>
              <SensitivityLevelBadge level={doc.sensitivity_level as any} />
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="text-[12px]">
                Versions:{" "}
                <code className="rounded bg-muted px-1">
                  {doc.version_count}
                </code>
              </span>
              <span>·</span>
              <span className="text-[12px]">
                Updated: {formatDate(doc.updated_at)}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-mono">
              ID: {doc.id.slice(0, 30)}...
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="text-xs hover:bg-gray-100 hover:text-black"
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Reject
            </Button>

            <Button size="sm" onClick={onApprove} className="text-xs">
              <CheckCircle className="mr-1.5 h-4 w-4" />
              Approve
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
