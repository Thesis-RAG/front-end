/** AccessRequestCard: card for a single document access request with approve/reject actions. */
import { Clock, FileText, ShieldCheck, ShieldX, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SensitivityLevelBadge } from "@/components/ui/status-badge";
import { AccessRequestRead } from "@/services/documents.api";
import { formatDate } from "@/lib/date";

// Card for a single access request: shows requester identity, document info, status, and approve/reject buttons for pending requests.
export function AccessRequestCard({
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

  const initials = (req.requester_name ?? req.requester_email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
              <span className="text-sm font-bold text-foreground">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-[14px]">
                  {req.requester_name ?? req.user_id}
                </p>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {statusIcon} {statusLabel}
                </span>
              </div>
              {req.requester_email && req.requester_email !== req.requester_name && (
                <p className="text-[11px] text-muted-foreground">
                  {req.requester_email}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-[13px] font-medium">
                  {req.document_title ?? req.document_id}
                </span>
                {req.document_sensitivity != null && (
                  <SensitivityLevelBadge
                    level={req.document_sensitivity}
                    className="px-1.5 py-0 text-[10px]"
                  />
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                <span>Gửi lúc: {formatDate(req.created_at)}</span>
                {req.admin_note && (
                  <span className="italic">· Ghi chú: {req.admin_note}</span>
                )}
              </div>
            </div>
          </div>
          {req.status === "pending" && (
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={onApprove} className="text-xs">
                <ShieldCheck className="mr-1.5 h-4 w-4" /> Phê duyệt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onReject}
                className="text-xs hover:bg-gray-100 hover:text-black"
              >
                <XCircle className="mr-1.5 h-4 w-4" /> Từ chối
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
