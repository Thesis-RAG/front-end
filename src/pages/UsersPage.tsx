import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  Users,
  Network,
  UserCheck,
  UserX,
  X,
  ChevronRight,
  ChevronDown,
  Building2,
  FolderTree,
  Shield,
  Pencil,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchUsers,
  createUser,
  updateUser,
  UserRecord,
} from "@/services/users.api";
import {
  fetchOrgUnits,
  createOrgUnit,
  deleteOrgUnit,
  fetchOrgUnitInstances,
  createOrgUnitInstance,
  deleteOrgUnitInstance,
  fetchPositions,
  createPosition,
  updatePosition,
  assignUserToOui,
  unassignUserFromOui,
  OrgUnit,
  OrgUnitInstance,
  Position,
  changeUserPosition,
} from "@/services/org_units.api";

// ── Constants ─────────────────────────────────────────────────────────────────

const CLEARANCE_LABELS: Record<number, string> = {
  1: "Công khai",
  2: "Nội bộ",
  3: "Hạn chế",
  4: "Mật",
  5: "Tuyệt mật",
};

const CLEARANCE_CLASS: Record<number, string> = {
  1: "bg-sensitivity_level-public/15 text-sensitivity_level-public border border-sensitivity_level-public/40",
  2: "bg-sensitivity_level-internal/15 text-sensitivity_level-internal border border-sensitivity_level-internal/40",
  3: "bg-sensitivity_level-confidential/15 text-sensitivity_level-confidential border border-sensitivity_level-confidential/40",
  4: "bg-sensitivity_level-restricted/15 text-sensitivity_level-restricted border border-sensitivity_level-restricted/40",
  5: "bg-sensitivity_level-top_secret/15 text-sensitivity_level-top_secret border border-sensitivity_level-top_secret/40",
};

