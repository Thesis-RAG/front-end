/** OrgTab: 3-column org browser — OU type tree | OUI instance cards | Position cards. */
import { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  FolderTree,
  GitFork,
  Layers,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchOrgUnits,
  fetchOrgUnitInstances,
  fetchPositions,
  deleteOrgUnit,
  OrgUnit,
  OrgUnitInstance,
  Position,
} from "@/services/org_units.api";
import { fetchUsers, UserRecord } from "@/services/users.api";
import { OuTreeHeader } from "./OuTreeHeader";
import { OuiPanel } from "./OuiPanel";
import { PositionPanel } from "./PositionPanel";
import { UserPositionPanel } from "./UserPositionPanel";

// Icon and text color per depth level in the OU tree.
const DEPTH_STYLES = [
  { Icon: Building2,  text: "text-cyan-500" },
  { Icon: GitFork,    text: "text-blue-500" },
  { Icon: Layers,     text: "text-amber-500" },
  { Icon: Users,      text: "text-purple-500" },
  { Icon: FolderTree, text: "text-rose-500" },
];

export function OrgTab({ refreshTrigger }: { refreshTrigger?: number }) {
  const { token } = useAuth();
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [ouis, setOuis] = useState<OrgUnitInstance[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOuId, setSelectedOuId] = useState<string | null>(null);
  const [selectedOuiId, setSelectedOuiId] = useState<string | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [treeSearch, setTreeSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [addOuOpen, setAddOuOpen] = useState(false);

  // Reload all org data from the API.
  const refresh = async () => {
    const [ou, oui, pos, users] = await Promise.all([
      fetchOrgUnits(token),
      fetchOrgUnitInstances(token),
      fetchPositions(token),
      fetchUsers(token),
    ]);
    setOrgUnits(ou);
    setOuis(oui);
    setPositions(pos);
    setAllUsers(users);
  };

  // Initial load and re-load when the parent triggers a refresh.
  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() =>
        toast({
          variant: "destructive",
          title: "Không thể tải dữ liệu tổ chức",
        }),
      )
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  // Auto-expand any newly loaded nodes (preserves manually collapsed state).
  useEffect(() => {
    if (orgUnits.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        orgUnits.forEach((o) => next.add(o.id));
        return next;
      });
    }
  }, [orgUnits]);

  const selectedOu = orgUnits.find((o) => o.id === selectedOuId) ?? null;
  const selectedOui = selectedOuiId
    ? (ouis.find((o) => o.id === selectedOuiId) ?? null)
    : null;
  const filteredOuis = selectedOuId
    ? ouis.filter((o) => o.ou_id === selectedOuId)
    : [];
  const filteredPositions = selectedOuId
    ? positions.filter((p) => p.ou_id === selectedOuId)
    : [];
  const openedPosition =
    selectedPositionId && selectedOuiId
      ? filteredPositions.find((p) => p.id === selectedPositionId) ?? null
      : null;

  // Compute which OU IDs match the search query, including their ancestors.
  const visibleOuIds = useMemo((): Set<string> => {
    if (!treeSearch.trim()) return new Set(orgUnits.map((o) => o.id));
    const q = treeSearch.toLowerCase();
    const matchIds = new Set(
      orgUnits.filter((o) => o.name.toLowerCase().includes(q)).map((o) => o.id),
    );
    const visible = new Set(matchIds);
    for (const id of matchIds) {
      let cur = orgUnits.find((o) => o.id === id);
      while (cur?.parent_id) {
        visible.add(cur.parent_id);
        cur = orgUnits.find((o) => o.id === cur!.parent_id);
      }
    }
    return visible;
  }, [orgUnits, treeSearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Đang tải...
      </div>
    );
  }

  const rootOus = orgUnits.filter((o) => o.parent_id === null);

  // Toggle a node's expanded/collapsed state.
  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Recursive tree node with icon, chevron, and vertical connector line below chevron.
  const renderNode = (ou: OrgUnit, depth = 0): ReactNode => {
    if (!visibleOuIds.has(ou.id)) return null;

    const style = DEPTH_STYLES[Math.min(depth, DEPTH_STYLES.length - 1)];
    const { Icon, text } = style;
    const children = orgUnits.filter((o) => o.parent_id === ou.id);
    const hasChildren = children.length > 0;
    const isSelected = selectedOuId === ou.id;
    const isExpanded = expandedIds.has(ou.id);
    const isRoot = ou.parent_id === null;

    // X center of this node's own chevron minus 1 so the 2px line is centered under it.
    const chevronCenterX = depth * 18 + 6 + 10 - 1;

    const handleDeleteOu = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm(`Xóa loại đơn vị "${ou.name}"?`)) return;
      try {
        await deleteOrgUnit(ou.id, token);
        toast({ variant: "success", title: "Đã xóa" });
        refresh();
      } catch (err: any) {
        toast({ variant: "destructive", title: err.message });
      }
    };

    return (
      <div key={ou.id}>
        <div
          className={`group flex items-center gap-1.5 py-1.5 pr-2 rounded-md cursor-pointer transition-colors
            ${isSelected ? "bg-primary/10" : "hover:bg-muted/50"}`}
          style={{ paddingLeft: `${depth * 18 + 6}px` }}
          onClick={() => {
            setSelectedOuId(ou.id);
            setSelectedOuiId(null);
            setSelectedPositionId(null);
          }}
        >
          {/* Expand / collapse chevron */}
          <button
            onClick={(e) => toggleExpand(e, ou.id)}
            className={`h-5 w-5 flex items-center justify-center rounded hover:bg-muted/80 shrink-0 transition-opacity
              ${hasChildren ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {/* Colored icon */}
          <Icon className={`h-4 w-4 shrink-0 ${text}`} />

          {/* Node name */}
          <span
            className={`flex-1 text-[13px] truncate ${isSelected ? "font-semibold text-primary" : "text-foreground"}`}
          >
            {ou.name}
          </span>

          {/* Delete button — only visible on hover, hidden for root */}
          {!isRoot && (
            <button
              onClick={handleDeleteOu}
              className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity shrink-0 p-0.5 rounded hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Children — vertical line runs directly below this node's chevron, from first child to last */}
        {hasChildren && isExpanded && (
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: chevronCenterX,
                top: 10,
                bottom: 10,
                width: 2,
                backgroundColor: "hsl(var(--border))",
                pointerEvents: "none",
              }}
            />
            {children.map((c) => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const show4 = !!(openedPosition && selectedOui);

  return (
    <div className="flex h-full min-h-[500px] rounded-lg border border-border overflow-hidden">
      {/* Left area: columns 1–3 with optional breadcrumb on top */}
      <div className={`${show4 ? "flex-[3]" : "flex-1"} flex flex-col min-w-0`}>
        {/* Breadcrumb — spans cols 1–3, only visible when col 4 is open */}
        {show4 && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-b bg-muted/20 shrink-0 overflow-hidden">
            {selectedOu && (
              <span className="text-xs text-muted-foreground truncate shrink-0 max-w-[30%]">
                {selectedOu.name}
              </span>
            )}
            {selectedOui && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate shrink-0 max-w-[30%]">
                  {selectedOui.name}
                </span>
              </>
            )}
            {openedPosition && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">
                  {openedPosition.name}
                </span>
              </>
            )}
          </div>
        )}

        {/* 3-column row */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Column 1: OU type tree */}
          <div className="flex-1 min-w-[180px] border-r border-border bg-card flex flex-col">
            {/* Header */}
            <div className="px-4 pt-3 flex-shrink-0">
              <h3 className="text-sm font-semibold">Cây tổ chức</h3>
            </div>

            {/* Search */}
            <div className="px-3 py-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  className="h-9 pl-8 text-xs placeholder:text-muted-foreground placeholder:text-[12px]"
                  placeholder="Tìm đơn vị..."
                  value={treeSearch}
                  onChange={(e) => setTreeSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto py-2 px-2">
              {rootOus.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">
                  Chưa có loại đơn vị nào
                </p>
              ) : (
                rootOus.map((r) => renderNode(r, 0))
              )}
            </div>

            {/* Footer add trigger */}
            <div className="px-4 py-3 border-t flex-shrink-0">
              <button
                onClick={() => setAddOuOpen(true)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm đơn vị
              </button>
            </div>
          </div>

          {/* Add OU dialog (portal — DOM position irrelevant) */}
          <OuTreeHeader
            orgUnits={orgUnits}
            token={token}
            onRefresh={refresh}
            open={addOuOpen}
            onOpenChange={setAddOuOpen}
          />

          {!selectedOuId ? (
            /* Empty state when no OU selected */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 bg-card">
              <FolderTree className="h-10 w-10 opacity-30" />
              <p className="text-sm">Chọn một loại đơn vị bên trái để xem chi tiết</p>
            </div>
          ) : (
            <>
              {/* Column 2: OUI instance cards */}
              <div className="flex-1 min-w-[180px] border-r border-border flex flex-col bg-card">
                <OuiPanel
                  ou={selectedOu}
                  ouis={filteredOuis}
                  allOuis={ouis}
                  allOrgUnits={orgUnits}
                  allUsers={allUsers}
                  positions={filteredPositions}
                  token={token}
                  onRefresh={refresh}
                  selectedOuiId={selectedOuiId}
                  onSelectOui={(id) => {
                    setSelectedOuiId(id);
                    // Keep existing position; auto-select first if nothing selected yet
                    if (!selectedPositionId && filteredPositions.length > 0) {
                      setSelectedPositionId(filteredPositions[0].id);
                    }
                  }}
                />
              </div>

              {/* Column 3: Position cards */}
              <div className="flex-1 min-w-0 flex flex-col bg-card">
                <PositionPanel
                  ou={selectedOu}
                  selectedOui={selectedOui}
                  positions={filteredPositions}
                  allUsers={allUsers}
                  allOrgUnits={orgUnits}
                  token={token}
                  onRefresh={refresh}
                  selectedPositionId={selectedPositionId}
                  onSelectPosition={setSelectedPositionId}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Column 4: Position detail — sibling of left area, no breadcrumb above */}
      {show4 && (
        <div className="flex-1 border-l border-border flex flex-col min-w-0 bg-card">
          <UserPositionPanel
            position={openedPosition!}
            oui={selectedOui!}
            ou={selectedOu}
            allUsers={allUsers}
            allOuis={ouis}
            allOrgUnits={orgUnits}
            positions={filteredPositions}
            token={token}
            onClose={() => setSelectedPositionId(null)}
            onRefresh={refresh}
          />
        </div>
      )}
    </div>
  );
}
