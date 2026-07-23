/** OuiPanel: card-based list of OUI instances for a selected OU type, with add/delete. */
import { useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  OrgUnit,
  OrgUnitInstance,
  Position,
  createOrgUnitInstance,
  deleteOrgUnitInstance,
  updateOrgUnitInstance,
} from "@/services/org_units.api";
import { UserRecord } from "@/services/users.api";

// Rotating accent colors for OUI cards: left border + circular icon background.
const OUI_COLORS = [
  { border: "border-l-blue-500",    bg: "bg-blue-100",    text: "text-blue-600" },
  { border: "border-l-yellow-500",  bg: "bg-yellow-100",  text: "text-yellow-600" },
  { border: "border-l-green-500",   bg: "bg-green-100",   text: "text-green-600" },
  { border: "border-l-purple-500",  bg: "bg-purple-100",  text: "text-purple-600" },
  { border: "border-l-red-500",     bg: "bg-red-100",     text: "text-red-600" },
  { border: "border-l-indigo-500",  bg: "bg-indigo-100",  text: "text-indigo-600" },
  { border: "border-l-teal-500",    bg: "bg-teal-100",    text: "text-teal-600" },
  { border: "border-l-orange-500",  bg: "bg-orange-100",  text: "text-orange-600" },
];


export function OuiPanel({
  ou,
  ouis,
  allOuis,
  allOrgUnits,
  allUsers,
  positions,
  token,
  onRefresh,
  selectedOuiId,
  onSelectOui,
}: {
  ou: OrgUnit | null;
  ouis: OrgUnitInstance[];
  allOuis: OrgUnitInstance[];
  allOrgUnits: OrgUnit[];
  allUsers: UserRecord[];
  positions: Position[];
  token: string | null;
  onRefresh: () => void;
  selectedOuiId: string | null;
  onSelectOui: (id: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [levelSelections, setLevelSelections] = useState<Record<string, string[]>>({});
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [ouiSearch, setOuiSearch] = useState("");

  const getOuiName = (oui_id: string) =>
    allOuis.find((o) => o.id === oui_id)?.name ?? oui_id;

  // OU type ancestor chain from root down to (and including) the parent type of current ou.
  // e.g., ou=Dự án → chain=[Công ty, Chi nhánh, Phòng ban]
  const ancestorChain: OrgUnit[] = (() => {
    if (!ou?.parent_id) return [];
    const chain: OrgUnit[] = [];
    let currentId: string | null = ou.parent_id;
    const seen = new Set<string>();
    while (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      const found = allOrgUnits.find((o) => o.id === currentId);
      if (!found) break;
      chain.unshift(found);
      currentId = found.parent_id ?? null;
    }
    return chain;
  })();

  // OUI instances visible at a given ancestor level, filtered by the selection above it.
  // No selection at the previous level → all at this level.
  const getOuisAtLevel = (levelIdx: number): OrgUnitInstance[] => {
    const levelOu = ancestorChain[levelIdx];
    const typeOuis = allOuis.filter((o) => o.ou_id === levelOu.id);
    if (levelIdx === 0) return typeOuis;
    const prevSelected = levelSelections[ancestorChain[levelIdx - 1].id] ?? [];
    if (prevSelected.length === 0) return typeOuis;
    return typeOuis.filter((o) =>
      o.parent_oui_ids.some((pid) => prevSelected.includes(pid))
    );
  };

  // Final parent_oui_ids for the new OUI: selections at the deepest (parent) level,
  // or all visible at that level when nothing selected (= "all").
  const effectiveParentIds: string[] = (() => {
    if (ancestorChain.length === 0) return [];
    const lastIdx = ancestorChain.length - 1;
    const sel = levelSelections[ancestorChain[lastIdx].id] ?? [];
    return sel.length > 0 ? sel : getOuisAtLevel(lastIdx).map((o) => o.id);
  })();

  // Toggle a selection at a cascade level; clears all deeper level selections on change.
  const toggleAtLevel = (ouTypeId: string, ouiId: string, levelIdx: number) => {
    setLevelSelections((prev) => {
      const current = prev[ouTypeId] ?? [];
      const updated = current.includes(ouiId)
        ? current.filter((id) => id !== ouiId)
        : [...current, ouiId];
      const result: Record<string, string[]> = { ...prev, [ouTypeId]: updated };
      for (let i = levelIdx + 1; i < ancestorChain.length; i++) {
        delete result[ancestorChain[i].id];
      }
      return result;
    });
  };

  // Filter cards by search query.
  const visibleOuis = ouiSearch.trim()
    ? ouis.filter((o) => o.name.toLowerCase().includes(ouiSearch.toLowerCase()))
    : ouis;

  // Create a new OUI instance under the selected OU type.
  const handleAdd = async () => {
    if (!addName.trim() || !ou) return;
    setSaving(true);
    try {
      await createOrgUnitInstance(
        { name: addName.trim(), ou_id: ou.id, parent_oui_ids: effectiveParentIds },
        token,
      );
      toast({ variant: "success", title: `Đã tạo đơn vị "${addName}"` });
      setAddOpen(false);
      setAddName("");
      setLevelSelections({});
      onRefresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa đơn vị "${name}"?`)) return;
    try {
      await deleteOrgUnitInstance(id, token);
      toast({ variant: "success", title: "Đã xóa" });
      onRefresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    }
  };

  const handleRemoveParent = async (oui: OrgUnitInstance, parentId: string) => {
    const newParents = oui.parent_oui_ids.filter((id) => id !== parentId);
    try {
      await updateOrgUnitInstance(oui.id, { parent_oui_ids: newParents }, token);
      toast({ variant: "success", title: `Đã xóa liên kết với "${getOuiName(parentId)}"` });
      onRefresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Column header */}
      <div className="flex items-center justify-between px-4 pt-3 flex-shrink-0">
        <span className="text-sm font-semibold">{ou?.name ?? "Phòng ban"}</span>
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
          {ouis.length}
        </Badge>
      </div>

      {/* Search bar */}
      <div className="px-4 py-2.5 flex-shrink-0 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="h-9 pl-8 text-xs placeholder:text-muted-foreground placeholder:text-[12px]"
            placeholder="Tìm phòng ban, dự án, ..."
            value={ouiSearch}
            onChange={(e) => setOuiSearch(e.target.value)}
          />
        </div>
        <button className="h-9 w-9 flex items-center justify-center rounded-md border border-input hover:bg-muted transition-colors shrink-0">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* OUI card list */}
      <div className="flex-1 overflow-y-auto">
        {visibleOuis.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-1">
            <p className="text-xs">Chưa thêm thông tin</p>
          </div>
        ) : (
          <div className="divide-y">
            {visibleOuis.map((oui) => {
              const realIdx = ouis.indexOf(oui);
              const color = OUI_COLORS[realIdx % OUI_COLORS.length];
              const isSelected = selectedOuiId === oui.id;
              // Count employees assigned to this OUI.
              const empCount = allUsers.filter((u) =>
                u.oui_positions.some((p) => p.oui_id === oui.id),
              ).length;

              return (
                <div
                  key={oui.id}
                  onClick={() => onSelectOui(oui.id)}
                  className={`group flex items-center gap-3 px-4 py-3 cursor-pointer border-l-4 transition-colors
                    ${color.border}
                    ${isSelected ? "bg-blue-50/60 dark:bg-blue-950/20" : "hover:bg-muted/30"}`}
                >
                  {/* Circular icon */}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${color.bg}`}>
                    <Building2 className={`h-5 w-5 ${color.text}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`text-sm font-semibold truncate min-w-0 flex-1 ${isSelected ? "text-primary" : ""}`}>
                        {oui.name}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${color.bg} ${color.text}`}>
                          {empCount} nhân viên
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${color.bg} ${color.text}`}>
                          {positions.length} vị trí
                        </span>
                      </div>
                    </div>
                    {oui.parent_oui_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {oui.parent_oui_ids.map((pid) => (
                          <span
                            key={pid}
                            className="group/tag inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                          >
                            ↑ {getOuiName(pid)}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveParent(oui, pid); }}
                              className="opacity-0 group-hover/tag:opacity-100 hover:text-destructive transition-opacity ml-0.5"
                              title="Xóa liên kết"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(oui.id, oui.name); }}
                      className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity p-1 rounded hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer add link */}
      <div className="px-4 py-3 border-t flex-shrink-0">
        <button
          onClick={() => {
            setAddName("");
            // Auto-select levels that have exactly 1 option and expand them.
            // Stop at the first level with >1 choice so the user picks.
            const initSel: Record<string, string[]> = {};
            const initExp = new Set<number>();
            for (let idx = 0; idx < ancestorChain.length; idx++) {
              const levelOu = ancestorChain[idx];
              const typeOuis = allOuis.filter((o) => o.ou_id === levelOu.id);
              const prevSel = idx > 0 ? (initSel[ancestorChain[idx - 1].id] ?? []) : [];
              const visible = prevSel.length > 0
                ? typeOuis.filter((o) => o.parent_oui_ids.some((pid) => prevSel.includes(pid)))
                : typeOuis;
              initExp.add(idx);
              if (visible.length === 1) {
                initSel[levelOu.id] = [visible[0].id];
              } else {
                break;
              }
            }
            setLevelSelections(initSel);
            setExpandedLevels(initExp);
            setAddOpen(true);
          }}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm {ou?.name?.toLowerCase() ?? "phòng ban"}
        </button>
      </div>

      {/* Add OUI dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              Thêm đơn vị —{" "}
              <span className="text-muted-foreground font-normal">{ou?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-8 py-2">
            <div className="grid gap-3">
              <Label className="text-xs text-muted-foreground">Tên đơn vị</Label>
              <Input
                className="placeholder:text-[12px]"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="VD: Marketing, HR..."
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            {ancestorChain.length > 0 && (
              <div className="grid gap-3">
                <Label className="text-xs text-muted-foreground">Đơn vị thuộc về</Label>
                <div className="grid gap-3">
                  {ancestorChain.map((levelOu, idx) => {
                    const levelOuis = getOuisAtLevel(idx);
                    const selected = levelSelections[levelOu.id] ?? [];
                    const isExpanded = expandedLevels.has(idx);
                    return (
                      <div key={levelOu.id}>
                        <button
                          type="button"
                          className="flex items-center gap-2 mb-1.5 w-full text-left hover:opacity-80 transition-opacity"
                          onClick={() =>
                            setExpandedLevels((prev) => {
                              const next = new Set(prev);
                              next.has(idx) ? next.delete(idx) : next.add(idx);
                              return next;
                            })
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-[11px] font-medium">{levelOu.name}</span>
                          {selected.length > 0 ? (
                            <span className="text-[10px] text-primary font-medium">
                              {selected.length} đã chọn
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 italic"></span>
                          )}
                        </button>
                        {isExpanded && (
                          <div className="rounded-md border max-h-48 overflow-y-auto p-1">
                            {levelOuis.length === 0 ? (
                              <p className="text-xs text-muted-foreground px-2 py-1.5 italic">Không có dữ liệu</p>
                            ) : (
                              levelOuis.map((o) => (
                                <button
                                  key={o.id}
                                  type="button"
                                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted"
                                  onClick={() => toggleAtLevel(levelOu.id, o.id, idx)}
                                >
                                  <div
                                    className={`h-4 w-4 rounded border flex items-center justify-center shrink-0
                                      ${selected.includes(o.id) ? "bg-primary border-primary" : "border-input"}`}
                                  >
                                    {selected.includes(o.id) && (
                                      <svg className="h-2.5 w-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-[12.5px]">{o.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Hủy</Button>
            <Button disabled={!addName.trim() || saving} onClick={handleAdd}>
              {saving ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
