import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  UserProfile,
  UserSummary,
} from "./types";

const BASE = `${API_V1}/auth`;

export const authApi = {
  login: (body: LoginRequest) =>
    unwrap(apiClient.post<ApiResponse<AuthResponse>>(`${BASE}/login`, body)),

  register: (body: RegisterRequest) =>
    unwrap(apiClient.post<ApiResponse<AuthResponse>>(`${BASE}/register`, body)),

  refreshToken: (body: RefreshTokenRequest = {}) =>
    unwrap(apiClient.post<ApiResponse<AuthResponse>>(`${BASE}/refresh-token`, body)),

  logout: () =>
    unwrap(apiClient.post<ApiResponse<void>>(`${BASE}/logout`)),

  me: () =>
    unwrap(apiClient.get<ApiResponse<UserSummary>>(`${BASE}/me`)),

  revokeAllTokens: () =>
    unwrap(apiClient.post<ApiResponse<void>>(`${BASE}/revoke-all-tokens`)),

  // ── Profile ──────────────────────────────────────────────────────────────
  getMyProfile: () =>
    unwrap(apiClient.get<ApiResponse<UserProfile>>(`${BASE}/me/profile`)),

  updateMyProfile: (body: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string | null;
  }) =>
    unwrap(apiClient.put<ApiResponse<UserProfile>>(`${BASE}/me/profile`, body)),

  changePassword: (body: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) =>
    unwrap(apiClient.put<ApiResponse<void>>(`${BASE}/me/password`, body)),

  updateAvatar: (sysFileId: number) =>
    unwrap(
      apiClient.put<ApiResponse<{ avatarUrl: string }>>(`${BASE}/me/avatar`, { sysFileId }),
    ),
};
