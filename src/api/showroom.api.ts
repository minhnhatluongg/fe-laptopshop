import { apiClient, API_V1, unwrap } from "./client";
import type { ApiResponse } from "./types";

export interface ShowroomDto {
  id: number;
  name: string;
  address: string;
  phone?: string | null;
  email?: string | null;
  openingHours?: string | null;
  mapEmbedUrl?: string | null;
  isActive: boolean;
  displayOrder: number;
  /** "Open" | "Closed" | "Maintenance" */
  status: string;
}

export interface UpsertShowroomDto {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  openingHours?: string;
  mapEmbedUrl?: string;
  isActive: boolean;
  displayOrder: number;
  status: string;
}

export const SHOWROOM_STATUSES = [
  { value: "Open",        label: "Đang mở cửa",   color: "text-success-600 bg-success-50 dark:bg-success-500/10 dark:text-success-400" },
  { value: "Closed",      label: "Đóng cửa",       color: "text-error-600 bg-error-50 dark:bg-error-500/10 dark:text-error-400"         },
  { value: "Maintenance", label: "Bảo trì",         color: "text-warning-600 bg-warning-50 dark:bg-warning-500/10 dark:text-warning-400" },
] as const;

const BASE = `${API_V1}/showrooms`;

export const showroomApi = {
  getActive: () =>
    unwrap(apiClient.get<ApiResponse<ShowroomDto[]>>(BASE)),

  getAll: () =>
    unwrap(apiClient.get<ApiResponse<ShowroomDto[]>>(`${BASE}/all`)),

  getById: (id: number) =>
    unwrap(apiClient.get<ApiResponse<ShowroomDto>>(`${BASE}/${id}`)),

  create: (dto: UpsertShowroomDto) =>
    unwrap(apiClient.post<ApiResponse<ShowroomDto>>(BASE, dto)),

  update: (id: number, dto: UpsertShowroomDto) =>
    unwrap(apiClient.put<ApiResponse<ShowroomDto>>(`${BASE}/${id}`, dto)),

  delete: (id: number) =>
    unwrap(apiClient.delete<ApiResponse<null>>(`${BASE}/${id}`)),
};
