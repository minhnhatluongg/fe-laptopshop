import { apiClient, API_V1, unwrap } from "./client";
import type { ApiResponse } from "./types";

export interface GiftDto {
  id: number;
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  stock: number;
  totalDistributed: number;
  isActive: boolean;
  createdAt: string;
  createdBy?: string | null;
}

export interface UpsertGiftDto {
  name: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  stock: number;
  isActive: boolean;
}

export interface ProductGiftItemDto {
  id: number;
  productId: number;
  giftId: number;
  giftName: string;
  giftImageUrl?: string | null;
  stock: number;
  quantity: number;
  giftPrice: number;
  note?: string | null;
  isActive: boolean;
}

export interface GiftStatPoint { label: string; quantity: number; }
export interface GiftTopItem   { giftId: number; name: string; imageUrl?: string | null; distributed: number; }
export interface GiftStatsDto {
  totalGifts: number;
  activeGifts: number;
  totalDistributed: number;
  lowStock: number;
  byMonth: GiftStatPoint[];
  byQuarter: GiftStatPoint[];
  topGifts: GiftTopItem[];
}

const BASE = `${API_V1}/gifts`;

export const giftApi = {
  // ── Catalog ──────────────────────────────────────────────────────────────
  getAll: (activeOnly = false) =>
    unwrap(apiClient.get<ApiResponse<GiftDto[]>>(BASE, { params: { activeOnly } })),

  getById: (id: number) =>
    unwrap(apiClient.get<ApiResponse<GiftDto>>(`${BASE}/${id}`)),

  create: (body: UpsertGiftDto) =>
    unwrap(apiClient.post<ApiResponse<GiftDto>>(BASE, body)),

  update: (id: number, body: UpsertGiftDto) =>
    unwrap(apiClient.put<ApiResponse<GiftDto>>(`${BASE}/${id}`, body)),

  delete: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<object>>(`${BASE}/${id}`)),

  // ── ProductGifts ─────────────────────────────────────────────────────────
  getByProduct: (productId: number) =>
    unwrap(apiClient.get<ApiResponse<ProductGiftItemDto[]>>(`${BASE}/by-product/${productId}`)),

  addToProduct: (productId: number, body: { giftId: number; quantity: number; giftPrice: number; note?: string }) =>
    unwrap(apiClient.post<ApiResponse<object>>(`${BASE}/by-product/${productId}`, body)),

  removeFromProduct: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<object>>(`${BASE}/product-gift/${id}`)),

  // ── Stats ─────────────────────────────────────────────────────────────────
  getStats: (year?: number) =>
    unwrap(apiClient.get<ApiResponse<GiftStatsDto>>(`${BASE}/stats`, { params: year ? { year } : {} })),
};
