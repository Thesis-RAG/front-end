/** OUI accordion filter for the Search page — collapses/expands each OU row with checkbox items. */
import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { OrgUnit, OrgUnitInstance } from "@/services/org_units.api";

export function OuiFilterAccordion({
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

  // Toggle a single OUI ID in/out of the selected list.
  const toggleOui = (id: string) => {
    onChange(
      selectedOuiIds.includes(id)
        ? selectedOuiIds.filter((x) => x !== id)
        : [...selectedOuiIds, id],
    );
  };

  // Filter to only OUs that have at least one OUI instance.
  const visibleOus = orgUnits.filter((ou) =>
    orgUnitInstances.some((o) => o.ou_id === ou.id),
  );

  return (
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
                  <span className="font-medium text-[13px]">{ou.name}</span>
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
  );
}
