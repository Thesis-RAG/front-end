import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { User, UserRole } from "@/types";

import { auth } from "@/services/auth.api";
import { getAllUsers } from "@/services/users.api";

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

type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clearance_level: string;
  department_id: string;
  status: string;
};

const roleToDepartment: Record<UserRole, string> = {
  employee: "Engineering",
  department_manager: "Engineering",
  director: "Knowledge Management",
  admin_auditor: "IT Administration",
};

function mapApiUserToUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role,
    department: roleToDepartment[apiUser.role],
    avatar: undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [usersByRole, setUsersByRole] = useState<
    Partial<Record<UserRole, User>>
  >({});

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const result: ApiUser[] = await getAllUsers();

        const mappedUsers = result.reduce(
          (acc, apiUser) => {
            acc[apiUser.role] = mapApiUserToUser(apiUser);
            return acc;
          },
          {} as Partial<Record<UserRole, User>>,
        );

        setUsersByRole(mappedUsers);
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    };

    loadUsers();
  }, []);

  const isAuthenticated = user !== null;

  const login = useCallback(
    async (role: UserRole = "employee") => {
      try {
        const selectedUser = usersByRole[role];

        if (!selectedUser) {
          throw new Error(`User with role "${role}" not found`);
        }

        setUser(selectedUser);

        const res = await auth({
          email: selectedUser.email,
        });

        setToken(res.access_token);
      } catch (err) {
        console.error(err);
      }
    },
    [usersByRole],
  );

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
