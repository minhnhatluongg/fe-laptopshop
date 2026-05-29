import { apiClient, API_V1, unwrap } from "./client";
import type {
  ApiResponse,
  CreateProductCommentRequest,
  CreateProductReviewRequest,
  CurrentUserContext,
  ProductComment,
  ProductDetail,
  ProductReview,
} from "./types";

const BASE = `${API_V1}/ProductDetail`;

/**
 * API trang chi tiết sản phẩm.
 * Hỗ trợ truy cập theo cả productId (số) và slug (URL-friendly).
 */
export const productDetailApi = {
  // -------- By Id --------
  getDetail: (productId: number) =>
    unwrap(apiClient.get<ApiResponse<ProductDetail>>(`${BASE}/${productId}`)),

  getContext: (productId: number) =>
    unwrap(
      apiClient.get<ApiResponse<CurrentUserContext>>(
        `${BASE}/${productId}/context`,
      ),
    ),

  getComments: (productId: number) =>
    unwrap(
      apiClient.get<ApiResponse<ProductComment[]>>(
        `${BASE}/${productId}/comments`,
      ),
    ),

  getReviews: (productId: number) =>
    unwrap(
      apiClient.get<ApiResponse<ProductReview[]>>(
        `${BASE}/${productId}/reviews`,
      ),
    ),

  // -------- By Slug --------
  getDetailBySlug: (slug: string) =>
    unwrap(
      apiClient.get<ApiResponse<ProductDetail>>(
        `${BASE}/by-slug/${encodeURIComponent(slug)}`,
      ),
    ),

  getContextBySlug: (slug: string) =>
    unwrap(
      apiClient.get<ApiResponse<CurrentUserContext>>(
        `${BASE}/by-slug/${encodeURIComponent(slug)}/context`,
      ),
    ),

  getCommentsBySlug: (slug: string) =>
    unwrap(
      apiClient.get<ApiResponse<ProductComment[]>>(
        `${BASE}/by-slug/${encodeURIComponent(slug)}/comments`,
      ),
    ),

  getReviewsBySlug: (slug: string) =>
    unwrap(
      apiClient.get<ApiResponse<ProductReview[]>>(
        `${BASE}/by-slug/${encodeURIComponent(slug)}/reviews`,
      ),
    ),

  // -------- Mutations (luôn dùng productId thật) --------
  createComment: (body: CreateProductCommentRequest) =>
    unwrap(
      apiClient.post<ApiResponse<ProductComment>>(`${BASE}/comments`, body),
    ),

  deleteComment: (commentId: number) =>
    unwrap(
      apiClient.delete<ApiResponse<number>>(`${BASE}/comments/${commentId}`),
    ),

  createReview: (body: CreateProductReviewRequest) =>
    unwrap(apiClient.post<ApiResponse<ProductReview>>(`${BASE}/reviews`, body)),

  deleteReview: (reviewId: number) =>
    unwrap(
      apiClient.delete<ApiResponse<number>>(`${BASE}/reviews/${reviewId}`),
    ),
};
