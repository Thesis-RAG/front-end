/** UsersTab: searchable, filterable table of all users with status-toggle and OUI-assign actions. */
import { useState, useEffect } from "react";
import {
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
  X,
  ChevronRight,
  Building2,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUsers, updateUser, UserRecord } from "@/services/users.api";
import {
  fetchOrgUnits,
  fetchOrgUnitInstances,
  fetchPositions,
  unassignUserFromOui,
  OrgUnit,
  OrgUnitInstance,
  Position,
} from "@/services/org_units.api";
import { CLEARANCE_LABELS, CLEARANCE_CLASS, initials } from "./constants";
import { UserDetailDialog } from "./UserDetailDialog";
import { AssignOuiDialog } from "./AssignOuiDialog";

// Build a BFS index map for OUI instances: level by level, each level sorted A→Z.
// Result: root level → all level-2 nodes → all level-3 nodes → ...
function buildBfsOrder(ouis: OrgUnitInstance[]): Map<string, number> {
  const order = new Map<string, number>();
  const childrenOf = new Map<string, OrgUnitInstance[]>();
  const roots: OrgUnitInstance[] = [];

  for (const oui of ouis) {
    if (!oui.parent_oui_ids?.length) {
      roots.push(oui);
    } else {
      for (const pid of oui.parent_oui_ids) {
        if (!childrenOf.has(pid)) childrenOf.set(pid, []);
        childrenOf.get(pid)!.push(oui);
      }
    }
  }

  roots.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  for (const list of childrenOf.values()) list.sort((a, b) => a.name.localeCompare(b.name, "vi"));

  let counter = 0;
  const visited = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const oui = queue.shift()!;
    if (visited.has(oui.id)) continue;
    visited.add(oui.id);
    order.set(oui.id, counter++);
    for (const child of childrenOf.get(oui.id) ?? []) {
      if (!visited.has(child.id)) queue.push(child);
    }
  }
  return order;
}

const AVATAR_COLORS = [
  "bg-blue-500 text-white",
  "bg-violet-500 text-white",
  "bg-emerald-500 text-white",
  "bg-amber-500 text-white",
  "bg-rose-500 text-white",
  "bg-indigo-500 text-white",
  "bg-teal-500 text-white",
  "bg-orange-500 text-white",
  "bg-pink-500 text-white",
  "bg-cyan-500 text-white",
];

