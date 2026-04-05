import React, { createContext, useContext, useState, useCallback } from "react";
import { User, UserRole } from "@/types";
import { auth } from "@/services/auth.api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  const login = useCallback(async (email: string, password: string) => {
    const res = await auth({ email, password });

    setToken(res.access_token);
    setUser({
      id: res.user.id,
      name: res.user.name,
      email: res.user.email,
      role: res.user.role,
      department: res.user.department_id,
      avatar: undefined,
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  const hasRole = useCallback(
    (roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    [user]
  );

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      const permissionRequirements: Record<string, UserRole[]> = {
        chat: ["employee", "department_manager", "director", "admin_auditor"],
        search: ["employee", "department_manager", "director", "admin_auditor"],
        "documents.view": ["employee", "department_manager", "director", "admin_auditor"],
        "documents.edit": ["director", "admin_auditor", "department_manager"],
        "documents.approve": ["director", "admin_auditor"],
        approvals: ["director", "admin_auditor"],
        "users.manage": ["admin_auditor"],
        "audit.view": ["director", "admin_auditor"],
        settings: ["director", "admin_auditor"],
        "documents.confidential": ["director", "admin_auditor", "department_manager"],
        "documents.restricted": ["director", "admin_auditor"],
        "documents.top_secret": ["admin_auditor"],
      };
      const allowedRoles = permissionRequirements[permission];
      return allowedRoles ? allowedRoles.includes(user.role) : false;
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, token, login, logout, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}