const initials = (n: string) =>
  n
    .split(" ")
    .map((x) => x[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

// ══════════════════════════════════════════════════════════════════════════════
// Page root
// ══════════════════════════════════════════════════════════════════════════════

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [userRefresh, setUserRefresh] = useState(0);
  const [orgRefresh, setOrgRefresh] = useState(0);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Người dùng & Tổ chức"
        description="Quản lý người dùng, cơ cấu tổ chức và phân quyền"
        actions={
          activeTab === "users" ? (
            <AddUserButton onCreated={() => setUserRefresh((n) => n + 1)} />
          ) : null
        }
      />
      <div className="flex-1 overflow-auto">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          <div className="border-b border-border px-6">
            <TabsList className="mt-2">
              <TabsTrigger value="users" className="gap-2 text-[12.5px]">
                <Users className="h-4 w-4" /> Người dùng
              </TabsTrigger>
              <TabsTrigger value="org" className="gap-2 text-[12.5px]">
                <Network className="h-4 w-4" /> Tổ chức
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="users" className="flex-1 p-6 mt-0">
            <UsersTab
              refreshTrigger={userRefresh}
              onOrgChange={() => setOrgRefresh((n) => n + 1)}
            />
          </TabsContent>
          <TabsContent value="org" className="flex-1 p-6 mt-0">
            <OrgTab refreshTrigger={orgRefresh} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// UsersTab
// ══════════════════════════════════════════════════════════════════════════════

function UsersTab({
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
  const [detailUser, setDetailUser] = useState<UserRecord | null>(null);
  const [assignDialog, setAssignDialog] = useState<UserRecord | null>(null);
  const [ouis, setOuis] = useState<OrgUnitInstance[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);

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
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  Không tìm thấy người dùng
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  {/* Name + email */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
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
                            <span className="text-primary">
                              {p.position_name}
                            </span>
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

                  {/* Status */}
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

                  {/* Actions */}
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

      <p className="text-sm text-muted-foreground ml-1">
        Đang hiển thị {filtered.length} / {users.length} người dùng
      </p>

      {/* Detail dialog */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Chi tiết người dùng</DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-[12.5px]">Tên</span>
                <span className="font-medium">{detailUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-[12.5px]">
                  Email
                </span>
                <span>{detailUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-[12.5px]">
                  Trạng thái
                </span>
                <div className="flex gap-1.5 items-center">
                  <div
                    className={`h-2 w-2 rounded-full ${detailUser.status === "active" ? "bg-green-500" : "bg-muted-foreground"}`}
                  />
                  <span>
                    {detailUser.status === "active"
                      ? "Đang hoạt động"
                      : "Không hoạt động"}
                  </span>
                </div>
              </div>
              {detailUser.oui_positions.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-[12.5px] mb-2">
                    Đơn vị & Vị trí
                  </p>
                  <div className="space-y-1.5">
                    {detailUser.oui_positions.map((p) => (
                      <div
                        key={p.oui_id}
                        className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-3 py-1.5 text-xs"
                      >
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {p.ou_name} /
                        </span>
                        <span className="font-medium">{p.oui_name}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-primary">{p.position_name}</span>
                        <Badge
                          variant="secondary"
                          className={`ml-auto text-[10px] px-1 py-0 ${CLEARANCE_CLASS[p.clearance]}`}
                        >
                          {CLEARANCE_LABELS[p.clearance]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailUser(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign OUI dialog */}
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

// ── AssignOuiDialog ───────────────────────────────────────────────────────────

function AssignOuiDialog({
  user,
  ouis,
  positions,
  orgUnits,
  token,
  onClose,
  onSuccess,
}: {
  user: UserRecord;
  ouis: OrgUnitInstance[];
  positions: Position[];
  orgUnits: OrgUnit[];
  token: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [ouiId, setOuiId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedOui = ouis.find((o) => o.id === ouiId);
  const compatiblePositions = selectedOui
    ? positions.filter((p) => p.ou_id === selectedOui.ou_id)
    : [];
  const getOuName = (ou_id: string) =>
    orgUnits.find((o) => o.id === ou_id)?.name ?? "";

  const handle = async () => {
    if (!ouiId || !positionId) return;
    setSaving(true);
    try {
      await assignUserToOui(
        { user_id: user.id, oui_id: ouiId, position_id: positionId },
        token,
      );
      toast({ variant: "success", title: "Đã gán thành công" });
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Gán vào đơn vị</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Gán <strong>{user.name}</strong> vào một đơn vị với vị trí cụ thể.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Đơn vị</Label>
            <Select
              value={ouiId}
              onValueChange={(v) => {
                setOuiId(v);
                setPositionId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn đơn vị" />
              </SelectTrigger>
              <SelectContent>
                {ouis.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    <span className="text-muted-foreground text-xs mr-1">
                      {getOuName(o.ou_id)} /
                    </span>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Vị trí</Label>
            <Select
              value={positionId}
              onValueChange={setPositionId}
              disabled={!ouiId || compatiblePositions.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !ouiId
                      ? "Chọn đơn vị trước"
                      : compatiblePositions.length === 0
                        ? "Không có vị trí nào"
                        : "Chọn vị trí"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {compatiblePositions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    <Badge
                      variant="secondary"
                      className={`ml-2 text-[10px] px-1 py-0 ${CLEARANCE_CLASS[p.clearance]}`}
                    >
                      {CLEARANCE_LABELS[p.clearance]}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button disabled={!ouiId || !positionId || saving} onClick={handle}>
            {saving ? "Đang gán..." : "Gán"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OrgTab — cây OU type, click vào OU để xem OUI + Position
// ══════════════════════════════════════════════════════════════════════════════

function OrgTab({ refreshTrigger }: { refreshTrigger?: number }) {
  const { token } = useAuth();
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [ouis, setOuis] = useState<OrgUnitInstance[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [innerRefresh, setInnerRefresh] = useState(0);
  const [selectedOuId, setSelectedOuId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedOuiId, setSelectedOuiId] = useState<string | null>(null);
  const selectedOui = selectedOuiId
    ? (ouis.find((o) => o.id === selectedOuiId) ?? null)
    : null;
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);

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

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedOu = orgUnits.find((o) => o.id === selectedOuId) ?? null;
  const filteredOuis = selectedOuId
    ? ouis.filter((o) => o.ou_id === selectedOuId)
    : [];
  const filteredPositions = selectedOuId
    ? positions.filter((p) => p.ou_id === selectedOuId)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Đang tải...
      </div>
    );
  }

  const rootOus = orgUnits.filter((o) => o.parent_id === null);

  const renderNode = (
    ou: OrgUnit,
    depth = 0,
    isLast = true,
  ): React.ReactNode => {
    const DEPTH_COLORS = [
      "border-gray-400 bg-gray-300 text-gray-700",
      "border-gray-400 bg-gray-200 text-gray-700",
      "border-gray-400 bg-gray-100 text-gray-700",
      "border-gray-400 bg-gray-50 text-gray-700",
      "border-gray-400 bg-gray-20 text-gray-700",
    ];

    const depthColor = DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
    const children = orgUnits.filter((o) => o.parent_id === ou.id);
    const hasChildren = children.length > 0;
    const isSelected = selectedOuId === ou.id;
    const isRoot = ou.parent_id === null;

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

    const paddingAt = (d: number) => d * 28 + 22;

    const lineX = paddingAt(depth - 1);

    return (
      <div key={ou.id} style={{ position: "relative" }}>
        <div
          className={`group relative flex items-center py-[9px] pr-2 cursor-pointer transition-colors rounded-sm
        ${isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}
          style={{ paddingLeft: `${paddingAt(depth)}px` }}
          onClick={() => setSelectedOuId(ou.id)}
        >
          {/* Thanh ngang nối vào node, chỉ cho non-root */}
          {!isRoot && (
            <>
              {/* Dọc: từ top xuống giữa (nửa trên) */}
              <span
                style={{
                  position: "absolute",
                  left: `${lineX}px`,
                  top: "-35%",
                  height: "85%",
                  width: "1.5px",
                  backgroundColor: "#000",
                }}
              />
              {/* Dọc: từ giữa xuống bottom — chỉ vẽ nếu KHÔNG phải node cuối */}
              {!isLast && (
                <span
                  style={{
                    position: "absolute",
                    left: `${lineX}px`,
                    top: "50%",
                    bottom: 0,
                    width: "1.5px",
                    backgroundColor: "#000",
                  }}
                />
              )}
              {/* Ngang */}
              <span
                style={{
                  position: "absolute",
                  left: `${lineX}px`,
                  top: "50%",
                  width: "32px",
                  height: "1.5px",
                  backgroundColor: "#000",
                }}
              />
            </>
          )}

          <span
            className={`text-[12.5px] select-none z-10 px-2 py-0.5 rounded-md border shrink-0 font-medium ${depthColor}`}
          >
            {ou.name}
          </span>

          <div className="flex-1" />

          {!isRoot && (
            <button
              onClick={handleDeleteOu}
              className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity shrink-0 ml-1 z-10"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        {hasChildren && (
          <div style={{ position: "relative" }}>
            {/* Thanh dọc từ top children xuống giữa node cuối cùng.
        Mỗi row cao khoảng 22px, nên giữa node cuối = 
        tổng chiều cao - 11px. Nhưng vì children có thể lồng nhau
        không biết trước chiều cao, dùng cách khác:
        vẽ thanh dọc suốt, để node cuối tự "cắt" bằng background */}
            {!isLast && (
              <span
                style={{
                  position: "absolute",
                  left: `${lineX}px`,
                  top: 0,
                  bottom: 0,
                  width: "1.5px",
                  backgroundColor: "#000",
                }}
              />
            )}
            {children.map((c, idx) => {
              const childIsLast = idx === children.length - 1;
              return renderNode(c, depth + 1, childIsLast);
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-6 h-full min-h-[500px]">
      {/* Cột trái: cây OU */}
      <div className="w-80 shrink-0 rounded-lg border border-border bg-card flex flex-col">
        <OuTreeHeader orgUnits={orgUnits} token={token} onRefresh={refresh} />
        <div className="flex-1 overflow-y-auto py-2 px-1">
          {rootOus.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              Chưa có loại đơn vị nào
            </p>
          ) : (
            rootOus.map((r, idx) =>
              renderNode(r, 0, idx === rootOus.length - 1),
            )
          )}
        </div>
      </div>

      {/* Cột phải: OUI + Position */}
      <div className="flex-1 flex flex-col gap-4">
        {!selectedOuId ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 rounded-lg border border-dashed border-border">
            <FolderTree className="h-10 w-10 opacity-30" />
            <p className="text-sm">
              Chọn một loại đơn vị bên trái để xem chi tiết
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">{selectedOu?.name}</h2>
              {selectedOu?.parent_id === null && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Gốc
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <OuiPanel
                ou={selectedOu}
                ouis={filteredOuis}
                allOuis={ouis}
                orgUnits={orgUnits}
                token={token}
                onRefresh={refresh}
                selectedOuiId={selectedOuiId}
                onSelectOui={setSelectedOuiId}
              />
              <PositionPanel
                ou={selectedOu}
                selectedOui={selectedOui}
                positions={filteredPositions}
                allUsers={allUsers}
                allOrgUnits={orgUnits}
                token={token}
                onRefresh={refresh}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── OuTreeHeader (nút thêm OU) ────────────────────────────────────────────────

function OuTreeHeader({
  orgUnits,
  token,
  onRefresh,
}: {
  orgUnits: OrgUnit[];
  token: string | null;
  onRefresh: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addParentId, setAddParentId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      await createOrgUnit(
        { name: addName.trim(), parent_id: addParentId || undefined },
        token,
      );
      toast({ variant: "success", title: `Đã tạo loại đơn vị "${addName}"` });
      setAddOpen(false);
      setAddName("");
      setAddParentId("");
      onRefresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Loại đơn vị
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => setAddOpen(true)}
          title="Thêm loại đơn vị"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Thêm loại đơn vị</DialogTitle>
          </DialogHeader>
          <div className="grid gap-8 py-2">
            <div className="grid gap-3">
              <Label className="text-xs text-muted-foreground">Tên</Label>
              <Input
                className="placeholder:text-[12px]"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="VD: Phòng ban, Chi nhánh, Nhóm..."
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="grid gap-3">
              <Label className="text-xs text-muted-foreground">
                Thuộc loại đơn vị
              </Label>
              <Select value={addParentId} onValueChange={setAddParentId}>
                <SelectTrigger className="text-[12px]">
                  <SelectValue placeholder="Công ty (mặc định)" />
                </SelectTrigger>
                <SelectContent>
                  {orgUnits.map((o) => (
                    <SelectItem className="text-[12px]" key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Hủy
            </Button>
            <Button disabled={!addName.trim() || saving} onClick={handleAdd}>
              {saving ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── OuiPanel ──────────────────────────────────────────────────────────────────

function OuiPanel({
  ou,
  ouis,
  allOuis,
  orgUnits,
  token,
  onRefresh,
  selectedOuiId, // ← thêm
  onSelectOui, // ← thêm
}: {
  ou: OrgUnit | null;
  ouis: OrgUnitInstance[];
  allOuis: OrgUnitInstance[];
  orgUnits: OrgUnit[];
  token: string | null;
  onRefresh: () => void;
  selectedOuiId: string | null; // ← thêm
  onSelectOui: (id: string) => void; // ← thêm
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addParentOuiIds, setAddParentOuiIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const parentTypeOuis = allOuis.filter((o) => o.ou_id === ou?.parent_id);

  const getOuName = (ou_id: string) =>
    orgUnits.find((o) => o.id === ou_id)?.name ?? ou_id;
  const getOuiName = (oui_id: string) =>
    allOuis.find((o) => o.id === oui_id)?.name ?? oui_id;

  const handleAdd = async () => {
    if (!addName.trim() || !ou) return;
    setSaving(true);
    try {
      await createOrgUnitInstance(
        { name: addName.trim(), ou_id: ou.id, parent_oui_ids: addParentOuiIds },
        token,
      );
      toast({ variant: "success", title: `Đã tạo đơn vị "${addName}"` });
      setAddOpen(false);
      setAddName("");
      setAddParentOuiIds([]);
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

  const toggleParent = (id: string) =>
    setAddParentOuiIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">Đơn vị</span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            {ouis.length}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto max-h-64">
        {ouis.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-muted-foreground gap-1">
            <p className="text-xs">Chưa có đơn vị nào</p>
            <button
              onClick={() => setAddOpen(true)}
              className="text-xs text-primary hover:underline"
            >
              + Thêm đơn vị
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {ouis.map((oui) => (
              <div
                key={oui.id}
                onClick={() => onSelectOui(oui.id)}
                className={`group flex items-start gap-2 px-4 py-2.5 cursor-pointer
    ${selectedOuiId === oui.id ? "bg-primary/10" : "hover:bg-muted/30"}`}
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{oui.name}</span>
                  {oui.parent_oui_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {oui.parent_oui_ids.map((pid) => (
                        <span
                          key={pid}
                          className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                        >
                          ↑ {getOuiName(pid)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(oui.id, oui.name)}
                  className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity mt-0.5 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              Thêm đơn vị —{" "}
              <span className="text-muted-foreground font-normal">
                {ou?.name}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-8 py-2">
            <div className="grid gap-3">
              <Label className="text-xs text-muted-foreground">
                Tên đơn vị
              </Label>
              <Input
                className="placeholder:text-[12px]"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="VD: Marketing, HR..."
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div className="grid gap-3">
              <Label className="text-xs text-muted-foreground">
                Đơn vị thuộc về
              </Label>
              <div className="rounded-md border max-h-32 overflow-y-auto p-1">
                {parentTypeOuis.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-1.5">
                    Không có đơn vị thuộc về phù hợp
                  </p>
                ) : (
                  parentTypeOuis.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted text-sm"
                      onClick={() => toggleParent(o.id)}
                    >
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center shrink-0
        ${addParentOuiIds.includes(o.id) ? "bg-primary border-primary" : "border-input"}`}
                      >
                        {addParentOuiIds.includes(o.id) && (
                          <svg
                            className="h-2.5 w-2.5 text-primary-foreground"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-[12.5px]">{o.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Hủy
            </Button>
            <Button disabled={!addName.trim() || saving} onClick={handleAdd}>
              {saving ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── PositionPanel ─────────────────────────────────────────────────────────────

function PositionPanel({
  ou,
  selectedOui, // ← thêm prop này
  positions,
  allUsers, // ← thêm prop này
  allOrgUnits, // ← thêm prop này (toàn bộ OU để tính ancestor/descendant)
  token,
  onRefresh,
}: {
  ou: OrgUnit | null;
  selectedOui: OrgUnitInstance | null; // ← thêm
  positions: Position[];
  allUsers: UserRecord[]; // ← thêm
  allOrgUnits: OrgUnit[]; // ← thêm
  token: string | null;
  onRefresh: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Position | null>(null);
  const [form, setForm] = useState({ name: "", clearance: "1" });
  const [saving, setSaving] = useState(false);
  const [openPositionId, setOpenPositionId] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openEdit = (pos: Position) => {
    setForm({ name: pos.name, clearance: String(pos.clearance) });
    setEditTarget(pos);
    setAddOpen(true);
  };

  const openAdd = () => {
    setForm({ name: "", clearance: "1" });
    setEditTarget(null);
    setAddOpen(true);
  };

  const handle = async () => {
    if (!form.name.trim() || !ou) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        ou_id: ou.id,
        clearance: Number(form.clearance),
      };
      if (editTarget) {
        await updatePosition(editTarget.id, payload, token);
        toast({ variant: "success", title: "Đã cập nhật vị trí" });
      } else {
        await createPosition(payload, token);
        toast({ variant: "success", title: `Đã tạo vị trí "${form.name}"` });
      }
      setAddOpen(false);
      onRefresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  const openedPosition = positions.find((p) => p.id === openPositionId) ?? null;

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold">Vị trí</span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
            {positions.length}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={openAdd}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto max-h-64">
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-muted-foreground gap-1">
            <p className="text-xs">Chưa có vị trí nào</p>
            <button
              onClick={openAdd}
              className="text-xs text-primary hover:underline"
            >
              + Thêm vị trí
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {positions.map((pos) => {
              // Đếm số user đang ở position này trong OUI này
              const userCount = allUsers.filter((u) =>
                u.oui_positions.some(
                  (p) =>
                    p.oui_id === selectedOui?.id && p.position_id === pos.id,
                ),
              ).length;

              return (
                <div
                  key={pos.id}
                  className="group flex items-center gap-2 px-4 py-2.5 hover:bg-muted/30"
                >
                  <span className="flex-1 text-[14px] font-semibold">
                    {pos.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 py-0 font-normal shrink-0 ${CLEARANCE_CLASS[pos.clearance]}`}
                  >
                    {CLEARANCE_LABELS[pos.clearance]}
                  </Badge>
                  {/* Badge số user */}
                  {selectedOui && (
                    <button
                      onClick={() => setOpenPositionId(pos.id)}
                      className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground shrink-0"
                      title="Xem thành viên"
                    >
                      <Users className="h-3 w-3" />
                      {userCount}
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(pos)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity shrink-0"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog thêm/sửa position */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? (
                "Chỉnh sửa vị trí"
              ) : (
                <>
                  Thêm vị trí —{" "}
                  <span className="text-muted-foreground font-normal">
                    {ou?.name}
                  </span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-8 py-2">
            <div className="grid gap-3">
              <Label className="text-xs text-muted-foreground">
                Tên vị trí
              </Label>
              <Input
                className="placeholder:text-[12.5px]"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="VD: Trưởng phòng, Nhân viên..."
                onKeyDown={(e) => e.key === "Enter" && handle()}
              />
            </div>
            <div className="grid gap-3">
              <Label className="text-xs text-muted-foreground">
                Cấp độ bảo mật
              </Label>
              <Select
                value={form.clearance}
                onValueChange={(v) => set("clearance", v)}
              >
                <SelectTrigger className="text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((c) => (
                    <SelectItem key={c} value={String(c)}>
                      <div className="flex items-center gap-2 text-[12.5px]">
                        <span className="text-muted-foreground w-2">{c}</span>
                        <span>{CLEARANCE_LABELS[c]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Hủy
            </Button>
            <Button disabled={!form.name.trim() || saving} onClick={handle}>
              {saving ? "Đang lưu..." : editTarget ? "Cập nhật" : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel thành viên */}
      {openedPosition && selectedOui && (
        <UserPositionPanel
          position={openedPosition}
          oui={selectedOui}
          ou={ou}
          allUsers={allUsers}
          allOrgUnits={allOrgUnits}
          positions={positions}
          token={token}
          onClose={() => setOpenPositionId(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// UserPositionPanel — dialog quản lý user trong 1 position của 1 OUI
// ══════════════════════════════════════════════════════════════════════════════

function UserPositionPanel({
  position,
  oui,
  ou,
  allUsers,
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
  allOrgUnits: OrgUnit[];
  positions: Position[];
  token: string | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [addingUser, setAddingUser] = useState(false);
  const [saving, setSaving] = useState<string | null>(null); // user_id đang saving

  // User hiện tại trong position này tại OUI này
  const assignedUsers = allUsers.filter((u) =>
    u.oui_positions.some(
      (p) => p.oui_id === oui.id && p.position_id === position.id,
    ),
  );

  // Tính ancestor + descendant OU ids (không tính OU hiện tại)
  const getAncestorIds = (ouId: string): string[] => {
    const result: string[] = [];
    let current = allOrgUnits.find((o) => o.id === ouId);
    while (current?.parent_id) {
      result.push(current.parent_id);
      current = allOrgUnits.find((o) => o.id === current!.parent_id);
    }
    return result;
  };

  const getDescendantIds = (ouId: string): string[] => {
    const result: string[] = [];
    const queue = allOrgUnits
      .filter((o) => o.parent_id === ouId)
      .map((o) => o.id);
    while (queue.length > 0) {
      const id = queue.shift()!;
      result.push(id);
      allOrgUnits
        .filter((o) => o.parent_id === id)
        .forEach((o) => queue.push(o.id));
    }
    return result;
  };

  const excludedOuIds = ou
    ? [...getAncestorIds(ou.id), ...getDescendantIds(ou.id)]
    : [];

  // User có thể thêm: chưa assigned vào OUI này, và không thuộc excluded OU
  const availableUsers = allUsers.filter((u) => {
    const alreadyInOui = u.oui_positions.some((p) => p.oui_id === oui.id);
    if (alreadyInOui) return false;
    const inExcludedOu = u.oui_positions.some((p) =>
      excludedOuIds.includes(p.ou_id),
    );
    return !inExcludedOu;
  });

  // Positions cùng OU để đổi
  const compatiblePositions = positions.filter(
    (p) => p.ou_id === position.ou_id,
  );

  const handleChangePosition = async (
    userId: string,
    newPositionId: string,
  ) => {
    setSaving(userId);
    try {
      await changeUserPosition(userId, oui.id, newPositionId, token);
      toast({ variant: "success", title: "Đã đổi vị trí" });
      onRefresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(null);
    }
  };

  const handleRemove = async (userId: string) => {
    setSaving(userId);
    try {
      await unassignUserFromOui({ user_id: userId, oui_id: oui.id }, token);
      toast({ variant: "success", title: "Đã xóa khỏi đơn vị" });
      onRefresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(null);
    }
  };

  const handleAdd = async (userId: string) => {
    setSaving(userId);
    try {
      await assignUserToOui(
        { user_id: userId, oui_id: oui.id, position_id: position.id },
        token,
      );
      toast({ variant: "success", title: "Đã thêm thành viên" });
      setAddingUser(false);
      onRefresh();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            {position.name}
            <span className="text-muted-foreground font-normal text-sm">
              — {oui.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Danh sách user đang giữ position này */}
          {assignedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chưa có thành viên nào
            </p>
          ) : (
            <div className="divide-y rounded-lg border border-border overflow-hidden">
              {assignedUsers.map((u) => {
                const currentPos = u.oui_positions.find(
                  (p) => p.oui_id === oui.id,
                );
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 px-3 py-2.5 bg-card"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {initials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </p>
                    </div>
                    {/* Dropdown đổi position */}
                    <Select
                      value={currentPos?.position_id ?? position.id}
                      onValueChange={(v) => handleChangePosition(u.id, v)}
                      disabled={saving === u.id}
                    >
                      <SelectTrigger className="h-7 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {compatiblePositions.map((p) => (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            className="text-xs"
                          >
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Nút xóa */}
                    <button
                      onClick={() => handleRemove(u.id)}
                      disabled={saving === u.id}
                      className="text-destructive opacity-60 hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Thêm user mới */}
          {!addingUser ? (
            <button
              onClick={() => setAddingUser(true)}
              className="w-full text-xs text-primary hover:underline text-center py-1"
            >
              + Thêm thành viên
            </button>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-2 space-y-1.5">
              {availableUsers.length !== 0 ? (
                <p className="text-xs text-muted-foreground px-1">
                  Chọn thành viên để thêm:
                </p>
              ) : null}
              {availableUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Không có nhân viên phù hợp với vị trí này
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y rounded-md border bg-card">
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleAdd(u.id)}
                      disabled={saving === u.id}
                      className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted/50 text-left"
                    >
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[9px]">
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {u.email}
                        </p>
                      </div>
                      {saving === u.id && (
                        <span className="text-[10px] text-muted-foreground">
                          ...
                        </span>
                      )}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── AddUserButton ─────────────────────────────────────────────────────────────

function AddUserButton({ onCreated }: { onCreated?: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = Object.values(form).every((v) => v.trim());

  const handle = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createUser(form, token);
      toast({ variant: "success", title: `Người dùng "${form.name}" đã tạo` });
      setOpen(false);
      setForm({ name: "", email: "", password: "" });
      onCreated?.();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Thêm người dùng
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Thêm người dùng</DialogTitle>
            <DialogDescription className="text-[12.5px]">
              Sau khi tạo, gán người dùng vào đơn vị và vị trí từ bảng danh
              sách.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Họ tên</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Nguyễn Văn A"
                className="placeholder:text-[12px]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="nva@company.com"
                className="placeholder:text-[12px]"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Mật khẩu</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button disabled={!canSubmit || saving} onClick={handle}>
              {saving ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
