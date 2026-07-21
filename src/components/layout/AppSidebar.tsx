/** AppSidebar: fixed navigation sidebar with permission-filtered nav items, pending-approval badge, and user menu. */
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfileDialog } from "./UserProfileDialog";
import { getPendingReviewCount } from "@/services/documents.api";
import {
  MessageSquare,
  Search,
  FileText,
  CheckSquare,
  Users,
  Activity,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Mail,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  permission?: string;
}

// Extract up to 2 uppercase initials from a display name.
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const navItems: NavItem[] = [
  {
    label: "Trợ lý trò chuyện",
    icon: MessageSquare,
    path: "/chat",
    permission: "chat",
  },
  { label: "Tìm kiếm", icon: Search, path: "/search", permission: "search" },
  {
    label: "Tài liệu",
    icon: FileText,
    path: "/documents",
    permission: "documents.view",
  },
  { label: "Gmail", icon: Mail, path: "/gmail", permission: "chat" }, 

  {
    label: "Phê duyệt",
    icon: CheckSquare,
    path: "/approvals",
    permission: "approvals",
  },
  {
    label: "Người dùng & Truy cập",
    icon: Users,
    path: "/users",
    permission: "users.manage",
  },
  {
    label: "Kiểm toán",
    icon: Activity,
    path: "/audit",
    permission: "audit.view",
  },
  {
    label: "Cấu hình phân quyền",
    icon: ShieldCheck,
    path: "/policy",
    permission: "policy.manage",
  },
  {
    label: "Cài đặt",
    icon: Settings,
    path: "/settings",
    permission: "settings",
  },
];

// Application sidebar: nav items filtered by FGA permissions, real-time approval badge, and user dropdown.
export function AppSidebar() {
  const { user, hasPermission, logout, token, isCorpMember } = useAuth();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);

  // Poll the pending document-review count every 30 s for corp members; clears on unmount.
  useEffect(() => {
    if (!isCorpMember || !token) return;
    const fetchCount = () => getPendingReviewCount(token).then(setPendingCount);
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [isCorpMember, token]);

  // Filter nav items to those the current user has permission to access.
  const filteredNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border shadow-card-md">
      {/* Logo */}
      <div className="flex h-[4.5rem] items-center gap-3 px-5 border-b border-sidebar-border shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary to-blue-500 shadow-md shadow-blue-500/20">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-sidebar-accent-foreground tracking-tight">
            KnowledgeHub
          </span>
          <span className="text-[10px] text-sidebar-muted truncate uppercase tracking-wider">
            Enterprise knowledge platform
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 scrollbar-thin">
        <ul className="space-y-0.5">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                    isActive
                      ? "bg-gradient-to-r from-sidebar-primary/25 to-sidebar-primary/10 text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-sidebar-primary" />
                  )}
                  <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-primary")} />
                  <span className="flex-1">{item.label}</span>
                  {item.path === "/approvals" && pendingCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white leading-none">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      {user && (
        <div className="border-t border-sidebar-border p-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-all duration-150 hover:bg-sidebar-accent/40 group">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-sidebar-primary to-blue-500 text-white text-xs font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-accent-foreground truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[11px] text-sidebar-muted truncate mt-0.5">
                  {user.is_corp_member ? "Thành viên công ty" : "Thành viên"}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-sidebar-muted shrink-0 group-hover:text-sidebar-foreground transition-colors" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem
                className="text-xs text-muted-foreground"
                disabled
              >
                Switch role (demo):
              </DropdownMenuItem>
              {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => login(role)}
                  className={cn(user.role === role && "bg-accent")}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  {roleLabels[role]}
                </DropdownMenuItem>
              ))} */}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                <UserCircle className="mr-2 h-4 w-4" />
                Thông tin tài khoản
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {user && (
        <UserProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          user={user}
          token={token}
        />
      )}
    </aside>
  );
}
