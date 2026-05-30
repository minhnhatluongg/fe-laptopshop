import { apiClient, API_V1, unwrap } from "./client";
import type { ApiResponse } from "./types";

export type BulkJobType = "ApplyDiscount" | "ApplyPrice" | "ToggleStatus" | "Delete";

export interface BulkActionRequest {
  productIds: number[];
  type: BulkJobType;
  discountValue?: number;        // 0–100 %
  priceChangePercent?: number;   // -20 = giảm 20%, +10 = tăng 10%
  absolutePrice?: number;
  isActive?: boolean;
}

export interface BulkJobStarted {
  jobId: string;
  totalCount: number;
  message: string;
}

export interface BulkJobStatus {
  jobId: string;
  type: string;
  status: "Queued" | "Running" | "Completed" | "Failed";
  statusLabel: string;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failCount: number;
  progressPercent: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

const BASE = `${API_V1}/products`;

export const bulkApi = {
  execute: (body: BulkActionRequest) =>
    unwrap(apiClient.post<ApiResponse<BulkJobStarted>>(`${BASE}/bulk`, body)),

  getJob: (jobId: string) =>
    unwrap(apiClient.get<ApiResponse<BulkJobStatus>>(`${BASE}/bulk/jobs/${jobId}`)),

  getMyJobs: () =>
    unwrap(apiClient.get<ApiResponse<BulkJobStatus[]>>(`${BASE}/bulk/jobs`)),
};
