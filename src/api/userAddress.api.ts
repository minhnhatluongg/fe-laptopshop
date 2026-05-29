import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  PagedResult,
  PaginationQuery,
  UserAddress,
} from "./types";

const BASE = `${API_V1}/useraddress`;

export const userAddressApi = {
  create: (body: Omit<UserAddress, "id" | "isDeleted" | "createdAt">) =>
    unwrap(apiClient.post<ApiResponse<UserAddress>>(BASE, body)),

  update: (id: number, body: Partial<UserAddress>) =>
    unwrap(apiClient.put<ApiResponse<UserAddress>>(`${BASE}/${id}`, body)),

  softDelete: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`)),

  hardDelete: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<void>>(`${BASE}/${id}/hard`)),

  setDefault: (id: number, userId: number) =>
    unwrap(
      apiClient.put<ApiResponse<UserAddress>>(`${BASE}/${id}/default`, null, {
        params: { userId },
      }),
    ),

  getById: (id: number) =>
    unwrap(apiClient.get<ApiResponse<UserAddress>>(`${BASE}/${id}`)),

  getByUser: (userId: number) =>
    unwrap(
      apiClient.get<ApiResponse<UserAddress[]>>(`${BASE}/user/${userId}`),
    ),

  getDefaultByUser: (userId: number) =>
    unwrap(
      apiClient.get<ApiResponse<UserAddress>>(`${BASE}/user/${userId}/default`),
    ),

  getAll: (query: PaginationQuery = {}) =>
    unwrap(
      apiClient.get<ApiResponse<PagedResult<UserAddress>>>(BASE, {
        params: query,
      }),
    ),
};
