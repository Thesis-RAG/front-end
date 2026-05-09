import { useState, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  MoreHorizontal,
  FolderKanban,
  Users,
  Building2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
} from "@/components/ui/select"; // ← đúng source
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchDepartments,
  createDepartment,
  Department,
} from "@/services/departments.api";
import {
  fetchProjects,
  fetchProjectUsers,
  updateProjectDepartment,
  updateProjectUsers,
  createProject,
  Project,
  ProjectUser,
} from "@/services/projects.api";
import { Check } from "lucide-react";
import {
  fetchUsers,
  fetchRoles,
  fetchClearanceLevels,
  createUser,
  updateUser,
  UserRecord,
  RoleRecord,
  ClearanceRecord,
} from "@/services/users.api";

const roleLabels: Record<string, string> = {
  admin_auditor: "Quản trị viên",
  director: "Giám đốc",
  department_manager: "Quản lý phòng ban",
  employee: "Nhân viên",
};

const clearanceLabels: Record<string, string> = {
  public: "Công khai",
  internal: "Nội bộ",
  confidential: "Hạn chế",
  restricted: "Mật",
  top_secret: "Tuyệt mật",
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [deptRefresh, setDeptRefresh] = useState(0);
  const [projectRefresh, setProjectRefresh] = useState(0);
  const [userRefresh, setUserRefresh] = useState(0);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Người dùng & Truy cập"
        description="Quản lý người dùng, dự án và phòng ban"
        actions={
          activeTab === "users" ? (
            <AddUserButton onCreated={() => setUserRefresh((n) => n + 1)} />
          ) : activeTab === "departments" ? (
            <AddDepartmentButton
              onCreated={() => setDeptRefresh((n) => n + 1)}
            />
          ) : activeTab === "projects" ? (
            <AddProjectButton
              onCreated={() => setProjectRefresh((n) => n + 1)}
            />
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
              <TabsTrigger value="projects" className="gap-2 text-[12.5px]">
                <FolderKanban className="h-4 w-4" /> Dự án
              </TabsTrigger>
              <TabsTrigger value="departments" className="gap-2 text-[12.5px]">
                <Building2 className="h-4 w-4" /> Phòng ban
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="flex-1 p-6 mt-0">
            <UsersTab refreshTrigger={userRefresh} />
          </TabsContent>
          <TabsContent value="projects" className="flex-1 p-6 mt-0">
            {" "}
            <ProjectsTab refreshTrigger={projectRefresh} />
          </TabsContent>
          <TabsContent value="departments" className="flex-1 p-6 mt-0">
            <DepartmentsTab refreshTrigger={deptRefresh} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── UsersTab ──────────────────────────────────────────────────────────────────
function UsersTab({ refreshTrigger }: { refreshTrigger?: number }) {
  const ROLE_ORDER: Record<string, number> = {
    admin_auditor: 0,
    director: 1,
    department_manager: 2,
    employee: 3,
  };
  const clearanceClass = (level: string) => {
    switch (level) {
      case "public":
        return "bg-sensitivity_level-public/15 text-sensitivity_level-public border border-sensitivity_level-public/40 hover:bg-sensitivity_level-public/25";
      case "internal":
        return "bg-sensitivity_level-internal/15 text-sensitivity_level-internal border border-sensitivity_level-internal/40 hover:bg-sensitivity_level-internal/25";
      case "confidential":
        return "bg-sensitivity_level-confidential/15 text-sensitivity_level-confidential border border-sensitivity_level-confidential/40 hover:bg-sensitivity_level-confidential/25";
      case "restricted":
        return "bg-sensitivity_level-restricted/15 text-sensitivity_level-restricted border border-sensitivity_level-restricted/40 hover:bg-sensitivity_level-restricted/25";
      case "top_secret":
        return "bg-sensitivity_level-top_secret/15 text-sensitivity_level-top_secret border border-sensitivity_level-top_secret/40 hover:bg-sensitivity_level-top_secret/25";
      default:
        return "";
    }
  };
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [clearances, setClearances] = useState<ClearanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailUser, setDetailUser] = useState<UserRecord | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchUsers(token),
      fetchDepartments(token),
      fetchRoles(token),
      fetchClearanceLevels(token),
    ])
      .then(([u, d, r, c]) => {
        setUsers(u);
        setDepartments(d);
        setRoles(r);
        setClearances(c);
      })
      .catch(() =>
        toast({ variant: "destructive", title: "Failed to load users" }),
      )
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const handleUpdateField = async (
    userId: string,
    field: "role" | "clearance_level" | "status" | "department_id",
    value: string,
  ) => {
    try {
      const updated = await updateUser(userId, { [field]: value }, token);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, ...updated, department_names: u.department_name }
            : u,
        ),
      );
      toast({ variant: "success", title: "Updated successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    }
  };

  // Thêm state filter
  const [filterRole, setFilterRole] = useState("__all__");
  const [filterDept, setFilterDept] = useState("__all__");
  const [filterClearance, setFilterClearance] = useState("__all__");
  const [filterStatus, setFilterStatus] = useState("__all__");

  // Cập nhật filtered (thay thế cái cũ)
  const filtered = users
    .filter((u) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q);
      const matchRole = filterRole === "__all__" || u.role === filterRole;
      const matchDept =
        filterDept === "__all__" || u.department_name === filterDept;
      const matchClearance =
        filterClearance === "__all__" || u.clearance_level === filterClearance;
      const matchStatus =
        filterStatus === "__all__" || u.status === filterStatus;
      return (
        matchSearch && matchRole && matchDept && matchClearance && matchStatus
      );
    })
    .sort((a, b) => {
      const roleA = ROLE_ORDER[a.role] ?? 99;
      const roleB = ROLE_ORDER[b.role] ?? 99;
      if (roleA !== roleB) return roleA - roleB;
      return a.name.localeCompare(b.name);
    });

  const activeFilterCount = [
    filterRole,
    filterDept,
    filterClearance,
    filterStatus,
  ].filter((v) => v !== "__all__").length;

  const initials = (n: string) =>
    n
      .split(" ")
      .map((x) => x[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="space-y-4">
      {/* Search + Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm người dùng..."
            className="pl-9 h-9 placeholder:text-[12.5px]"
          />
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Role filter */}
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger
            className={`h-9 w-auto gap-1.5 px-3 text-[12.5px] ${
              filterRole !== "__all__"
                ? "border-primary bg-primary/5 text-primary"
                : ""
            }`}
          >
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="__all__">Tất cả vai trò</SelectItem>

            {roles.map((r) => (
              <SelectItem key={r.id} value={r.name}>
                {roleLabels[r.name] || r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Department filter */}
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger
            className={`h-9 w-auto gap-1.5 px-3 text-[12.5px] ${filterDept !== "__all__" ? "border-primary text-primary bg-primary/5" : ""}`}
          >
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả phòng ban</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.name}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clearance filter */}
        <Select value={filterClearance} onValueChange={setFilterClearance}>
          <SelectTrigger
            className={`h-9 w-auto gap-1.5 px-3 text-[12.5px] ${filterClearance !== "__all__" ? "border-primary text-primary bg-primary/5" : ""}`}
          >
            <SelectValue placeholder="Clearance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả cấp độ</SelectItem>

            {clearances.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {clearanceLabels[c.name] || c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger
            className={`h-9 w-auto gap-1.5 px-3 text-[12.5px] ${filterStatus !== "__all__" ? "border-primary text-primary bg-primary/5" : ""}`}
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="inactive">Không hoạt động</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters button — chỉ hiện khi có filter */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-muted-foreground hover:text-foreground gap-1.5"
            onClick={() => {
              setFilterRole("__all__");
              setFilterDept("__all__");
              setFilterClearance("__all__");
              setFilterStatus("__all__");
            }}
          >
            <X className="h-3.5 w-3.5" />
            Clear
            <Badge
              variant="secondary"
              className="h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Result count */}
      {(searchQuery || activeFilterCount > 0) && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} user{filtered.length !== 1 ? "s" : ""} found
        </p>
      )}

      <div className="rounded-lg border border-border bg-card">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="">
              <TableHead className="w-[40%] font-bold text-black">
                Người dùng
              </TableHead>
              <TableHead className="w-[12%] font-bold text-black">
                Vai trò
              </TableHead>
              <TableHead className="w-[12%] font-bold text-black">
                Phòng ban
              </TableHead>
              <TableHead className="w-[10%] font-bold text-black">
                Cấp độ
              </TableHead>
              <TableHead className="w-[7%] font-bold text-black">
                Trạng thái
              </TableHead>
              <TableHead className="w-[4%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(v) =>
                        handleUpdateField(user.id, "role", v)
                      }
                    >
                      <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden">
                        <Badge
                          variant="secondary"
                          className="cursor-pointer font-normal hover:bg-gray-300"
                        >
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </SelectTrigger>

                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.name}>
                            {roleLabels[r.name] || r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.department_id ?? ""}
                      onValueChange={(v) =>
                        handleUpdateField(user.id, "department_id", v)
                      }
                    >
                      <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden">
                        <Badge
                          variant="secondary"
                          className="cursor-pointer hover:bg-gray-300 font-normal"
                        >
                          <SelectValue placeholder="—" />
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.clearance_level}
                      onValueChange={(v) =>
                        handleUpdateField(user.id, "clearance_level", v)
                      }
                    >
                      <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden">
                        <Badge
                          variant="secondary"
                          className={`cursor-pointer font-normal ${clearanceClass(
                            user.clearance_level,
                          )}`}
                        >
                          {clearanceLabels[user.clearance_level] ||
                            user.clearance_level}
                        </Badge>
                      </SelectTrigger>

                      <SelectContent>
                        {clearances.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {clearanceLabels[c.name] || c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`h-2 w-2 rounded-full ${user.status === "active" ? "bg-green-500" : "bg-muted-foreground"}`}
                      />
                      <span
                        className={`text-[13px] ${user.status !== "active" ? "text-muted-foreground" : ""}`}
                      >
                        {user.status === "active"
                          ? "Hiệu lực"
                          : "Không hiệu lực"}
                      </span>
                    </div>
                  </TableCell>
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
                        <DropdownMenuSeparator />
                        {user.status === "active" ? (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              handleUpdateField(user.id, "status", "inactive")
                            }
                          >
                            <UserX className="mr-2 h-4 w-4" /> Ngừng hoạt động
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateField(user.id, "status", "active")
                            }
                          >
                            <UserCheck className="mr-2 h-4 w-4" /> Activate
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

      {/* Detail popup */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Chi tiết người dùng</DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tên</span>
                <span className="font-medium">{detailUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{detailUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vai trò</span>

                <Badge variant="secondary">
                  {roleLabels[detailUser.role] || detailUser.role}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Cấp độ</span>

                <Badge variant="secondary">
                  {clearanceLabels[detailUser.clearance_level] ||
                    detailUser.clearance_level}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phòng ban</span>
                <span className="text-right text-sm">
                  {detailUser.department_name ?? "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trạng thái</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`h-2 w-2 rounded-full ${detailUser.status === "active" ? "bg-green-500" : "bg-muted-foreground"}`}
                  />
                  <span className="text-[13px]">
                    {detailUser.status === "active"
                      ? "Hiệu lực"
                      : "Không hiệu lực"}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailUser(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── ProjectsTab ───────────────────────────────────────────────────────────────
function ProjectsTab({ refreshTrigger }: { refreshTrigger?: number }) {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDeptId, setFilterDeptId] = useState("__all__");

  const [deptSearch, setDeptSearch] = useState("");
  const [openDeptId, setOpenDeptId] = useState<string | null>(null);

  const [openUsersId, setOpenUsersId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [availableUsers, setAvailableUsers] = useState<UserRecord[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [savingUsers, setSavingUsers] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchUser, setSearchUser] = useState("");

  const filteredProjects = projects.filter((p) => {
    const matchName =
      !searchName || p.name.toLowerCase().includes(searchName.toLowerCase());
    const matchDept =
      filterDeptId === "__all__" || p.department_id === filterDeptId;
    return matchName && matchDept;
  });

  // ← Thêm 2 ref, giống UsersTab
  const deptDropdownRef = useRef<HTMLDivElement | null>(null);
  const userDropdownRef = useRef<HTMLDivElement | null>(null);

  // ← Đóng dropdown khi click ra ngoài, giống UsersTab
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        deptDropdownRef.current &&
        !deptDropdownRef.current.contains(e.target as Node)
      )
        setOpenDeptId(null);
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target as Node)
      )
        setOpenUsersId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [p, d] = await Promise.all([
        fetchProjects(
          token,
          filterDeptId === "__all__" ? undefined : filterDeptId,
        ),
        fetchDepartments(token),
      ]);
      setProjects(p);
      setDepartments(d);
    } catch {
      toast({ variant: "destructive", title: "Failed to load projects" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterDeptId, refreshTrigger]);

  const getDeptName = (id: string) =>
    departments.find((d) => d.id === id)?.name ?? id;

  const handleOpenDept = (projectId: string) => {
    setDeptSearch("");
    setOpenDeptId(openDeptId === projectId ? null : projectId);
    setOpenUsersId(null);
  };

  const handleChangeDept = async (projectId: string, deptId: string) => {
    try {
      const updated = await updateProjectDepartment(projectId, deptId, token);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updated : p)),
      );
      toast({ variant: "success", title: "Department updated" });
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    }
    setOpenDeptId(null);
  };

  const handleOpenUsers = async (proj: Project) => {
    if (openUsersId === proj.id) {
      setOpenUsersId(null);
      return;
    }
    setUserSearch("");
    setOpenDeptId(null);
    try {
      const [allUsers, projUsers] = await Promise.all([
        fetchUsers(token),
        fetchProjectUsers(proj.id, token),
      ]);
      setAvailableUsers(
        allUsers.filter(
          (u) => u.role !== "admin_auditor" && u.role !== "director",
        ),
      );
      setSelectedUserIds(new Set(projUsers.map((u) => u.id)));
      setOpenUsersId(proj.id);
    } catch {
      toast({ variant: "destructive", title: "Failed to load users" });
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const handleSaveUsers = async (projectId: string) => {
    setSavingUsers(true);
    try {
      const updated = await updateProjectUsers(
        projectId,
        [...selectedUserIds],
        token,
      );
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updated : p)),
      );
      toast({ variant: "success", title: "Users updated" });
      setOpenUsersId(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSavingUsers(false);
    }
  };

  // ← Bỏ điều kiện length < 2, luôn hiển thị list (giống UsersTab)
  const filteredDepts = departments.filter(
    (d) =>
      !deptSearch || d.name.toLowerCase().includes(deptSearch.toLowerCase()),
  );

  const filteredUsers = availableUsers.filter(
    (u) =>
      !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()),
  );

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search by name */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Tìm kiếm dự án..."
            className="pl-9 h-9 placeholder:text-[12.5px]"
          />
        </div>

        {/* Search by user */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            placeholder="Lọc theo nhân viên..."
            className="pl-9 h-9 placeholder:text-[12.5px]"
          />
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Department select */}
        <Select value={filterDeptId} onValueChange={setFilterDeptId}>
          <SelectTrigger
            className={`h-9 w-auto px-3 text-[12.5px] ${filterDeptId !== "__all__" ? "border-primary text-primary bg-primary/5" : ""}`}
          >
            <Building2 className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tất cả phòng ban</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(searchName || searchUser || filterDeptId !== "__all__") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-muted-foreground gap-1.5"
            onClick={() => {
              setSearchName("");
              setSearchUser("");
              setFilterDeptId("__all__");
            }}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70%] font-bold text-black">
                Dự án
              </TableHead>
              <TableHead className="w-[15%] font-bold text-black">
                Phòng ban
              </TableHead>
              <TableHead className="w-[15%] font-bold text-black">
                Nhân viên
              </TableHead>
              <TableHead className="w-[5%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  Không tìm thấy dự án 
                </TableCell>
              </TableRow>
            ) : (
              projects.map((proj) => (
                <TableRow key={proj.id}>
                  <TableCell className="font-medium">{proj.name}</TableCell>

                  {/* Department dropdown — gắn ref khi đang mở */}
                  <TableCell>
                    <div
                      className="relative inline-block"
                      ref={openDeptId === proj.id ? deptDropdownRef : null}
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-gray-300 font-normal"
                        onClick={() => handleOpenDept(proj.id)}
                      >
                        {getDeptName(proj.department_id)}
                      </Badge>
                      {openDeptId === proj.id && (
                        <div className="absolute z-50 top-full left-0 mt-1 w-56 rounded-md border bg-popover shadow-md">
                          <div className="p-2 border-b">
                            <Input
                              autoFocus
                              placeholder="Tìm kiếm..."
                              value={deptSearch}
                              onChange={(e) => setDeptSearch(e.target.value)}
                              className="h-7 text-sm placeholder:text-[12.5px]"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto py-1">
                            {filteredDepts.map((d) => (
                              <button
                                key={d.id}
                                className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-gray-200 gap-2 rounded"
                                onClick={() => handleChangeDept(proj.id, d.id)}
                              >
                                {d.id === proj.department_id ? (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                ) : (
                                  <span className="w-4 shrink-0" />
                                )}
                                {d.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Users dropdown — gắn ref khi đang mở */}
                  <TableCell>
                    <div
                      className="relative inline-block"
                      ref={openUsersId === proj.id ? userDropdownRef : null}
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-gray-300 font-normal"
                        onClick={() => handleOpenUsers(proj)}
                      >
                        {proj.user_count} nhân viên
                      </Badge>
                      {openUsersId === proj.id && (
                        <div className="absolute z-50 top-full left-0 mt-1 w-64 rounded-md border bg-popover shadow-md">
                          <div className="p-2 border-b">
                            <Input
                              autoFocus
                              placeholder="Tìm kiếm..."
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                              className="h-7 text-sm placeholder:text-[12px]"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto py-1">
                            {filteredUsers.length === 0 ? (
                              <p className="px-3 py-2 text-sm text-muted-foreground">
                                Không tìm thấy người dùng
                              </p>
                            ) : (
                              filteredUsers.map((u) => (
                                <button
                                  key={u.id}
                                  className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-gray-200 gap-2 rounded"
                                  onClick={() => toggleUser(u.id)}
                                >
                                  {selectedUserIds.has(u.id) ? (
                                    <Check className="h-4 w-4 text-primary shrink-0" />
                                  ) : (
                                    <span className="w-4 shrink-0" />
                                  )}
                                  <div className="text-left">
                                    <p className="font-medium">{u.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {u.email}
                                    </p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                          <div className="p-2 border-t flex justify-end">
                            <Button
                              size="sm"
                              disabled={savingUsers}
                              onClick={() => handleSaveUsers(proj.id)}
                            >
                              {savingUsers ? "Đang lưu..." : "Lưu"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right pr-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                            Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

// ── DepartmentsTab ────────────────────────────────────────────────────────────
function DepartmentsTab({ refreshTrigger }: { refreshTrigger?: number }) {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchName, setSearchName] = useState("");
  const [searchProject, setSearchProject] = useState("");
  const [searchUser, setSearchUser] = useState("");

  const filteredDepts = departments.filter((d) => {
    const matchName =
      !searchName || d.name.toLowerCase().includes(searchName.toLowerCase());
    // project_count/user_count là số, chỉ filter theo tên dept thôi
    return matchName;
  });

  useEffect(() => {
    setLoading(true);
    fetchDepartments(token)
      .then(setDepartments)
      .catch(() =>
        toast({ variant: "destructive", title: "Failed to load departments" }),
      )
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Tìm kiếm phòng ban..."
            className="pl-9 h-9 placeholder:text-[12.5px]"
          />
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <FolderKanban className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchProject}
            onChange={(e) => setSearchProject(e.target.value)}
            placeholder="Lọc theo dự án..."
            className="pl-9 h-9 placeholder:text-[12.5px]"
          />
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            placeholder="Lọc theo nhân viên..."
            className="pl-9 h-9 placeholder:text-[12.5px]"
          />
        </div>
        {(searchName || searchProject || searchUser) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-muted-foreground gap-1.5"
            onClick={() => {
              setSearchName("");
              setSearchProject("");
              setSearchUser("");
            }}
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70%] font-bold text-black">
                Phòng ban
              </TableHead>
              <TableHead className="w-[15%] font-bold text-black">
                Dự án
              </TableHead>
              <TableHead className="w-[15%] font-bold text-black">
                  Nhân viên
              </TableHead>
              <TableHead className="w-[5%]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : (
              departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {dept.project_count} dự án
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {dept.user_count} nhân viên
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>{" "}
    </div>
  );
}

// ── AddDepartmentButton ───────────────────────────────────────────────────────
function AddDepartmentButton({ onCreated }: { onCreated?: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createDepartment(name.trim(), token);
      toast({ variant: "success", title: `Department "${name}" created` });
      setOpen(false);
      setName("");
      onCreated?.();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        className="gap-2"
        onClick={() => {
          setName("");
          setOpen(true);
        }}
      >
        <Plus className="h-4 w-4" /> Thêm phòng ban
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
              <DialogTitle>Thêm phòng ban</DialogTitle>
            </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Tên phòng ban</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Phòng Nhân Sự"
              onKeyDown={(e) => e.key === "Enter" && handle()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button disabled={!name.trim() || saving} onClick={handle}>
              {saving ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── AddProjectButton ──────────────────────────────────────────────────────────
function AddProjectButton({ onCreated }: { onCreated?: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [deptId, setDeptId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open)
      fetchDepartments(token)
        .then(setDepartments)
        .catch(() => {});
  }, [open]);

  const handle = async () => {
    if (!name.trim() || !deptId) return;
    setSaving(true);
    try {
      await createProject(name.trim(), deptId, token);
      toast({ variant: "success", title: `Project "${name}" created` });
      setOpen(false);
      setName("");
      setDeptId("");
      onCreated?.();
    } catch (err: any) {
      toast({ variant: "destructive", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        className="gap-2"
        onClick={() => {
          setName("");
          setDeptId("");
          setOpen(true);
        }}
      >
        <Plus className="h-4 w-4" /> Thêm dự án
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Thêm dự án</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Tên dự án</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dự án Alpha Gold"
              />
            </div>
            <div className="grid gap-2">
              <Label>Phòng ban</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button
              disabled={!name.trim() || !deptId || saving}
              onClick={handle}
            >
              {saving ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddUserButton({ onCreated }: { onCreated?: () => void }) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    clearance_level: "",
    department_id: "",
  });

  useEffect(() => {
    if (open)
      fetchDepartments(token)
        .then(setDepartments)
        .catch(() => {});
  }, [open]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const canSubmit = Object.values(form).every((v) => v.trim());

  const handle = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await createUser(form, token);
      toast({ variant: "success", title: `User "${form.name}" created` });
      setOpen(false);
      setForm({
        name: "",
        email: "",
        password: "",
        role: "",
        clearance_level: "",
        department_id: "",
      });
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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Thêm người dùng</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Họ Tên</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="placeholder:text-[12.5px]"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="nva@rag.com"
                  className="placeholder:text-[12.5px]"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Mật khẩu</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Vai trò</Label>
                <Select value={form.role} onValueChange={(v) => set("role", v)}>
                  <SelectTrigger className="data-[placeholder]:text-[12.5px]">
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="admin_auditor">Quản trị viên</SelectItem>

                    <SelectItem value="director">Giám đốc</SelectItem>
                    <SelectItem value="department_manager">
                      Quản lý phòng ban
                    </SelectItem>

                    <SelectItem value="employee">Nhân viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Cấp độ</Label>
                <Select
                  value={form.clearance_level}
                  onValueChange={(v) => set("clearance_level", v)}
                >
                  <SelectTrigger className="data-[placeholder]:text-[12.5px]">
                    <SelectValue placeholder="Chọn cấp độ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Công khai</SelectItem>

                    <SelectItem value="internal">Nội bộ</SelectItem>

                    <SelectItem value="confidential">Hạn chế</SelectItem>

                    <SelectItem value="restricted">Mật</SelectItem>

                    <SelectItem value="top_secret">Tuyệt mật</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Phòng ban</Label>
              <Select
                value={form.department_id}
                onValueChange={(v) => set("department_id", v)}
              >
                <SelectTrigger className="data-[placeholder]:text-[12.5px]">
                  <SelectValue placeholder="Chọn phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!canSubmit || saving} onClick={handle}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
