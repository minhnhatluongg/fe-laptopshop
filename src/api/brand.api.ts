import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  Brand,
  BrandQuery,
  CreateBrandRequest,
  PagedResult,
  UpdateBrandRequest,
} from "./types";

const BASE = `${API_V1}/brands`;

export const brandApi = {
  // Public
  getAll: (query: BrandQuery = {}) =>
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

  // Backend validates route id === body.Id, so keep id in the body too.
  update: (body: UpdateBrandRequest) =>
    unwrap(apiClient.put<ApiResponse<Brand>>(`${BASE}/${body.id}`, body)),

  delete: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<void>>(`${BASE}/${id}`)),
};
