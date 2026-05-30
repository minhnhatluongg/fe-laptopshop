import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  PagedResult,
  PaginationQuery,
  ProductSpecification,
} from "./types";

const BASE = `${API_V1}/productspecifications`;

export const productSpecApi = {
  getAll: (query: PaginationQuery = {}) =>
    unwrap(
      apiClient.get<ApiResponse<PagedResult<ProductSpecification>>>(
        `${BASE}/GetAllSpecifications`,
        { params: query },
      ),
    ),

  getById: (id: number) =>
    unwrap(
      apiClient.get<ApiResponse<ProductSpecification>>(
        `${BASE}/GetSpecificationById/${id}`,
      ),
    ),

  // Lấy spec theo productId — dùng cho form + detail page
  getByProductId: (productId: number) =>
    unwrap(
      apiClient.get<ApiResponse<ProductSpecification | null>>(
        `${BASE}/GetByProductId/${productId}`,
      ),
    ),

  create: (body: Omit<ProductSpecification, "id">) =>
    unwrap(
      apiClient.post<ApiResponse<ProductSpecification>>(
        `${BASE}/CreateSpecification`,
        body,
      ),
    ),

  update: (id: number, body: Partial<ProductSpecification>) =>
    unwrap(
      apiClient.put<ApiResponse<ProductSpecification>>(
        `${BASE}/UpdateSpecification/${id}`,
        body,
      ),
    ),

  delete: (id: number) =>
    unwrap(
      apiClient.delete<ApiResponse<void>>(`${BASE}/DeleteSpecification/${id}`),
    ),
};
