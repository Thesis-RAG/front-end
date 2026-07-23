import { Clock, FileText, ShieldCheck, ShieldX, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EntityAccessRequestRead } from "@/services/documents.api";
import { formatDate } from "@/lib/date";

export function EntityAccessRequestCard({
  req,
  onApprove,
  onReject,
}: {
  req: EntityAccessRequestRead;
  onApprove: () => void;
  onReject: () => void;
}) {
  const statusIcon = req.status === "pending"
    ? <Clock className="h-4 w-4 text-amber-500" />
    : req.status === "approved"
      ? <ShieldCheck className="h-4 w-4 text-green-600" />
      : <ShieldX className="h-4 w-4 text-destructive" />;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {statusIcon}
              {req.requester_name ?? req.user_id}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[13px]">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{req.document_title ?? req.document_id}</span>
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Thực thể cần xem: {req.entity_types.join(", ")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Gửi lúc: {formatDate(req.created_at)}
              {req.admin_note ? ` · ${req.admin_note}` : ""}
            </p>
          </div>
          {req.status === "pending" && (
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" onClick={onApprove} className="text-xs">
                <ShieldCheck className="mr-1.5 h-4 w-4" /> Phê duyệt
              </Button>
              <Button variant="outline" size="sm" onClick={onReject} className="text-xs">
                <XCircle className="mr-1.5 h-4 w-4" /> Từ chối
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
