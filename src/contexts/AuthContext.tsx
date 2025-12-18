import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  login as apiLogin,
  refreshToken as apiRefreshToken,
  getCurrentUser,
  getUserPrivileges,
  type LoginResponse,
  type TokenResponse,
  type User,
  type Privilege,
} from "@/lib/api";

interface AuthContextType {
  user: User | null;
  privileges: Privilege[];
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPrivilege: (uiPrivilege: string) => boolean;
  hasAnyPrivilege: (uiPrivileges: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const STORAGE_KEY = "dsms_auth";

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Map UI-level privilege flags to backend privilege codes
const UI_PRIVILEGE_MAP: Record<string, string[]> = {
  can_view_requests: ["REQUEST_VIEW_ALL", "REQUEST_VIEW_OWN"],
  can_create_requests: ["REQUEST_CREATE"],
  can_approve_requests: ["APPROVAL_APPROVE"],
  can_fulfill_requests: ["FULFILLMENT_FULFILL"],
  can_view_stock: ["STOCK_VIEW"],
  can_adjust_stock: ["STOCK_ADJUST"],
  can_view_machinery: ["MACHINERY_VIEW"],
  can_manage_machinery: ["MACHINERY_MODIFY"],
  can_view_items: ["ITEM_VIEW"],
  can_manage_items: ["ITEM_CREATE", "ITEM_MODIFY", "ITEM_DELETE", "ITEM_CATEGORY_MANAGE"],
  can_manage_users: ["USER_MODIFY", "USER_ASSIGN_ROLES"],
  can_manage_roles: ["ROLE_MODIFY", "ROLE_ASSIGN_PRIVILEGES"],
  can_view_activity_logs: ["ACTIVITY_LOG_VIEW"],
  can_cleanup_activity_logs: ["ACTIVITY_LOG_CLEANUP"],
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const applyTokens = useCallback((tokens: TokenResponse) => {
    setAccessToken(tokens.access_token);
    setRefreshToken(tokens.refresh_token);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setPrivileges([]);
    setAccessToken(null);
    setRefreshToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const fetchUserAndPrivileges = useCallback(async () => {
    if (!accessToken) return;
    try {
      const apiUser = await getCurrentUser(accessToken);
      setUser(apiUser);
      
      const userPrivileges = await getUserPrivileges(apiUser.id, accessToken);
      setPrivileges(userPrivileges);
    } catch (error) {
      console.error("Failed to bootstrap auth:", error);
      clearAuth();
    }
  }, [accessToken, clearAuth]);

  useEffect(() => {
    const initAuth = async () => {
      let cancelled = false;
      try {
        const raw =
          typeof window !== "undefined"
            ? localStorage.getItem(STORAGE_KEY)
            : null;

        if (!raw) {
          setIsLoading(false);
          return;
        }

        const stored = JSON.parse(raw) as StoredAuth;
        if (!stored.accessToken || !stored.refreshToken) {
          setIsLoading(false);
          return;
        }

        if (cancelled) return;
        setAccessToken(stored.accessToken);
        setRefreshToken(stored.refreshToken);
        setUser(stored.user);

        try {
          const userPrivileges = await getUserPrivileges(
            stored.user.id,
            stored.accessToken
          );
          if (cancelled) return;
          setPrivileges(userPrivileges);
        } catch {
          if (!cancelled) clearAuth();
        }
      } catch {
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
    return () => {
      // mark cancelled for any in-flight async
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (initAuth as any).cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist auth bundle
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!accessToken || !refreshToken || !user) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const payload: StoredAuth = { accessToken, refreshToken, user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [accessToken, refreshToken, user]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res: LoginResponse = await apiLogin(username, password);
      applyTokens(res);

      const apiUser = await getCurrentUser(res.access_token);
      setUser(apiUser);

      const userPrivileges = await getUserPrivileges(
        apiUser.id,
        res.access_token
      );
      setPrivileges(userPrivileges);
    },
    [applyTokens]
  );

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const hasPrivilege = useCallback(
    (uiPrivilege: string) => {
      const backendCodes = UI_PRIVILEGE_MAP[uiPrivilege];
      if (!backendCodes || backendCodes.length === 0) {
        return false;
      }
      return privileges.some((p) => backendCodes.includes(p.code));
    },
    [privileges]
  );

  const hasAnyPrivilege = useCallback(
    (uiPrivileges: string[]) => {
      return uiPrivileges.some((name) => hasPrivilege(name));
    },
    [hasPrivilege]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        privileges,
        isLoading,
        isAuthenticated: !!user,
        accessToken,
        login,
        logout,
        hasPrivilege,
        hasAnyPrivilege,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
