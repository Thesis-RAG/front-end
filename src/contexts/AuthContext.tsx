import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { User, SENSITIVITY_RANK, SensitivityLevel } from "@/types";
import { auth, getMe } from "@/services/auth.api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  canViewSensitivity: (level: SensitivityLevel) => boolean;
  isCorpMember: boolean;
  maxClearance: number;
  ouiIds: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = user !== null;
  const isCorpMember = user?.is_corp_member ?? false;
  const maxClearance = user?.max_clearance ?? 1;
  const ouiIds = user?.oui_positions.map((p) => p.oui_id) ?? [];

  useEffect(() => {
    const savedToken = sessionStorage.getItem("access_token");
    if (!savedToken) {
      setLoading(false);
      return;
    }
    getMe(savedToken)
      .then((userData) => {
        setToken(savedToken);
        setUser(userData as User);
      })
      .catch(() => {
        sessionStorage.removeItem("access_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await auth({ email, password });
    sessionStorage.setItem("access_token", res.access_token);
    setToken(res.access_token);
    setUser(res.user as User);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("access_token");
    setUser(null);
    setToken(null);
  }, []);

  const canViewSensitivity = useCallback(
    (level: SensitivityLevel): boolean => {
      if (!user) return false;
      return maxClearance >= SENSITIVITY_RANK[level];
    },
    [user, maxClearance],
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      switch (permission) {
        case "chat":
        case "search":
        case "documents.view":
          return true;
        case "documents.edit":
          return user.oui_positions.length > 0;
        case "documents.approve":
        case "approvals":
          return isCorpMember;
        case "users.manage":
          return isCorpMember;
        case "audit.view":
          return isCorpMember;
        case "settings":
          return isCorpMember;
        case "documents.confidential":
          return maxClearance >= 3;
        case "documents.restricted":
          return maxClearance >= 4;
        case "documents.top_secret":
          return maxClearance >= 5;
        default:
          return false;
      }
    },
    [user, isCorpMember, maxClearance],
  );

  // Tất cả hooks đã gọi xong, giờ mới được return sớm
  if (loading) return null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        token,
        login,
        logout,
        hasPermission,
        canViewSensitivity,
        isCorpMember,
        maxClearance,
        ouiIds,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
