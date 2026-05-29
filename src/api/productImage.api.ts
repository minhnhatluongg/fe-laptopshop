import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  PagedResult,
  PaginationQuery,
  ProductImage,
} from "./types";

const BASE = `${API_V1}/productimage`;

export const productImageApi = {
  // Admin — paged list
  getAll: (query: PaginationQuery = {}) =>
    unwrap(
      apiClient.get<ApiResponse<PagedResult<ProductImage>>>(
        `${BASE}/GetAllProductImage`,
        { params: query },
      ),
    ),

  // Public — list by product
  getByProductId: (productId: number) =>
    unwrap(
      apiClient.get<ApiResponse<ProductImage[]>>(`${BASE}/GetByProductId`, {
        params: { productId },
      }),
    ),

  create: (body: Omit<ProductImage, "id" | "createdAt" | "uploadedAt">) =>
    unwrap(
      apiClient.post<ApiResponse<ProductImage>>(`${BASE}/CreateProductImage`, body),
    ),

  // Link a previously-uploaded SysFile to a product as an image.
  // Workflow: 1) fileApi.upload(file) → { sysFileId }
  //           2) productImageApi.linkSysFile(productId, { sysFileId, isMain, ... })
  linkSysFile: (
    productId: number,
    body: {
      sysFileId: number;
      isMain?: boolean;
      altText?: string | null;
      title?: string | null;
    },
  ) =>
    unwrap(
      apiClient.post<ApiResponse<ProductImage>>(
        `${BASE}/product/${productId}/images`,
        { productId, isMain: false, ...body },
      ),
    ),

  update: (id: number, body: Partial<ProductImage>) =>
    unwrap(
      apiClient.put<ApiResponse<ProductImage>>(`${BASE}/Update`, { id, ...body }),
    ),

  delete: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<void>>(`${BASE}/Delete`, { params: { id } })),

  setMain: (id: number) =>
    unwrap(
      apiClient.put<ApiResponse<void>>(`${BASE}/SetMainImage`, null, {
        params: { id },
      }),
    ),
};
