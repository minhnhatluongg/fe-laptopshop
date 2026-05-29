import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  Category,
  CreateCategoryRequest,
  PagedResult,
  PaginationQuery,
  UpdateCategoryRequest,
} from "./types";

const BASE = `${API_V1}/categories`;

export const categoryApi = {
  // Public
  getAll: (query: PaginationQuery = {}) =>
    unwrap(
      apiClient.get<ApiResponse<PagedResult<Category>>>(BASE, { params: query }),
    ),

  getById: (id: number) =>
    unwrap(apiClient.get<ApiResponse<Category>>(`${BASE}/${id}`)),

  // Admin
  create: (body: CreateCategoryRequest) =>
    unwrap(apiClient.post<ApiResponse<Category>>(BASE, body)),

  update: ({ id, ...body }: UpdateCategoryRequest) =>
    unwrap(apiClient.put<ApiResponse<Category>>(`${BASE}/${id}`, body)),

  delete: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`)),
};
