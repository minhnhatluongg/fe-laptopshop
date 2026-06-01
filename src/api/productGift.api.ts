import { apiClient, API_V1, unwrap } from "./client";
import type { ApiResponse } from "./types";

export interface ProductGiftDto {
  id: number;
  productId: number;
  giftProductId: number;
  giftProductName: string;
  giftProductSlug?: string | null;
  giftImageUrl?: string | null;
  giftOriginalPrice: number;
  quantity: number;
  giftPrice: number;
  note?: string | null;
  isActive: boolean;
  /** (giftOriginalPrice - giftPrice) × quantity */
  savingAmount: number;
}

export interface AddProductGiftDto {
  productId: number;
  giftProductId: number;
  quantity?: number;
  giftPrice?: number;
  note?: string | null;
  isActive?: boolean;
}

const BASE = `${API_V1}/productgifts`;

export const productGiftApi = {
  /** Public — lấy gift của 1 product */
  getByProduct: (productId: number) =>
    unwrap(apiClient.get<ApiResponse<ProductGiftDto[]>>(`${BASE}/by-product/${productId}`)),

  /** Admin — thêm gift */
  add: (body: AddProductGiftDto) =>
    unwrap(apiClient.post<ApiResponse<ProductGiftDto>>(BASE, body)),

  /** Admin — xóa gift */
  delete: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<number>>(`${BASE}/${id}`)),

  /** Admin — bulk gán N quà cho M product */
  bulkAdd: (body: BulkAddGiftsRequest) =>
    unwrap(apiClient.post<ApiResponse<BulkAddGiftsResult>>(`${BASE}/bulk`, body)),
};

export interface BulkAddGiftsRequest {
  productIds: number[];
  gifts: Array<{
    giftProductId: number;
    quantity?: number;
    giftPrice?: number;
    note?: string | null;
  }>;
}

export interface BulkAddGiftsResult {
  created: number;
  skipped: number;
  errors: string[];
}
