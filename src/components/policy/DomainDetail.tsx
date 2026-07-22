/** Right panel showing domain info, entity types, and management actions. */
import {
  ShieldCheck,
  Loader2,
  Trash2,
  Sparkles,
  Plus,
  X,
  Lock,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  EntityTypeItem,
  PolicyDomain,
  PolicyDomainSummary,
} from "@/types/policy";
import { SensitivityBadge } from "./SensitivityBadge";

interface DomainDetailProps {
  selectedDomainId: string | null;
  selectedDomain: PolicyDomain | null;
  loading: boolean;
  domains: PolicyDomainSummary[];
  onToggleDomain: (domain: PolicyDomainSummary) => Promise<void>;
  onDeleteDomain: (domain: PolicyDomainSummary) => Promise<void>;
  onDeleteEntityType: (et: EntityTypeItem) => Promise<void>;
  onSuggestForExisting: () => Promise<void>;
  onAddEntityClick: () => void;
}

export function DomainDetail({
  selectedDomainId,
  selectedDomain,
  loading,
  domains,
  onToggleDomain,
  onDeleteDomain,
  onDeleteEntityType,
  onSuggestForExisting,
  onAddEntityClick,
}: DomainDetailProps) {
  return (
    <div className="min-h-0 flex-1 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex-1 overflow-y-auto pt-6 px-6 pb-6">
        {!selectedDomainId ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 select-none">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium">
              Chọn một miền để xem chi tiết
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : selectedDomain ? (
          <div className="max-w-7xl">
            {/* Domain header info */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-[20px] font-bold">
                      {selectedDomain.name}
                    </h2>
                    <span className="font-mono text-[11.5px] bg-muted text-muted-foreground px-2 py-1 rounded-md border border-border">
                      {selectedDomain.code}
                    </span>
                    <SensitivityBadge
                      level={selectedDomain.base_sensitivity}
                      className="text-[12px]"
                    />
                    {selectedDomain.is_active ? (
                      <span className="text-[12px] bg-green-50 text-green-800 px-2 py-[3px] rounded-md font-medium flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                        Đang bật
                      </span>
                    ) : (
                      <span className="text-[12px] bg-red-200 text-foreground/70 px-2 py-[3px] rounded-md font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Lock className="h-3 w-3" />
                          <div className="text-gray">Đang tắt</div>
                        </div>
                      </span>
                    )}
                  </div>
                  {selectedDomain.description && (
                    <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                      {selectedDomain.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() =>
                      onToggleDomain(
                        domains.find((d) => d.id === selectedDomainId)!,
                      )
                    }
                  >
                    {selectedDomain.is_active ? "Tắt" : "Bật"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() =>
                      onDeleteDomain(
                        domains.find((d) => d.id === selectedDomainId)!,
                      )
                    }
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Xóa
                  </Button>
                </div>
              </div>
            </div>

            {/* Entity types */}
            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Loại thực thể</h3>
                  <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedDomain.entity_types.length}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSuggestForExisting}
                    className="h-8 text-[11px] gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Sparkles className="h-3 w-3" /> Gợi ý AI
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddEntityClick}
                    className="h-8 text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm thủ công
                  </Button>
                </div>
              </div>

              {selectedDomain.entity_types.length === 0 ? (
                <p className="text-[12px] text-muted-foreground py-4 text-center">
                  Chưa có loại thực thể nào. Thêm thủ công hoặc dùng gợi ý LLM.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedDomain.entity_types.map((et) => (
                    <div
                      key={et.id}
                      className="group flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-md text-[12px] font-mono bg-muted text-foreground border border-border/60"
                    >
                      <span>{et.entity_type}</span>
                      {et.label_vi && (
                        <span className="opacity-50 font-sans text-[11px]">
                          ({et.label_vi})
                        </span>
                      )}
                      <button
                        onClick={() => onDeleteEntityType(et)}
                        className="ml-0.5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 inline-flex items-center gap-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 px-4 py-3">
                <Info className="h-4 w-4 shrink-0 text-blue-500" />
                <p className="text-[12px] text-blue-700 dark:text-blue-300">
                  GLiNER được sử dụng để phát hiện loại thực thể khi xử lý tài
                  liệu tải lên.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
