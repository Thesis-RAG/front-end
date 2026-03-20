import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  StatusBadge,
  sensitivity_levelBadge,
} from "@/components/ui/status-badge";
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
import { mockDocuments } from "@/data/mockData";

interface ApprovalItem {
  id: string;
  documentId: string;
  documentTitle: string;
  version: string;
  previousVersion?: string;
  department: string;
  sensitivity_level: "public" | "internal" | "confidential";
  submittedBy: string;
  submittedAt: string;
  status: "draft" | "review";
  changesCount: number;
}

const mockApprovals: ApprovalItem[] = [
  {
    id: "apr-1",
    documentId: "doc-3",
    documentTitle: "Hướng dẫn sử dụng CRM",
    version: "v1.5",
    previousVersion: "v1.4",
    department: "Sales",
    sensitivity_level: "internal",
    submittedBy: "Trần Văn Nam",
    submittedAt: "2024-01-12T09:00:00Z",
    status: "review",
    changesCount: 12,
  },
  {
    id: "apr-2",
    documentId: "doc-4",
    documentTitle: "Quy trình tuyển dụng",
    version: "v4.0-draft",
    previousVersion: "v3.2",
    department: "HR",
    sensitivity_level: "internal",
    submittedBy: "Nguy�?n Th�? Mai",
    submittedAt: "2024-01-14T16:00:00Z",
    status: "draft",
    changesCount: 28,
  },
];

export default function ApprovalsPage() {
  const [approvals] = useState<ApprovalItem[]>(mockApprovals);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(
    null,
  );
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [comment, setComment] = useState("");

  const pendingReview = approvals.filter((a) => a.status === "review");
  const pendingDraft = approvals.filter((a) => a.status === "draft");

  const handleAction = (approval: ApprovalItem, type: "approve" | "reject") => {
    setSelectedApproval(approval);
    setActionType(type);
    setComment("");
  };

  const confirmAction = () => {
    // In real app, send to backend
    console.log("Action:", actionType, selectedApproval?.id, comment);
    setSelectedApproval(null);
    setActionType(null);
    setComment("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Approvals"
        description="Document and new version approval"
        breadcrumbs={[{ label: "Approvals" }]}
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
                Draft Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {pendingDraft.length}
                </span>
                <FileText className="h-5 w-5 text-status-draft" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">5</span>
                <CheckCircle className="h-5 w-5 text-status-approved" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="review" className="space-y-4">
          <TabsList>
            <TabsTrigger value="review" className="gap-2">
              In Review
              {pendingReview.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 w-5 rounded-full p-0 text-xs"
                >
                  {pendingReview.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="draft" className="gap-2">
              Drafts
              {pendingDraft.length > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 w-5 rounded-full p-0 text-xs"
                >
                  {pendingDraft.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="space-y-4">
            {pendingReview.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="No pending reviews"
                description="All documents have been reviewed"
              />
            ) : (
              pendingReview.map((item) => (
                <ApprovalCard
                  key={item.id}
                  item={item}
                  onApprove={() => handleAction(item, "approve")}
                  onReject={() => handleAction(item, "reject")}
                  formatDate={formatDate}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="draft" className="space-y-4">
            {pendingDraft.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No draft documents"
                description="All drafts have been submitted for review"
              />
            ) : (
              pendingDraft.map((item) => (
                <ApprovalCard
                  key={item.id}
                  item={item}
                  onApprove={() => handleAction(item, "approve")}
                  onReject={() => handleAction(item, "reject")}
                  formatDate={formatDate}
                  isDraft
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Action Dialog */}
      <Dialog
        open={!!selectedApproval}
        onOpenChange={() => setSelectedApproval(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve"
                ? "Approve Document"
                : "Reject Document"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "This will approve the document and make it available in the knowledge base."
                : "Please provide a reason for rejection."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="mb-2 text-sm font-medium">Document:</p>
            <p className="text-sm text-muted-foreground">
              {selectedApproval?.documentTitle}
            </p>
            <p className="text-sm text-muted-foreground">
              Version: {selectedApproval?.version}
            </p>

            {actionType === "reject" && (
              <div className="mt-4">
                <label className="text-sm font-medium">Reason (required)</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explain why this document is being rejected..."
                  className="mt-2"
                />
              </div>
            )}

            {actionType === "approve" && (
              <div className="mt-4">
                <label className="text-sm font-medium">
                  Comment (optional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  className="mt-2"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedApproval(null)}>
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={confirmAction}
              disabled={actionType === "reject" && !comment.trim()}
            >
              {actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalCard({
  item,
  onApprove,
  onReject,
  formatDate,
  isDraft = false,
}: {
  item: ApprovalItem;
  onApprove: () => void;
  onReject: () => void;
  formatDate: (date: string) => string;
  isDraft?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/documents/${item.documentId}`}
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                {item.documentTitle}
              </Link>
              <StatusBadge status={item.status} />
              <SensitivityLevelBadge level={item.sensitivity_level} />
            </div>

            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Version:{" "}
                <code className="rounded bg-muted px-1">{item.version}</code>
              </span>
              {item.previousVersion && (
                <>
                  <ArrowRight className="h-4 w-4" />
                  <span>
                    From:{" "}
                    <code className="rounded bg-muted px-1">
                      {item.previousVersion}
                    </code>
                  </span>
                </>
              )}
            </div>

            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span>{item.department}</span>
              <span>•</span>
              <span>Submitted by {item.submittedBy}</span>
              <span>•</span>
              <span>{formatDate(item.submittedAt)}</span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary">{item.changesCount} changes</Badge>
              <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
                <Link
                  to={`/documents/${item.documentId}/versions/${item.version}`}
                >
                  View Changes
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onReject}>
              <XCircle className="mr-1.5 h-4 w-4" />
              Reject
            </Button>
            <Button size="sm" onClick={onApprove}>
              <CheckCircle className="mr-1.5 h-4 w-4" />
              {isDraft ? "Submit for Review" : "Approve"}
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
