import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi } from "@/api/auth.api";
import { authStorage } from "@/api/client";
import { useToast } from "@/context/ToastContext";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserSummary,
} from "@/api/types";

interface AuthCtx {
  user: UserSummary | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (body: LoginRequest) => Promise<UserSummary>;
  register: (body: RegisterRequest) => Promise<UserSummary>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

const ADMIN_ROLES = ["Admin", "Manager"]; // upper-cased role names

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Lắng nghe auth:session-expired — hiện Toast thay vì hard redirect
  useEffect(() => {
    const handler = () => {
      setUser(null);
      toast.warning(
        "Phiên đăng nhập hết hạn",
        "Vui lòng đăng nhập lại để tiếp tục.",
      );
    };
    window.addEventListener("auth:session-expired", handler);
    return () => window.removeEventListener("auth:session-expired", handler);
  }, [toast]);

  // On mount: if we have a token, fetch /me to hydrate the user.
  useEffect(() => {
    const stored = authStorage.get();
    if (!stored?.accessToken) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        authStorage.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const persistAuth = (res: AuthResponse) => {
    authStorage.set({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      accessTokenExpiration: res.accessTokenExpiration,
    });
    setUser(res.user);
    return res.user;
  };

  const login = useCallback(async (body: LoginRequest) => {
    const res = await authApi.login(body);
    return persistAuth(res);
  }, []);

  const register = useCallback(async (body: RegisterRequest) => {
    const res = await authApi.register(body);
    return persistAuth(res);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* still clear local */
    }
    authStorage.clear();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: !!user && ADMIN_ROLES.includes(user.role),
      loading,
      login,
      register,
      logout,
      refresh,
    }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
