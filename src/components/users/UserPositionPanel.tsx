/** UserPositionPanel: 4th-column detail panel for a selected position — members and document permissions. */
import { useState } from "react";
import { Check, ChevronDown, Mail, Plus, Trash2, Users, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { UserRecord } from "@/services/users.api";
import {
  OrgUnit,
  OrgUnitInstance,
  Position,
  assignUserToOui,
  changeUserPosition,
  unassignUserFromOui,
} from "@/services/org_units.api";
import { CLEARANCE_CLASS, CLEARANCE_LABELS, initials } from "./constants";

// Walk up parent_oui_ids to collect all ancestor OUI instances (BFS, deduped).
function getAncestorOuis(oui: OrgUnitInstance, allOuis: OrgUnitInstance[]): OrgUnitInstance[] {
  const result: OrgUnitInstance[] = [];
  const seen = new Set<string>([oui.id]);
  const queue = [...oui.parent_oui_ids];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const parent = allOuis.find((o) => o.id === id);
    if (parent) { result.push(parent); queue.push(...parent.parent_oui_ids); }
  }
  return result;
}

// Find all OUI instances that (transitively) list this OUI in their parent_oui_ids.
function getChildOuis(ouiId: string, allOuis: OrgUnitInstance[]): OrgUnitInstance[] {
  const result: OrgUnitInstance[] = [];
  const seen = new Set<string>([ouiId]);
  const direct = allOuis.filter((o) => o.parent_oui_ids.includes(ouiId));
  for (const child of direct) {
    if (seen.has(child.id)) continue;
    seen.add(child.id);
    result.push(child);
    getChildOuis(child.id, allOuis).forEach((c) => {
      if (!seen.has(c.id)) { seen.add(c.id); result.push(c); }
    });
  }
  return result;
}

// Build allowed (label, level) pairs:
//   ancestors → only public (level 1)
//   current + children → all levels up to position.clearance
function buildPermissionEntries(oui: OrgUnitInstance, clearance: number, allOuis: OrgUnitInstance[]) {
  const entries: { label: string; level: number }[] = [];
  for (const ancestor of getAncestorOuis(oui, allOuis)) {
    entries.push({ label: ancestor.name, level: 1 });
  }
  for (const node of [oui, ...getChildOuis(oui.id, allOuis)]) {
    for (let lvl = 1; lvl <= clearance; lvl++) {
      entries.push({ label: node.name, level: lvl });
    }
  }
  return entries;
}

