import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare,
  Search,
  FileText,
  CheckSquare,
  Users,
  Shield,
  Activity,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
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
import { UserRole } from "@/types";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  permission?: string;
}

const navItems: NavItem[] = [
  {
    label: "Chat Assistant",
    icon: MessageSquare,
    path: "/chat",
    permission: "chat",
  },
  { label: "Search", icon: Search, path: "/search", permission: "search" },
  {
    label: "Documents",
    icon: FileText,
    path: "/documents",
    permission: "documents.view",
  },
  {
    label: "Approvals",
    icon: CheckSquare,
    path: "/approvals",
    permission: "approvals",
  },
  {
    label: "Users & Access",
    icon: Users,
    path: "/users",
    permission: "users.manage",
  },
  {
    label: "Audit Logs",
    icon: Activity,
    path: "/audit",
    permission: "audit.view",
  },
  {
    label: "Settings",
    icon: Settings,
    path: "/settings",
    permission: "settings",
  },
];

const roleLabels: Record<UserRole, string> = {
  employee: "Employee",
  department_manager: "Dept. Manager",
  director: "Director",
  admin_auditor: "Administrator Auditor",
};

export function AppSidebar() {
  const { user, hasPermission, logout, login } = useAuth();
  const location = useLocation();

  const filteredNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-accent-foreground">
            KnowledgeHub
          </span>
          <span className="text-xs text-sidebar-muted">Enterprise RAG</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-fast",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      {user && (
        <div className="border-t border-sidebar-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent/50">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-sidebar-muted truncate">
                  {roleLabels[user.role]}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-muted shrink-0" />
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
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </aside>
  );
}
