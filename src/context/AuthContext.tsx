import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi } from "@/api/auth.api";
import { cartApi } from "@/api/cart.api";
import { authStorage } from "@/api/client";
import { useToast } from "@/context/ToastContext";
import type {
  AuthResponse,
  LoginRequest,
  UserSummary,
} from "@/api/types";

// ── RBAC permission map ────────────────────────────────────────────────────
// Define which features each role can access.
// Add new roles here without changing UI components.
export type Permission =
  | "dashboard"
  | "products.manage"
  | "products.view"
  | "orders.manage"
  | "orders.view"
  | "users.manage"
  | "inventory.manage"
  | "inventory.view"
  | "gifts.manage"
  | "coupons.manage"
  | "wallet.manage"
  | "wallet.view_own"
  | "reports.view"
  | "banners.manage"
  | "showrooms.manage"
  | "roles.manage";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: ["dashboard","products.manage","products.view","orders.manage","orders.view",
    "users.manage","inventory.manage","inventory.view","gifts.manage","coupons.manage",
    "wallet.manage","wallet.view_own","reports.view","banners.manage","showrooms.manage","roles.manage"],
  ADMIN: ["dashboard","products.manage","products.view","orders.manage","orders.view",
    "users.manage","inventory.manage","inventory.view","gifts.manage","coupons.manage",
    "wallet.manage","wallet.view_own","reports.view","banners.manage","showrooms.manage"],
  MANAGER: ["dashboard","products.manage","products.view","orders.manage","orders.view",
    "users.manage","inventory.manage","inventory.view","gifts.manage","coupons.manage",
    "wallet.manage","reports.view","banners.manage","showrooms.manage"],
  SALES: ["dashboard","products.view","orders.manage","orders.view","gifts.manage",
    "coupons.manage","wallet.view_own","reports.view"],
  WAREHOUSE: ["dashboard","products.view","inventory.manage","inventory.view","orders.view"],
  SUPPORT: ["dashboard","orders.view","users.manage","wallet.view_own"],
  MODERATOR: ["dashboard","products.view","banners.manage"],
  VIP: ["wallet.view_own"],
  PARTNER: ["dashboard","products.view","orders.view","reports.view"],
  CUSTOMER: ["wallet.view_own"],
};

interface AuthCtx {
  user: UserSummary | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  hasPermission: (p: Permission) => boolean;
  login: (body: LoginRequest) => Promise<UserSummary>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

const ADMIN_ROLES = ["Admin", "Manager", "Super Admin", "SUPER_ADMIN", "ADMIN", "MANAGER"];

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
    // Merge guest_cart (localStorage) → server cart, sau đó xóa local.
    void mergeGuestCart();
    return res.user;
  };

  /** Đọc guest_cart trong localStorage, gọi cartApi.addItem cho từng item, rồi clear. */
  const mergeGuestCart = async () => {
    try {
      const raw = localStorage.getItem("guest_cart");
      if (!raw) return;
      const items: Array<{ productId: number; quantity: number }> = JSON.parse(raw);
      if (!Array.isArray(items) || items.length === 0) return;

      for (const it of items) {
        try {
          await cartApi.addItem(it.productId, it.quantity);
        } catch {
          /* skip lỗi item lẻ để không chặn merge */
        }
      }
      localStorage.removeItem("guest_cart");
      window.dispatchEvent(new CustomEvent("cart:updated"));
    } catch {
      /* localStorage có thể bị disable, im lặng */
    }
  };

  const login = useCallback(async (body: LoginRequest) => {
    const res = await authApi.login(body);
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

  const hasPermission = useCallback((p: Permission): boolean => {
    if (!user) return false;
    const roleCode = (user.role ?? "CUSTOMER").toUpperCase().replace(/\s+/g, "_");
    const perms = ROLE_PERMISSIONS[roleCode] ?? ROLE_PERMISSIONS.CUSTOMER;
    return perms.includes(p);
  }, [user]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: !!user && ADMIN_ROLES.some(r => r.toUpperCase() === (user.role ?? "").toUpperCase()),
      loading,
      hasPermission,
      login,
      logout,
      refresh,
    }),
    [user, loading, hasPermission, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
