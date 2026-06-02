import { apiClient, API_V1, unwrap } from "./client";
import type { ApiResponse } from "./types";

export interface BannerDto {
  id: number;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  position: string;
  displayOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  createdAt: string;
  styleConfig?: string | null;
}

export interface CreateBannerDto {
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  position?: string;
  displayOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  styleConfig?: string | null;
}

export interface UpdateBannerDto extends Partial<CreateBannerDto> {
  id: number;
}

const BASE = `${API_V1}/banners`;

export const bannerApi = {
  // Public
  getActive: (position = "HOMEPAGE_TOP") =>
    unwrap(apiClient.get<ApiResponse<BannerDto[]>>(`${BASE}/active`, { params: { position } })),

  // Admin
  getAll: () =>
    unwrap(apiClient.get<ApiResponse<BannerDto[]>>(BASE)),

  getById: (id: number) =>
    unwrap(apiClient.get<ApiResponse<BannerDto>>(`${BASE}/${id}`)),

  create: (body: CreateBannerDto) =>
    unwrap(apiClient.post<ApiResponse<BannerDto>>(BASE, body)),

  update: ({ id, ...body }: UpdateBannerDto) =>
    unwrap(apiClient.put<ApiResponse<BannerDto>>(`${BASE}/${id}`, { id, ...body })),

  delete: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<number>>(`${BASE}/${id}`)),

  setOrder: (id: number, order: number) =>
    unwrap(apiClient.put<ApiResponse<BannerDto>>(`${BASE}/${id}/order`, null, { params: { order } })),

  aiSuggest: (imageUrl: string) =>
    unwrap(apiClient.post<ApiResponse<{ title: string; subtitle: string; source: string }>>(
      `${BASE}/ai-suggest`, { imageUrl }
    )),
};
