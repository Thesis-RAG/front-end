import { useState } from "react";
import { X, Network, ChevronDown, Check } from "lucide-react";

interface OuiOption {
  id: string;
  name: string;
  ou_name: string;
}

interface ChatFilterProps {
  availableOuis: OuiOption[];
  selectedOuiIds: string[];
  onToggleOui: (id: string) => void;
  onClose: () => void;
}

export function ChatFilter({
  availableOuis,
  selectedOuiIds,
  onToggleOui,
  onClose,
}: ChatFilterProps) {
  const [expandedOuName, setExpandedOuName] = useState<string | null>(null);
  const activeCount = selectedOuiIds.length;

  // Group OUI theo ou_name
  const grouped = availableOuis.reduce<Record<string, OuiOption[]>>((acc, o) => {
    if (!acc[o.ou_name]) acc[o.ou_name] = [];
    acc[o.ou_name].push(o);
    return acc;
  }, {});

  return (
    <div className="absolute bottom-full right-0 mb-3 w-[300px] rounded-xl border border-border bg-popover shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Network className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">Lọc theo đơn vị</span>
          {activeCount > 0 && (
            <span className="text-[10px] font-medium bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
              {activeCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-72 overflow-y-auto">
        {Object.keys(grouped).length === 0 ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            Không có đơn vị khả dụng
          </div>
        ) : (
          <div className="divide-y">
            {Object.entries(grouped).map(([ouName, ouis]) => {
              const isExpanded = expandedOuName === ouName;
              const selectedCount = ouis.filter(o => selectedOuiIds.includes(o.id)).length;

              return (
                <div key={ouName}>
                  {/* OU header */}
                  <button
                    type="button"
                    className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    onClick={() => setExpandedOuName(isExpanded ? null : ouName)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[13px]">{ouName}</span>
                      {selectedCount > 0 && (
                        <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                          {selectedCount}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* OUI list */}
                  {isExpanded && (
                    <div className="bg-muted/30 border-t divide-y divide-border/50">
                      {ouis.map((o) => {
                        const selected = selectedOuiIds.includes(o.id);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            className="flex items-center gap-2.5 w-full px-6 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={() => onToggleOui(o.id)}
                          >
                            <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${selected ? "bg-primary border-primary" : "border-input"}`}>
                              {selected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-[13px]">{o.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {activeCount > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{activeCount} đang áp dụng</span>
          <button
            onClick={() => selectedOuiIds.forEach((id) => onToggleOui(id))}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <X className="h-3 w-3" /> Xóa tất cả
          </button>
        </div>
      )}
    </div>
  );
}