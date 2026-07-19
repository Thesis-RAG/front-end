/** ApprovalCard: card for a single pending document with approve/reject/view actions. */
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { OrgUnit, OrgUnitInstance } from "@/services/org_units.api";
import { SENSITIVITY_LEVEL, SENSITIVITY_COLOR } from "@/types";
import { formatDate } from "@/lib/date";

export interface DocRecord {
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

// Card for a single pending document: displays title, sensitivity, OUI badges, version info, and approve/reject/view actions.
export function ApprovalCard({
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
                <code className="rounded bg-muted px-1">v{doc.version_count}</code>
              </span>
              <span>·</span>
              <span className="text-[12px] font-semibold">Cập nhật cuối:</span>
              <span className="text-[11.5px]">{formatDate(doc.updated_at)}</span>
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
            <Button size="sm" onClick={onApprove} className="text-xs bg-gray-800">
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
