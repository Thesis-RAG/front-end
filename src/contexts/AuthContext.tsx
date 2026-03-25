import React, { createContext, useContext, useState, useCallback } from "react";
import { User, UserRole } from "@/types";

import { auth } from "@/services/auth.api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (role?: UserRole) => void;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for different roles
const mockUsers: Record<UserRole, User> = {
  employee: {
    id: "1460b8b2-4c03-4975-87db-9e54614b3155",
    name: "Nguyễn Văn An",
    email: "an.nguyen@company.com",
    role: "employee",
    department: "Engineering",
    avatar: undefined,
  },
  department_manager: {
    id: "628adea5-e221-427e-a3ab-182bc4ab0005",
    name: "Trần Thị Bình",
    email: "binh.tran@company.com",
    role: "department_manager",
    department: "Engineering",
    avatar: undefined,
  },
  director: {
    id: "67bccecf-cbd9-482f-ae82-16682ebae5f8",
    name: "Lê Văn Cường",
    email: "cuong.le@company.com",
    role: "director",
    department: "Knowledge Management",
    avatar: undefined,
  },
  admin_auditor: {
    id: "fc14c87f-2feb-45b8-890a-1bfd15b79bbf",
    name: "Phạm Thị Dung",
    email: "dung.pham@company.com",
    role: "admin_auditor",
    department: "IT Administration",
    avatar: undefined,
  },
};

// Role hierarchy for permission checking
const roleHierarchy: Record<UserRole, number> = {
  employee: 1,
  department_manager: 2,
  director: 3,
  admin_auditor: 4,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  const login = useCallback(async (role: UserRole) => {
    try {
      const user = mockUsers[role];
      setUser(user);

      const res = await auth({
        email: user.email,
      });

      setToken(res.access_token);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user],
  );

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;

      const permissionRequirements: Record<string, UserRole[]> = {
        chat: ["employee", "department_manager", "director", "admin_auditor"],
        search: ["employee", "department_manager", "director", "admin_auditor"],
        "documents.view": [
          "employee",
          "department_manager",
          "director",
          "admin_auditor",
        ],
        "documents.edit": ["director", "admin_auditor", "department_manager"],
        "documents.approve": ["director", "admin_auditor"],
        approvals: ["director", "admin_auditor"],
        "users.manage": ["admin_auditor"],
        "audit.view": ["director", "admin_auditor"],
        settings: ["director", "admin_auditor"],
      };

      const allowedRoles = permissionRequirements[permission];
      return allowedRoles ? allowedRoles.includes(user.role) : false;
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        token,
        login,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
