import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  InventoryHistory,
  InventoryTransactionType,
  PagedResult,
  PaginationQuery,
} from "./types";

const BASE = `${API_V1}/inventoryhistory`;

// Admin/Manager/Warehouse only.
export const inventoryApi = {
  getAll: (
    query: PaginationQuery & {
      productId?: number;
      transactionType?: InventoryTransactionType;
      fromDate?: string;
      toDate?: string;
    } = {},
  ) =>
    unwrap(
      apiClient.get<ApiResponse<PagedResult<InventoryHistory>>>(BASE, {
        params: query,
      }),
    ),

  getByProduct: (productId: number) =>
    unwrap(
      apiClient.get<ApiResponse<InventoryHistory[]>>(
        `${BASE}/product/${productId}`,
      ),
    ),

  getByTransactionType: (transactionType: InventoryTransactionType) =>
    unwrap(
      apiClient.get<ApiResponse<InventoryHistory[]>>(
        `${BASE}/transaction/${transactionType}`,
      ),
    ),
};
