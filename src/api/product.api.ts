import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  CreateProductRequest,
  PagedResult,
  Product,
  ProductFilter,
  UpdateProductRequest,
} from "./types";

const BASE = `${API_V1}/products`;

export const productApi = {
  // Public
  getAll: (query: ProductFilter = {}) =>
    unwrap(
      apiClient.get<ApiResponse<PagedResult<Product>>>(`${BASE}/GetAllProducts`, {
        params: query,
      }),
    ),

  getById: (id: number) =>
    unwrap(
      apiClient.get<ApiResponse<Product>>(`${BASE}/GetProductById/${id}`),
    ),

  /** Lấy nhanh nhiều sản phẩm theo IDs — dùng cho guest cart hydrate. */
  getBatch: (ids: number[]) =>
    unwrap(
      apiClient.post<ApiResponse<Product[]>>(`${BASE}/batch`, { ids }),
    ),

  // Admin
  create: (body: CreateProductRequest) =>
    unwrap(apiClient.post<ApiResponse<Product>>(`${BASE}/CreateProduct`, body)),

  // Gửi toàn bộ object kể cả id trong body — UpdateProductRequestDto yêu cầu Id
  update: (req: UpdateProductRequest) =>
    unwrap(
      apiClient.put<ApiResponse<Product>>(`${BASE}/UpdateProduct/${req.id}`, req),
    ),

  delete: (id: number) =>
    unwrap(
      apiClient.delete<ApiResponse<void>>(`${BASE}/DeleteProduct/${id}`),
    ),
};