export function UsersTab({
  refreshTrigger,
  onOrgChange,
}: {
  refreshTrigger?: number;
  onOrgChange?: () => void;
}) {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterClearance, setFilterClearance] = useState("__all__");
  const [sortMode, setSortMode] = useState<"default" | "hierarchy" | "alpha">("hierarchy");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailUser, setDetailUser] = useState<UserRecord | null>(null);
  const [assignDialog, setAssignDialog] = useState<UserRecord | null>(null);
  const [ouis, setOuis] = useState<OrgUnitInstance[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);

  // Load users, OUIs, positions, and OU types in parallel.
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchUsers(token),
      fetchOrgUnitInstances(token),
      fetchPositions(token),
      fetchOrgUnits(token),
    ])
      .then(([u, o, p, ou]) => {
        setUsers(u);
        setOuis(o);
        setPositions(p);
        setOrgUnits(ou);
      })
      .catch(() =>
        toast({ variant: "destructive", title: "Không thể tải dữ liệu" }),
      )
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  // Toggle a user's active/inactive status.
  const handleStatusToggle = async (user: UserRecord) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      const updated = await updateUser(user.id, { status: newStatus }, token);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      toast({ variant: "success", title: "Cập nhật thành công" });
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    }
  };

  // Remove a user from an OUI.
  const handleUnassign = async (userId: string, ouiId: string) => {
    try {
      await unassignUserFromOui({ user_id: userId, oui_id: ouiId }, token);
      const updated = await fetchUsers(token);
      setUsers(updated);
      onOrgChange?.();
      toast({ variant: "success", title: "Đã gỡ khỏi đơn vị" });
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    }
  };

  const getOuName = (ou_id: string) =>
    orgUnits.find((o) => o.id === ou_id)?.name ?? ou_id;

  // Apply search + status + clearance filters.
  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchStatus = filterStatus === "__all__" || u.status === filterStatus;
    const matchClearance =
      filterClearance === "__all__" ||
      String(u.max_clearance) === filterClearance;
    return matchSearch && matchStatus && matchClearance;
  });

  // Sort filtered users by the chosen mode.
  const sorted = (() => {
    if (sortMode === "alpha") {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }
    if (sortMode === "hierarchy") {
      const bfsOrder = buildBfsOrder(ouis);
      return [...filtered].sort((a, b) => {
        // Pick the position whose OUI appears earliest in BFS (= highest level in org tree).
        const topA = a.oui_positions.reduce<typeof a.oui_positions[0] | null>(
          (acc, p) => {
            const pi = bfsOrder.get(p.oui_id) ?? Infinity;
            const ai = acc ? (bfsOrder.get(acc.oui_id) ?? Infinity) : Infinity;
            return pi < ai ? p : acc;
          }, null,
        );
        const topB = b.oui_positions.reduce<typeof b.oui_positions[0] | null>(
          (acc, p) => {
            const pi = bfsOrder.get(p.oui_id) ?? Infinity;
            const ai = acc ? (bfsOrder.get(acc.oui_id) ?? Infinity) : Infinity;
            return pi < ai ? p : acc;
          }, null,
        );
        const idxA = topA ? (bfsOrder.get(topA.oui_id) ?? Infinity) : Infinity;
        const idxB = topB ? (bfsOrder.get(topB.oui_id) ?? Infinity) : Infinity;
        if (idxA !== idxB) return idxA - idxB;
        return a.name.localeCompare(b.name, "vi");
      });
    }
    return filtered;
  })();

  // Reset to page 1 whenever filters/sort/search change.
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterStatus, filterClearance, sortMode, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function getPageNumbers(cur: number, total: number): (number | "…")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 4)          return [1, 2, 3, 4, 5, "…", total];
    if (cur >= total - 3)  return [1, "…", total-4, total-3, total-2, total-1, total];
    return [1, "…", cur - 1, cur, cur + 1, "…", total];
  }

  const activeFilterCount = [filterStatus, filterClearance].filter(
    (v) => v !== "__all__",
  ).length;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm người dùng..."
            className="pl-9 h-9 placeholder:text-[12.5px]"
          />
        </div>
        <div className="h-6 w-px bg-border" />

        <Select value={filterClearance} onValueChange={setFilterClearance}>
          <SelectTrigger
            className={`h-9 w-auto px-3 text-[12.5px] ${filterClearance !== "__all__" ? "border-primary bg-primary/5 text-primary" : ""}`}
          >
            <SelectValue placeholder="Cấp độ bảo mật" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả cấp độ</SelectItem>
            {[1, 2, 3, 4, 5].map((c) => (
              <SelectItem key={c} value={String(c)}>
                {CLEARANCE_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger
            className={`h-9 w-auto px-3 text-[12.5px] ${filterStatus !== "__all__" ? "border-primary bg-primary/5 text-primary" : ""}`}
          >
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="inactive">Không hoạt động</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-border" />

        <Select value={sortMode} onValueChange={(v) => setSortMode(v as typeof sortMode)}>
          <SelectTrigger
            className={`h-9 w-auto px-3 text-[12.5px] gap-1.5 ${sortMode !== "default" ? "border-primary bg-primary/5 text-primary" : ""}`}
          >
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Mặc định</SelectItem>
            <SelectItem value="hierarchy">Theo tổ chức</SelectItem>
            <SelectItem value="alpha">Theo alphabet (A–Z)</SelectItem>
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-muted-foreground hover:text-foreground gap-1.5"
            onClick={() => {
              setFilterStatus("__all__");
              setFilterClearance("__all__");
            }}
          >
            <X className="h-3.5 w-3.5" /> Clear
            <Badge
              variant="secondary"
              className="h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%] font-bold text-black">
                Người dùng
              </TableHead>
              <TableHead className="font-bold text-black">
                Đơn vị & Vị trí
              </TableHead>
              <TableHead className="font-bold text-black">Trạng thái</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Không tìm thấy người dùng
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user, idx) => (
                <TableRow key={user.id}>
                  {/* Name + email + corp badge */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className={`text-xs font-semibold ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium truncate">{user.name}</p>
                          {user.is_corp_member && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border border-amber-300"
                            >
                              Công ty
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* OUI positions with inline unassign button */}
                  <TableCell>
                    {user.oui_positions.length === 0 ? (
                      <span className="text-[12.5px] text-muted-foreground italic">
                        Chưa gán
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1 w-fit">
                        {user.oui_positions.map((p) => (
                          <div
                            key={p.oui_id}
                            className="group relative flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs w-fit whitespace-nowrap"
                          >
                            <span className="text-muted-foreground">
                              {getOuName(p.ou_id)} /
                            </span>
                            <span className="font-medium">{p.oui_name}</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-primary">{p.position_name}</span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 font-normal ml-1 ${CLEARANCE_CLASS[p.clearance]}`}
                            >
                              {CLEARANCE_LABELS[p.clearance]}
                            </Badge>
                            <button
                              onClick={() => handleUnassign(user.id, p.oui_id)}
                              className="ml-1 opacity-0 group-hover:opacity-100 text-destructive transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>

                  {/* Status indicator */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`h-2 w-2 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-muted-foreground"}`}
                      />
                      <span
                        className={`text-[13px] ${user.status !== "active" ? "text-muted-foreground" : ""}`}
                      >
                        {user.status === "active"
                          ? "Đang hoạt động"
                          : "Không hoạt động"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Actions dropdown */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailUser(user)}>
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAssignDialog(user)}>
                          <Building2 className="mr-2 h-4 w-4" /> Gán vào đơn vị
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === "active" ? (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleStatusToggle(user)}
                          >
                            <UserX className="mr-2 h-4 w-4" /> Ngừng hoạt động
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleStatusToggle(user)}
                          >
                            <UserCheck className="mr-2 h-4 w-4" /> Kích hoạt
                          </DropdownMenuItem>
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

      {/* Pagination footer */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <p className="ml-2 text-[12.5px] text-muted-foreground shrink-0">
          Hiển thị {sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1} đến {Math.min(safePage * pageSize, sorted.length)} trong tổng số {sorted.length.toLocaleString("vi-VN")} người dùng
        </p>

        <div className="flex items-center gap-1">
          <button
            disabled={safePage === 1}
            onClick={() => setCurrentPage(safePage - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors"
          >
            ‹
          </button>

          {getPageNumbers(safePage, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground">…</span>
            ) : (
              <button
                key={p}
                onClick={() => setCurrentPage(p as number)}
                className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                  p === safePage
                    ? "bg-black text-white border-black"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            disabled={safePage === totalPages}
            onClick={() => setCurrentPage(safePage + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm text-muted-foreground disabled:opacity-40 hover:bg-muted transition-colors"
          >
            ›
          </button>

          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="ml-2 h-8 w-[110px] px-3 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / trang</SelectItem>
              <SelectItem value="20">20 / trang</SelectItem>
              <SelectItem value="50">50 / trang</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <UserDetailDialog user={detailUser} onClose={() => setDetailUser(null)} />

      {assignDialog && (
        <AssignOuiDialog
          user={assignDialog}
          ouis={ouis}
          positions={positions}
          orgUnits={orgUnits}
          token={token}
          onClose={() => setAssignDialog(null)}
          onSuccess={async () => {
            setAssignDialog(null);
            const updated = await fetchUsers(token);
            setUsers(updated);
            onOrgChange?.();
          }}
        />
      )}
    </div>
  );
}
