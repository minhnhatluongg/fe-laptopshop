import { apiClient, API_V1, unwrap } from "./client";
import type { ApiResponse } from "./types";

export interface DashboardSummary {
  totalProducts: number;
  totalBrands: number;
  totalCategories: number;
  totalUsers: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  revenueThisMonth: number;
  ordersThisMonth: number;
  newUsersThisMonth: number;
  revenueGrowthPercent: number;
  orderGrowthPercent: number;
}

export interface MonthlyStat {
  year: number;
  month: number;
  monthLabel: string;
  orderCount: number;
  revenue: number;
  newUsers: number;
  newProducts: number;
}

export interface QuarterlyStat {
  year: number;
  quarter: number;
  quarterLabel: string;
  orderCount: number;
  revenue: number;
  newUsers: number;
}

export interface OrderStatusStat {
  status: string;
  statusLabel: string;
  count: number;
  revenue: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  slug?: string;
  brandName?: string;
  imageUrl?: string;
  orderCount: number;
  quantitySold: number;
  revenue: number;
}

export interface DashboardOverview {
  summary: DashboardSummary;
  monthly12: MonthlyStat[];
  quarterly4: QuarterlyStat[];
  orderStatus: OrderStatusStat[];
  topProducts: TopProduct[];
}

// ─── Flexible chart types ────────────────────────────────────────────────────
export interface ChartDataPoint {
  label: string; value: number; count: number; dateKey?: string;
}
export interface ChartSeries { name: string; data: ChartDataPoint[]; }
export interface ComparisonMeta {
  current: number; previous: number; growthPercent: number;
}
export interface MultiSeriesChart {
  labels: string[];
  series: ChartSeries[];
  comparison?: ComparisonMeta;
}
export interface ChartQueryParams {
  from?: string;       // "YYYY-MM-DD"
  to?: string;
  categoryId?: number;
  brandId?: number;
  groupBy?: "auto" | "day" | "week" | "month";
  limit?: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────
const BASE = `${API_V1}/dashboard`;

export const dashboardApi = {
  getOverview: (year?: number) =>
    unwrap(apiClient.get<ApiResponse<DashboardOverview>>(`${BASE}/overview`,
      { params: year ? { year } : undefined })),

  getRevenueChart: (params: ChartQueryParams) =>
    unwrap(apiClient.get<ApiResponse<MultiSeriesChart>>(`${BASE}/chart/revenue`, { params })),

  getOrdersChart: (params: ChartQueryParams) =>
    unwrap(apiClient.get<ApiResponse<MultiSeriesChart>>(`${BASE}/chart/orders`, { params })),

  getUsersChart: (params: ChartQueryParams) =>
    unwrap(apiClient.get<ApiResponse<MultiSeriesChart>>(`${BASE}/chart/users`, { params })),

  getTopProducts: (params: ChartQueryParams) =>
    unwrap(apiClient.get<ApiResponse<TopProduct[]>>(`${BASE}/chart/top-products`, { params })),
};
