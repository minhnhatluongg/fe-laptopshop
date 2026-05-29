import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  Brand,
  CreateBrandRequest,
  PagedResult,
  PaginationQuery,
  UpdateBrandRequest,
} from "./types";

const BASE = `${API_V1}/brands`;

export const brandApi = {
  // Public
  getAll: (query: PaginationQuery = {}) =>
    unwrap(
      apiClient.get<ApiResponse<PagedResult<Brand>>>(BASE, { params: query }),
    ),

  getActive: () =>
    unwrap(apiClient.get<ApiResponse<Brand[]>>(`${BASE}/active`)),

  getById: (id: number) =>
    unwrap(apiClient.get<ApiResponse<Brand>>(`${BASE}/${id}`)),

  // Admin
  create: (body: CreateBrandRequest) =>
    unwrap(apiClient.post<ApiResponse<Brand>>(BASE, body)),

  update: ({ id, ...body }: UpdateBrandRequest) =>
    unwrap(apiClient.put<ApiResponse<Brand>>(`${BASE}/${id}`, body)),

  delete: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`)),
};
