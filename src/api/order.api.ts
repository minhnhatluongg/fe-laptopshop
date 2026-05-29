import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  CreateOrderRequest,
  Order,
  OrderStatus,
  PagedResult,
  PaginationQuery,
  UpdateOrderStatusRequest,
} from "./types";

const BASE = `${API_V1}/orders`;

export const orderApi = {
  // ----- Customer -----
  create: (body: CreateOrderRequest) =>
    unwrap(apiClient.post<ApiResponse<Order>>(BASE, body)),

  myOrders: (status?: OrderStatus) =>
    unwrap(
      apiClient.get<ApiResponse<Order[]>>(`${BASE}/my-orders`, {
        params: status ? { status } : undefined,
      }),
    ),

  getById: (orderId: number) =>
    unwrap(apiClient.get<ApiResponse<Order>>(`${BASE}/${orderId}`)),

  cancel: (orderId: number, reason?: string | null) =>
    unwrap(
      apiClient.post<ApiResponse<Order>>(`${BASE}/${orderId}/cancel`, { reason }),
    ),

  // ----- Admin -----
  adminGetAll: (
    query: PaginationQuery & { status?: OrderStatus; userId?: number } = {},
  ) =>
    unwrap(
      apiClient.get<ApiResponse<PagedResult<Order>>>(`${BASE}/admin/all`, {
        params: query,
      }),
    ),

  adminUpdateStatus: (orderId: number, body: UpdateOrderStatusRequest) =>
    unwrap(
      apiClient.put<ApiResponse<Order>>(`${BASE}/admin/${orderId}/status`, body),
    ),

  adminCancel: (orderId: number, reason?: string | null) =>
    unwrap(
      apiClient.post<ApiResponse<Order>>(`${BASE}/admin/${orderId}/cancel`, {
        reason,
      }),
    ),

  adminGetById: (orderId: number) =>
    unwrap(apiClient.get<ApiResponse<Order>>(`${BASE}/admin/${orderId}`)),
};
