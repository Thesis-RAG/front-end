/** SearchResultCard: displays a single search result chunk with scores, sensitivity badge, blur overlay, and access-request button. */
import { Lock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SensitivityLevelBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { getFileTypeStyle } from "@/lib/file-type-icon";
import { AccessRequestRead, EntityAccessRequestRead } from "@/services/documents.api";
import { SearchChunk } from "@/types/search";
import { buildTerms, HighlightedText } from "./highlight";
import { ChunkContent } from "./ChunkContent";

export function SearchResultCard({
  result,
  query,
  accessRequest,
  entityAccessRequest,
  isRequesting,
  onRequestAccess,
  onRequestEntityAccess,
}: {
  result: SearchChunk;
  query: string;
  accessRequest?: AccessRequestRead;
  entityAccessRequest?: EntityAccessRequestRead;
  isRequesting: boolean;
  onRequestAccess: (docId: string) => void;
  onRequestEntityAccess: (result: SearchChunk) => void;
}) {
  const isBlurred = result.chunk_blurred === true;
  const isEntityRestricted = result.entity_access_required === true || result.metadata.entity_access_required === true;
  const isRestricted = result.doc_restricted === true || isEntityRestricted;
  const terms = buildTerms(query);

  const reqStatus = accessRequest?.status;
  const isPending = reqStatus === "pending";
  const isApproved = reqStatus === "approved";
  const entityReqStatus = entityAccessRequest?.status;
  const entityPending = entityReqStatus === "pending";
  const entityApproved = entityReqStatus === "approved";

  const docStyle = getFileTypeStyle(result.metadata.document_type, result.metadata.document_id);
  const DocIcon = docStyle.Icon;

  return (
    <div className="group rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Document icon */}
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${docStyle.bg}`}>
            <DocIcon className={`h-4.5 w-4.5 ${docStyle.iconCls}`} />
          </div>
          <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-foreground">
              <HighlightedText text={result.metadata.document_title} terms={terms} />
            </h3>
            <SensitivityLevelBadge
              level={Number(result.metadata.sensitivity)}
            />
            <Badge variant="outline" className="text-xs font-normal">
              Trang {result.metadata.page_start}–{result.metadata.page_end}
            </Badge>
            {isRestricted && (
              <Badge variant="outline" className="text-[10px] font-normal text-yellow-600 border-yellow-400">
                Hạn chế xem
              </Badge>
            )}
            {isEntityRestricted && (
              <Badge variant="outline" className="border-destructive/50 text-[10px] font-normal text-destructive">
                Cần quyền: {(result.blocked_entity_types ?? result.metadata.blocked_entity_types ?? []).join(", ")}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-semibold">
              Phân đoạn #{result.metadata.chunk_index}
            </Badge>
            {result.sources.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="text-[10px] font-semibold"
              >
                {s === "semantic" ? "Ngữ nghĩa" : "Từ khóa"}
              </Badge>
            ))}
          </div>
          {result.metadata.department_id && (
            <p className="mt-1 text-[11px] text-muted-foreground truncate">
              {result.metadata.department_id}
            </p>
          )}
          </div>{/* end inner flex */}
        </div>{/* end left flex */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Điểm</div>
            <div className="font-medium text-sm">
              {Math.round(result.score * 100)}%
            </div>
          </div>
          {isRestricted ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-[11px] shrink-0"
              disabled={isPending || isApproved || entityPending || entityApproved || isRequesting}
              onClick={() => isEntityRestricted ? onRequestEntityAccess(result) : onRequestAccess(result.metadata.document_id)}
            >
              <Lock className="h-3 w-3" />
              {isRequesting
                ? "Đang gửi..."
                : isPending
                  ? "Chờ duyệt"
                  : isApproved
                    ? "Đã duyệt"
                    : "Yêu cầu xem"}
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <a href={`/documents/${result.metadata.document_id}`}>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Chunk content — blurred if the user lacks clearance. */}
      <div className="relative mt-3">
        <div
          className={cn(
            isBlurred && "blur-sm select-none pointer-events-none",
          )}
        >
          <ChunkContent text={result.document_text} terms={terms} />
        </div>
        {isBlurred && (
          <div className="absolute inset-0 flex items-center justify-center rounded bg-background/70">
            <p className="px-6 text-center text-xs text-muted-foreground">
              <span className="mb-0.5 block font-medium text-foreground">
                Nội dung bị che
              </span>
              Tài liệu này yêu cầu phê duyệt từ admin để xem đầy đủ.
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>Từ khóa: {Math.round(result.keyword_score * 100)}%</span>
        <span>·</span>
        <span>Ngữ nghĩa: {Math.round(result.semantic_score * 100)}%</span>
      </div>
    </div>
  );
}
