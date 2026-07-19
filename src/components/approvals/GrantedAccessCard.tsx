/** GrantedAccessCard: card for an approved access grant with a live countdown and revoke button. */
import { Clock, FileText, ShieldCheck, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SensitivityLevelBadge } from "@/components/ui/status-badge";
import { AccessRequestRead } from "@/services/documents.api";
import { ARCountdown } from "./ARCountdown";
import { formatDate } from "@/lib/date";

// Card for an approved access grant: shows user info, document, remaining time via ARCountdown, and a revoke button.
export function GrantedAccessCard({
  req,
  onRevoke,
  revoking,
}: {
  req: AccessRequestRead;
  onRevoke: () => void;
  revoking: boolean;
}) {
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
          {/* Left: User + Document info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <span className="text-sm font-bold text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-[14px]">
                  {req.requester_name ?? req.user_id}
                </p>
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
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
                {req.resolved_at && (
                  <span>Cấp lúc: {formatDate(req.resolved_at)}</span>
                )}
                {req.admin_note && (
                  <span className="italic">· Ghi chú: {req.admin_note}</span>
                )}
              </div>
            </div>
          </div>
          {/* Right: Expiry + Revoke */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Còn lại:</span>
              <ARCountdown expiresAt={req.expires_at} />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              disabled={revoking}
              onClick={onRevoke}
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              {revoking ? "Đang thu hồi..." : "Thu hồi quyền"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
