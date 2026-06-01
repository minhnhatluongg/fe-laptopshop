import { apiClient, API_V1, unwrap } from "./client";
import type { ApiResponse, WalletDto, WalletTransactionDto } from "./types";

const BASE = `${API_V1}/wallet`;

export const walletApi = {
  // Customer
  getMyWallet: () =>
    unwrap(apiClient.get<ApiResponse<WalletDto>>(`${BASE}/me`)),

  getMyTransactions: (pageNumber = 1, pageSize = 20) =>
    unwrap(
      apiClient.get<ApiResponse<WalletTransactionDto[]>>(`${BASE}/me/transactions`, {
        params: { pageNumber, pageSize },
      }),
    ),

  // Admin
  getUserWallet: (userId: number) =>
    unwrap(apiClient.get<ApiResponse<WalletDto>>(`${BASE}/user/${userId}`)),

  topUp: (body: { userId: number; amount: number; note?: string }) =>
    unwrap(apiClient.post<ApiResponse<WalletTransactionDto>>(`${BASE}/topup`, body)),

  adjust: (body: { userId: number; amount: number; note: string }) =>
    unwrap(apiClient.post<ApiResponse<WalletTransactionDto>>(`${BASE}/adjust`, body)),

  setLock: (userId: number, body: { isLocked: boolean; reason?: string }) =>
    unwrap(apiClient.put<ApiResponse<WalletDto>>(`${BASE}/user/${userId}/lock`, body)),

  // Redeem codes (admin generate + list)
  generateCodes: (body: { amount: number; count: number; note?: string; expireInDays?: number }) =>
    unwrap(apiClient.post<ApiResponse<WalletRedeemCodeDto[]>>(`${BASE}/codes/generate`, body)),

  listCodes: (pageNumber = 1, pageSize = 50) =>
    unwrap(apiClient.get<ApiResponse<WalletRedeemCodeDto[]>>(`${BASE}/codes`, {
      params: { pageNumber, pageSize },
    })),

  // User redeem
  redeemCode: (code: string) =>
    unwrap(apiClient.post<ApiResponse<WalletTransactionDto>>(`${BASE}/codes/redeem`, { code })),
};

export interface WalletRedeemCodeDto {
  id: number;
  code: string;
  amount: number;
  note?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  usedByUserId?: number | null;
  usedByUserName?: string | null;
  usedAt?: string | null;
  isUsed: boolean;
  isExpired: boolean;
}
