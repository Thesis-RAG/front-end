/** OuiMultiSelect: grouped org-unit-instance picker with expand/collapse per OU row. */
import { useState, useEffect, useRef } from "react";
import { Building2, X, ChevronDown, Check } from "lucide-react";
import { OrgUnit, OrgUnitInstance } from "@/services/org_units.api";

export function OuiMultiSelect({
  orgUnits,
  orgUnitInstances,
  selectedOuiIds,
  onChange,
}: {
  orgUnits: OrgUnit[];
  orgUnitInstances: OrgUnitInstance[];
  selectedOuiIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [expandedOuId, setExpandedOuId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close the picker when clicking outside.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setExpandedOuId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleOui = (id: string) => {
    onChange(
      selectedOuiIds.includes(id)
        ? selectedOuiIds.filter((x) => x !== id)
        : [...selectedOuiIds, id],
    );
  };

  const getOuiLabel = (id: string) => {
    const oui = orgUnitInstances.find((o) => o.id === id);
    const ou = orgUnits.find((u) => u.id === oui?.ou_id);
    return oui ? `${ou?.name ?? ""} / ${oui.name}` : id;
  };

  // Only show OUs that have at least one OUI in the allowed list.
  const visibleOus = orgUnits.filter((ou) =>
    orgUnitInstances.some((o) => o.ou_id === ou.id),
  );

  return (
    <div className="space-y-2" ref={ref}>
      {selectedOuiIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOuiIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
            >
              <Building2 className="h-3 w-3" />
              {getOuiLabel(id)}
              <button
                onClick={() => toggleOui(id)}
                className="hover:text-destructive ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* OU list — each row is one OU; click to expand its OUI list. */}
      <div className="border rounded-md bg-background divide-y">
        {visibleOus.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-2">
            Không có đơn vị nào
          </p>
        ) : (
          visibleOus.map((ou) => {
            const ouiList = orgUnitInstances.filter((o) => o.ou_id === ou.id);
            const isExpanded = expandedOuId === ou.id;
            const selectedCount = ouiList.filter((o) =>
              selectedOuiIds.includes(o.id),
            ).length;

            return (
              <div key={ou.id}>
                <button
                  type="button"
                  className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => setExpandedOuId(isExpanded ? null : ou.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[13.5px]">{ou.name}</span>
                    {selectedCount > 0 && (
                      <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                        {selectedCount}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {/* OUI list — visible only when the parent OU row is expanded. */}
                {isExpanded && (
                  <div className="bg-muted/30 border-t">
                    {ouiList.map((oui) => {
                      const selected = selectedOuiIds.includes(oui.id);
                      return (
                        <button
                          key={oui.id}
                          type="button"
                          className="flex items-center w-full px-5 py-1.5 text-sm hover:bg-muted gap-2"
                          onClick={() => toggleOui(oui.id)}
                        >
                          <div
                            className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${selected ? "bg-primary border-primary" : "border-input"}`}
                          >
                            {selected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <span>{oui.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
