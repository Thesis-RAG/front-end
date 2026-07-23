/** DocumentTable: document list with sensitivity/access indicators and per-row action menu. */
import {
  FileText,
  MoreHorizontal,
  Eye,
  Upload,
  Trash2,
  Pencil,
  Lock,
  Clock,
  ShieldX,
} from "lucide-react";
import { getFileTypeStyle } from "@/lib/file-type-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { DocumentStatus } from "@/types";
import { AccessRequestRead } from "@/services/documents.api";
import { OrgUnit, OrgUnitInstance } from "@/services/org_units.api";
import { DocumentRead } from "@/types/documents";
import { formatDate } from "@/lib/date";
import { SensitivityBadge } from "./SensitivityBadge";
import { CountdownTimer } from "./CountdownTimer";

// Shared props used by both DocumentTable and DocTabContent (which wraps it).
export interface DocumentTableBaseProps {
  loading: boolean;
  orgUnits: OrgUnit[];
  orgUnitInstances: OrgUnitInstance[];
  restrictedDocIds: Set<string>;
  accessRequestMap: Map<string, AccessRequestRead>;
  requestingDocId: string | null;
  isCorpMember: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onView: (doc: DocumentRead) => void;
  onEdit: (doc: DocumentRead) => void;
  onDelete: (doc: DocumentRead) => void;
  onUploadVersion: (doc: DocumentRead) => void;
  onRequestAccess: (doc: DocumentRead) => void;
}

export interface DocumentTableProps extends DocumentTableBaseProps {
  docs: DocumentRead[];
  showOwner?: boolean;
}

export function DocumentTable({
  docs,
  loading,
  showOwner = false,
  orgUnits,
  orgUnitInstances,
  restrictedDocIds,
  accessRequestMap,
  requestingDocId,
  isCorpMember,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
  onUploadVersion,
  onRequestAccess,
}: DocumentTableProps) {
  const colSpan = showOwner ? 8 : 7;

  const getInitials = (name: string) =>
    name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  const getOuiLabel = (ouiId: string) => {
    const oui = orgUnitInstances.find((o) => o.id === ouiId);
    const ou = orgUnits.find((u) => u.id === oui?.ou_id);
    return oui ? `${ou?.name ?? ""} / ${oui.name}` : ouiId.slice(0, 8);
  };

  // Return the appropriate access-status icon for a document with restricted chunks.
  const getAccessStatusIcon = (doc: DocumentRead) => {
    if (!restrictedDocIds.has(doc.id)) return null;
    const ar = accessRequestMap.get(doc.id);
    if (!ar)
      return (
        <span title="Bạn không có quyền xem toàn bộ tài liệu này">
          <Lock className="h-3.5 w-3.5 text-destructive" />
        </span>
      );
    if (ar.status === "pending")
      return (
        <span title="Đang chờ phê duyệt">
          <Clock className="h-3.5 w-3.5 text-amber-500" />
        </span>
      );
    if (
      ar.status === "approved" &&
      (ar.expires_at === null || new Date(ar.expires_at) > new Date())
    )
      return <CountdownTimer expiresAt={ar.expires_at} compact />;
    if (ar.status === "rejected")
      return (
        <span title="Yêu cầu bị từ chối">
          <ShieldX className="h-3.5 w-3.5 text-destructive" />
        </span>
      );
    return (
      <span title="Quyền truy cập đã hết hạn">
        <Lock className="h-3.5 w-3.5 text-destructive" />
      </span>
    );
  };

  // Render the "Request Access" dropdown item for a document with restricted chunks.
  const renderAccessRequestItem = (doc: DocumentRead) => {
    if (!restrictedDocIds.has(doc.id)) return null;
    const ar = accessRequestMap.get(doc.id);
    const isPending = ar?.status === "pending";
    const isApproved =
      ar?.status === "approved" &&
      (ar.expires_at === null || new Date(ar.expires_at) > new Date());
    return (
      <>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isPending || isApproved || requestingDocId === doc.id}
          onClick={() => onRequestAccess(doc)}
        >
          <Lock className="mr-2 h-4 w-4" />
          {isPending
            ? "Đang chờ phê duyệt"
            : isApproved
              ? "Đã được phê duyệt"
              : ar?.status === "approved"
                ? "Gia hạn quyền truy cập"
                : "Yêu cầu xem tài liệu"}
        </DropdownMenuItem>
      </>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[28%] text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Tên tài liệu
            </TableHead>
            <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Đơn vị
            </TableHead>
            <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Độ nhạy
            </TableHead>
            <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Trạng thái
            </TableHead>
            <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Phiên bản
            </TableHead>
            {showOwner && (
              <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Người sở hữu
              </TableHead>
            )}
            <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Cập nhật
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={colSpan}
                className="h-32 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm">Đang tải...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : docs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="h-32 text-center">
                <div className="flex flex-col items-center text-muted-foreground gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="text-sm">Không tìm thấy tài liệu nào</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            docs.map((doc) => (
              <TableRow
                key={doc.id}
                className="hover:bg-muted/30 transition-colors"
              >
                <TableCell>
                  <button
                    onClick={() => onView(doc)}
                    className="flex items-center gap-2 text-left group/title"
                  >
                    {(() => {
                      const s = getFileTypeStyle(doc.document_type, doc.id);
                      const Icon = s.Icon;
                      return (
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${s.bg}`}>
                          <Icon className={`h-3.5 w-3.5 ${s.iconCls}`} />
                        </span>
                      );
                    })()}
                    <span className="font-semibold text-foreground group-hover/title:text-primary transition-colors line-clamp-1">
                      {doc.title}
                    </span>
                  </button>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {doc.oui_ids.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      doc.oui_ids.slice(0, 2).map((id) => (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="font-normal text-xs"
                        >
                          {getOuiLabel(id)}
                        </Badge>
                      ))
                    )}
                    {doc.oui_ids.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{doc.oui_ids.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                <TableCell className="whitespace-nowrap">
                  <div className="flex flex-nowrap items-center gap-1.5">
                    <SensitivityBadge level={doc.sensitivity} />
                    {getAccessStatusIcon(doc)}
                  </div>
                </TableCell>

                <TableCell>
                  <StatusBadge status={doc.status as DocumentStatus} />
                </TableCell>

                <TableCell className="font-mono text-sm text-muted-foreground">
                  v{doc.version_count}
                </TableCell>

                {showOwner && (
                  <TableCell>
                    {doc.owner_name ? (
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                          {getInitials(doc.owner_name)}
                        </span>
                        <span className="text-xs text-foreground">{doc.owner_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">
                        {doc.owner_user_id.slice(0, 8)}…
                      </span>
                    )}
                  </TableCell>
                )}

                <TableCell className="text-muted-foreground text-xs">
                  {formatDate(doc.updated_at)}
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => onView(doc)}>
                        <Eye className="mr-2 h-4 w-4" /> Xem
                      </DropdownMenuItem>
                      {renderAccessRequestItem(doc)}
                      {isCorpMember && (
                        <DropdownMenuItem onClick={() => onEdit(doc)}>
                          <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
                        </DropdownMenuItem>
                      )}
                      {canEdit && (
                        <>
                          <DropdownMenuItem onClick={() => onUploadVersion(doc)}>
                            <Upload className="mr-2 h-4 w-4" /> Tải lên phiên
                            bản mới
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => onDelete(doc)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Xóa
                              </DropdownMenuItem>
                            </>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