export function UserPositionPanel({
  position,
  oui,
  ou,
  allUsers,
  allOuis,
  allOrgUnits,
  positions,
  token,
  onClose,
  onRefresh,
}: {
  position: Position;
  oui: OrgUnitInstance;
  ou: OrgUnit | null;
  allUsers: UserRecord[];
  allOuis: OrgUnitInstance[];
  allOrgUnits: OrgUnit[];
  positions: Position[];
  token: string | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [addingUser, setAddingUser] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (label: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  const assignedUsers = allUsers.filter((u) =>
    u.oui_positions.some((p) => p.oui_id === oui.id && p.position_id === position.id),
  );

  const getAncestorOuIds = (ouId: string): string[] => {
    const result: string[] = [];
    let cur = allOrgUnits.find((o) => o.id === ouId);
    while (cur?.parent_id) { result.push(cur.parent_id); cur = allOrgUnits.find((o) => o.id === cur!.parent_id); }
    return result;
  };
  const getDescendantOuIds = (ouId: string): string[] => {
    const result: string[] = [];
    const queue = allOrgUnits.filter((o) => o.parent_id === ouId).map((o) => o.id);
    while (queue.length > 0) {
      const id = queue.shift()!;
      result.push(id);
      allOrgUnits.filter((o) => o.parent_id === id).forEach((o) => queue.push(o.id));
    }
    return result;
  };

  const excludedOuIds = ou ? [...getAncestorOuIds(ou.id), ...getDescendantOuIds(ou.id)] : [];
  const availableUsers = allUsers.filter((u) => {
    if (u.oui_positions.some((p) => p.oui_id === oui.id)) return false;
    return !u.oui_positions.some((p) => excludedOuIds.includes(p.ou_id));
  });

  const compatiblePositions = positions.filter((p) => p.ou_id === position.ou_id);
  const permissionEntries = buildPermissionEntries(oui, position.clearance, allOuis);

  // Group entries by OUI label; each group shows only its highest level by default.
  const permissionGroups = (() => {
    const map = new Map<string, number[]>();
    for (const { label, level } of permissionEntries) {
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(level);
    }
    return Array.from(map.entries()).map(([label, levels]) => ({
      label,
      maxLevel: Math.max(...levels),
      levels: [...levels].sort((a, b) => a - b),
    }));
  })();

  const handleChangePosition = async (userId: string, newPositionId: string) => {
    setSaving(userId);
    try {
      await changeUserPosition(userId, oui.id, newPositionId, token);
      toast({ variant: "success", title: "Đã đổi vị trí" });
      onRefresh();
    } catch (err: any) { toast({ variant: "destructive", title: err.message }); }
    finally { setSaving(null); }
  };

  const handleRemove = async (userId: string) => {
    setSaving(userId);
    try {
      await unassignUserFromOui({ user_id: userId, oui_id: oui.id }, token);
      toast({ variant: "success", title: "Đã xóa khỏi đơn vị" });
      onRefresh();
    } catch (err: any) { toast({ variant: "destructive", title: err.message }); }
    finally { setSaving(null); }
  };

  const handleAdd = async (userId: string) => {
    setSaving(userId);
    try {
      await assignUserToOui({ user_id: userId, oui_id: oui.id, position_id: position.id }, token);
      toast({ variant: "success", title: "Đã thêm thành viên" });
      setAddingUser(false);
      onRefresh();
    } catch (err: any) { toast({ variant: "destructive", title: err.message }); }
    finally { setSaving(null); }
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-semibold text-sm truncate">{position.name}</span>
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 font-normal shrink-0 ${CLEARANCE_CLASS[position.clearance]}`}
          >
            {CLEARANCE_LABELS[position.clearance]}
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2 p-0.5 rounded hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto divide-y">
        {/* Thông tin chung */}
        <section className="px-4 py-3.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-3">
            Thông tin chung
          </h4>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Loại đơn vị</span>
              <span className="text-xs font-medium text-right">{ou?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Tên đơn vị</span>
              <span className="text-xs font-medium text-right">{oui.name}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Trạng thái</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                Đang hoạt động
              </span>
            </div>
          </div>
        </section>

        {/* Nhân viên */}
        <section className="px-4 py-3.5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide">
              Nhân viên ({assignedUsers.length})
            </h4>
            {!addingUser && (
              <button
                onClick={() => setAddingUser(true)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" />
                Thêm
              </button>
            )}
          </div>

          {/* Add picker */}
          {addingUser && (
            <div className="mb-3 rounded-lg border bg-muted/20 p-2 space-y-1.5">
              {availableUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Không có nhân viên phù hợp</p>
              ) : (
                <div className="max-h-36 overflow-y-auto divide-y rounded-md border bg-card">
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleAdd(u.id)}
                      disabled={saving === u.id}
                      className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/50 text-left"
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[9px]">{initials(u.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setAddingUser(false)}
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center py-0.5"
              >
                Hủy
              </button>
            </div>
          )}

          {assignedUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Chưa có thành viên nào</p>
          ) : (
            <div className="space-y-0.5">
              {assignedUsers.map((u) => {
                const currentPos = u.oui_positions.find((p) => p.oui_id === oui.id);
                return (
                  <div
                    key={u.id}
                    className="group flex items-center gap-2.5 py-2 px-1 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-[11px]">{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium truncate">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{oui.name}</p>
                    </div>
                    {/* Hover actions */}
                    <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                      <select
                        value={currentPos?.position_id ?? position.id}
                        onChange={(e) => handleChangePosition(u.id, e.target.value)}
                        disabled={saving === u.id}
                        className="h-6 w-[110px] text-[10px] px-1.5 rounded border border-input bg-background text-foreground cursor-pointer disabled:opacity-50"
                      >
                        {compatiblePositions.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleRemove(u.id)}
                        disabled={saving === u.id}
                        className="p-1 rounded text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {/* Email icon — visible when not hovering */}
                    <a
                      href={`mailto:${u.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="group-hover:hidden shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quyền xem tài liệu */}
        <section className="px-4 py-3.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide mb-3">
            Quyền xem tài liệu
          </h4>
          {permissionGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground">Không có quyền truy cập nào</p>
          ) : (
            <div className="space-y-0.5">
              {permissionGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.label);
                const hasMultiple = group.levels.length > 1;
                return (
                  <div key={group.label}>
                    {/* Summary row */}
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-foreground min-w-0 truncate mr-2">
                        {group.label}
                        <span className="text-muted-foreground"> - {CLEARANCE_LABELS[group.maxLevel]}</span>
                        {group.maxLevel > 1 && (
                          <span className="text-muted-foreground"> ↓</span>
                        )}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
                          <Check className="h-3 w-3" />
                          Cho phép
                        </span>
                        {hasMultiple && (
                          <button
                            onClick={() => toggleGroup(group.label)}
                            className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded: all levels */}
                    {isExpanded && (
                      <div className="ml-3 pl-2 border-l border-border space-y-0.5 mb-1">
                        {group.levels.map((level) => (
                          <div key={level} className="flex items-center justify-between py-0.5">
                            <span className="text-[11px] text-muted-foreground truncate mr-2">
                              {group.label} - {CLEARANCE_LABELS[level]}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-green-600 shrink-0">
                              <Check className="h-2.5 w-2.5" />
                              Cho phép
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
