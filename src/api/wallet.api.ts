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
};
