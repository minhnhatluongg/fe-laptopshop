import { apiClient, API_V1, unwrap } from "./client";
import type { ApiResponse } from "./types";

export interface LoyaltyTierDto {
  id: number;
  name: string;
  minSpend: number;
  discountPercent: number;
  pointsMultiplier: number;
  isActive: boolean;
}

export interface UpdateLoyaltyTierDto {
  name?: string;
  minSpend?: number;
  discountPercent?: number;
  pointsMultiplier?: number;
  isActive?: boolean;
}

const BASE = `${API_V1}/loyaltytiers`;

export const loyaltyTierApi = {
  getAll: () => unwrap(apiClient.get<ApiResponse<LoyaltyTierDto[]>>(BASE)),

  create: (body: LoyaltyTierDto) =>
    unwrap(apiClient.post<ApiResponse<LoyaltyTierDto>>(BASE, body)),

  update: (id: number, body: UpdateLoyaltyTierDto) =>
    unwrap(apiClient.put<ApiResponse<LoyaltyTierDto>>(`${BASE}/${id}`, body)),
};
