import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import type { ApiResponse, AuthResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const TOKEN_KEY = import.meta.env.VITE_TOKEN_STORAGE_KEY || "ls_auth_v1";

// =============================================================
// Token storage — single source of truth
// =============================================================
export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiration: string;
}

export const authStorage = {
  get(): StoredAuth | null {
    try {
      const raw = localStorage.getItem(TOKEN_KEY);
      return raw ? (JSON.parse(raw) as StoredAuth) : null;
    } catch {
      return null;
    }
  },
  set(auth: StoredAuth) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(auth));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

// =============================================================
// Axios instance — base URL points to backend origin.
// All service files prepend "/api/v1/..." themselves.
// =============================================================
// NOTE: withCredentials = false because backend currently uses
// CORS `AllowAnyOrigin()` which is incompatible with credentialed
// requests. Refresh token is also returned in the login body and
// stored in localStorage, so cookies are not required.
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30_000,
});

// ---------- Request: attach JWT ----------
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const stored = authStorage.get();
  if (stored?.accessToken) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization =
      `Bearer ${stored.accessToken}`;
  }
  return config;
});

// ---------- Response: 401 → refresh token, retry once ----------
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const drainQueue = (token: string | null) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/refresh-token")
    ) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          original.headers = original.headers ?? {};
          (original.headers as Record<string, string>).Authorization =
            `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

    isRefreshing = true;

    try {
      const stored = authStorage.get();
      const res = await axios.post<ApiResponse<AuthResponse>>(
        `${API_BASE_URL}/api/v1/auth/refresh-token`,
        { refreshToken: stored?.refreshToken ?? null },
        { withCredentials: true },
      );

      const auth = res.data?.data;
      if (!auth?.accessToken) throw new Error("Refresh failed");

      authStorage.set({
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        accessTokenExpiration: auth.accessTokenExpiration,
      });

      drainQueue(auth.accessToken);

      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization =
        `Bearer ${auth.accessToken}`;
      return apiClient(original);
    } catch (refreshError) {
      drainQueue(null);
      authStorage.clear();
      // Notify UI qua event — AuthContext lắng nghe và hiện Toast + clear user state
      // KHÔNG hard redirect, để user thấy thông báo và tự quyết định đăng nhập lại
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:session-expired"));
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// =============================================================
// Helper: unwrap ApiResponse<T> → T (throws on success=false)
// =============================================================
export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await promise;
  if (!res.data.success) {
    const msg = res.data.message || res.data.errors?.join(", ") || "Request failed";
    throw new Error(msg);
  }
  return res.data.data;
}

// API path prefix used by every service file
export const API_V1 = "/api/v1";
