/** Left sidebar listing policy domains with a create-domain button. */
import { Plus, ShieldCheck, Loader2, Lock, ChevronRight, Database, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PolicyDomainSummary } from "@/types/policy";
import { SensitivityBadge } from "./SensitivityBadge";

interface DomainListProps {
  domains: PolicyDomainSummary[];
  loading: boolean;
  selectedDomainId: string | null;
  onSelectDomain: (id: string) => void;
  onCreateClick: () => void;
}

const ICON_STYLES: { bg: string; iconCls: string }[] = [
  { bg: "bg-blue-100",   iconCls: "text-blue-600"   },
  { bg: "bg-green-100",  iconCls: "text-green-600"  },
  { bg: "bg-purple-100", iconCls: "text-purple-600" },
  { bg: "bg-orange-100", iconCls: "text-orange-500" },
  { bg: "bg-rose-100",   iconCls: "text-rose-600"   },
];

function iconStyle(idx: number) {
  return ICON_STYLES[idx % ICON_STYLES.length];
}

export function DomainList({
  domains,
  loading,
  selectedDomainId,
  onSelectDomain,
  onCreateClick,
}: DomainListProps) {
  return (
    <div className="w-80 shrink-0 flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-7 pb-2 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">Danh sách miền</h2>
        <LayoutList className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Create button */}
      <div className="p-3 border-b border-border/40">
        <Button
          className="w-full gap-1.5 font-medium text-[12.5px] h-9"
          variant="outline"
          onClick={onCreateClick}
        >
          <Plus className="h-3.5 w-3.5" /> Tạo miền mới
        </Button>
      </div>

      {/* Domain list */}
      <div className="flex-1 overflow-y-auto px-3 pt-4 pb-3 space-y-2 scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs">Đang tải...</span>
          </div>
        ) : domains.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-sm">Chưa có miền nào</p>
          </div>
        ) : (
          domains.map((d, idx) => {
            const style = iconStyle(idx);
            const isSelected = selectedDomainId === d.id;
            return (
              <div
                key={d.id}
                onClick={() => onSelectDomain(d.id)}
                className={`relative flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors ${
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/60 bg-card hover:border-border hover:bg-muted/20"
                }`}
              >
                {!d.is_active && (
                  <Lock className="absolute top-2 right-2 h-3 w-3 text-red-400" strokeWidth={2.5} />
                )}

                {/* Icon */}
                <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${style.bg}`}>
                  <Database className={`h-5 w-5 ${style.iconCls}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold leading-tight truncate">{d.name}</p>
                    <SensitivityBadge level={d.base_sensitivity} className="shrink-0 ml-auto" />
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{d.code}</p>
                  <p className="text-[10.5px] text-muted-foreground mt-1.5">
                    {d.entity_type_count} thực thể
                    <span className="mx-1.5 text-border">·</span>
                    {d.rule_count} luật
                  </p>
                </div>

                <ChevronRight className={`absolute bottom-3.5 right-3.5 h-3.5 w-3.5 ${isSelected ? "text-primary" : "text-muted-foreground/50"}`} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
