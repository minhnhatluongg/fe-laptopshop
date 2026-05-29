import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  CartSummary,
  ShoppingCart,
} from "./types";

const BASE = `${API_V1}/shoppingcart`;

export const cartApi = {
  get: () => unwrap(apiClient.get<ApiResponse<ShoppingCart>>(BASE)),

  summary: () =>
    unwrap(apiClient.get<ApiResponse<CartSummary>>(`${BASE}/summary`)),

  count: () =>
    unwrap(apiClient.get<ApiResponse<number>>(`${BASE}/count`)),

  addItem: (productId: number, quantity: number) =>
    unwrap(
      apiClient.post<ApiResponse<ShoppingCart>>(`${BASE}/items`, {
        productId,
        quantity,
      }),
    ),

  updateItem: (itemId: number, quantity: number) =>
    unwrap(
      apiClient.put<ApiResponse<ShoppingCart>>(`${BASE}/items/${itemId}`, {
        quantity,
      }),
    ),

  removeItem: (itemId: number) =>
    unwrap(
      apiClient.delete<ApiResponse<ShoppingCart>>(`${BASE}/items/${itemId}`),
    ),

  clear: () =>
    unwrap(apiClient.delete<ApiResponse<void>>(`${BASE}/clear`)),
};
