import { useCallback, useEffect, useRef, useState } from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Link } from "react-router-dom";
import { useInventoryHub, type InventoryUpdate } from "@/hooks/useInventoryHub";
import { HubConnectionState } from "@microsoft/signalr";
import {
  dashboardApi,
  type ChartQueryParams,
  type DashboardSummary,
  type MultiSeriesChart,
  type OrderStatusStat,
  type TopProduct,
} from "@/api/dashboard.api";
import { categoryApi } from "@/api/category.api";
import type { Category } from "@/api/types";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChartFilterBar, defaultFilter } from "@/components/ui/ChartFilterBar";
import { formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { cn } from "@/utils/cn";
import { useTheme } from "@/context/ThemeContext";

// ─── Generic chart data hook ──────────────────────────────────────────────────
function useChartData<T>(
  fetcher: (p: ChartQueryParams) => Promise<T>,
  params: ChartQueryParams,
) {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(params);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetcher(params)
      .then((d) => { if (live) setData(d); })
      .catch(console.error)
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading };
}

export default function AdminDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ── Real-time inventory via SignalR ───────────────────────────────────────
  const [liveUpdates, setLiveUpdates] = useState<InventoryUpdate[]>([]);
  const updatesRef = useRef<InventoryUpdate[]>([]);

  const handleInventoryUpdate = useCallback((update: InventoryUpdate) => {
    const next = [update, ...updatesRef.current].slice(0, 10); // keep last 10
    updatesRef.current = next;
    setLiveUpdates([...next]);
  }, []);

  const { state: hubState, isConnected, reconnect } = useInventoryHub({
    enabled: true,
    group: "admin",
    onInventoryUpdated: handleInventoryUpdate,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary]       = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState<OrderStatusStat[]>([]);

  const [revenueFilter, setRevenueFilter] = useState<ChartQueryParams>(defaultFilter());
  const [ordersFilter,  setOrdersFilter]  = useState<ChartQueryParams>(defaultFilter());
  const [usersFilter,   setUsersFilter]   = useState<ChartQueryParams>(defaultFilter());
  const [topFilter,     setTopFilter]     = useState<ChartQueryParams>({ ...defaultFilter(), limit: 10 });

  const revenue  = useChartData(dashboardApi.getRevenueChart, revenueFilter);
  const orders   = useChartData(dashboardApi.getOrdersChart,  ordersFilter);
  const users    = useChartData(dashboardApi.getUsersChart,   usersFilter);
  const topProds = useChartData(dashboardApi.getTopProducts,  topFilter);

  useEffect(() => {
    dashboardApi.getOverview()
      .then((d) => { setSummary(d.summary); setOrderStatus(d.orderStatus); })
      .catch(console.error)
      .finally(() => setSummaryLoading(false));
    categoryApi.getAll({ pageSize: 100 })
      .then((r) => setCategories(r.items ?? []))
      .catch(console.error);
  }, []);

  // ─── Chart style helpers ───────────────────────────────────────────────────
  const brand  = "#465fff", green = "#12b76a", red = "#f04438", purple = "#7a5af8";
  const grid   = isDark ? "#374151" : "#e5e7eb";
  const txt    = isDark ? "#9ca3af" : "#6b7280";
  const tip    = isDark ? ("dark" as const) : ("light" as const);
  const font   = "Be Vietnam Pro, Outfit, sans-serif";

  const baseOpts = (type: string, labels?: string[]): ApexOptions => ({
    chart: { type: type as any, toolbar: { show: false }, background: "transparent", fontFamily: font },
    theme: { mode: isDark ? "dark" : "light" },
    grid: { borderColor: grid, strokeDashArray: 4 },
    xaxis: {
      categories: labels ?? [],
      labels: { style: { colors: txt }, rotate: -30, maxHeight: 60 },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    dataLabels: { enabled: false },
    tooltip: { theme: tip },
    legend: { position: "top", horizontalAlign: "right", labels: { colors: txt } },
  });

  const labels  = (c: MultiSeriesChart | null | undefined) => c?.labels ?? [];
  const vals    = (c: MultiSeriesChart | null | undefined) =>
    (c?.series ?? []).map((s) => ({ name: s.name, data: s.data.map((d) => d.value) }));

  // revenue
  const revOpts: ApexOptions = {
    ...baseOpts("area", labels(revenue.data)),
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.03 } },
    yaxis: { labels: { style: { colors: txt }, formatter: (v) => `${(v / 1e6).toFixed(0)}M` } },
    tooltip: { theme: tip, y: { formatter: (v) => formatVND(v) } },
    colors: [brand],
  };

  // orders
  const ordOpts: ApexOptions = {
    ...baseOpts("bar", labels(orders.data)),
    plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
    yaxis: { labels: { style: { colors: txt } } },
    tooltip: { theme: tip, y: { formatter: (v) => `${v} đơn` } },
    colors: [brand, green, red],
  };

  // users
  const usrOpts: ApexOptions = {
    ...baseOpts("line", labels(users.data)),
    stroke: { curve: "smooth", width: 3 },
    markers: { size: 4, hover: { size: 6 } },
    yaxis: { labels: { style: { colors: txt } } },
    tooltip: { theme: tip, y: { formatter: (v) => `${v} users` } },
    colors: [purple],
  };

  // donut
  const donutOpts: ApexOptions = {
    chart: { type: "donut", background: "transparent", fontFamily: font },
    theme: { mode: isDark ? "dark" : "light" },
    labels: orderStatus.map((o) => o.statusLabel),
    colors: [brand, green, "#f79009", red, purple, "#0ba5ec", "#ee46bc"],
    plotOptions: {
      pie: {
        donut: {
          size: "60%",
          labels: { show: true, total: { show: true, label: "Tổng đơn", color: txt, fontSize: "13px" } },
        },
      },
    },
    legend: { position: "bottom", labels: { colors: txt } },
    tooltip: { theme: tip },
    dataLabels: { dropShadow: { enabled: false } },
  };

  const s = summary;

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-outfit text-title-sm font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-0.5 text-theme-sm text-gray-500 dark:text-gray-400">
            Mỗi biểu đồ có bộ lọc thời gian và danh mục độc lập.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/products" className="inline-flex h-9 items-center rounded-lg border border-gray-200 px-4 text-theme-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300">
            Sản phẩm
          </Link>
          <Link to="/admin/orders" className="inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-theme-sm font-medium text-white hover:bg-brand-600">
            Đơn hàng
          </Link>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon="📦" label="Sản phẩm"   value={s?.totalProducts}            loading={summaryLoading} />
        <MetricCard icon="👥" label="Khách hàng" value={s?.totalUsers}                loading={summaryLoading}
          sub={s ? `+${s.newUsersThisMonth} tháng này` : undefined} />
        <MetricCard icon="🛒" label="Đơn hàng"   value={s?.totalOrders}               loading={summaryLoading}
          sub={s ? `+${s.ordersThisMonth} tháng này` : undefined} delta={s?.orderGrowthPercent} />
        <MetricCard icon="💰" label="Doanh thu"  value={s ? formatVND(s.totalRevenue) : undefined}
          loading={summaryLoading}
          sub={s ? formatVND(s.revenueThisMonth) + " tháng này" : undefined} delta={s?.revenueGrowthPercent} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickStat label="Chờ xác nhận"  value={s?.pendingOrders}   color="warning" loading={summaryLoading} />
        <QuickStat label="Đã giao"        value={s?.deliveredOrders} color="success" loading={summaryLoading} />
        <QuickStat label="Đã huỷ"         value={s?.cancelledOrders} color="error"   loading={summaryLoading} />
      </div>

      {/* ── SignalR Live Feed ───────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            {/* Connection indicator */}
            <span className={cn(
              "flex h-2.5 w-2.5 rounded-full",
              isConnected
                ? "bg-success-500 shadow-[0_0_6px_theme(colors.success.500)]"
                : hubState === HubConnectionState.Reconnecting
                ? "bg-warning-500 animate-pulse"
                : "bg-gray-300 dark:bg-gray-600",
            )} />
            <h3 className="font-outfit text-base font-semibold text-gray-900 dark:text-white">
              Kho hàng thời gian thực
            </h3>
            <span className={cn(
              "text-theme-xs font-medium",
              isConnected ? "text-success-500" : "text-gray-400",
            )}>
              {isConnected ? "● Live" : hubState === HubConnectionState.Reconnecting ? "Đang kết nối..." : "Offline"}
            </span>
          </div>
          {!isConnected && hubState !== HubConnectionState.Reconnecting && (
            <button
              type="button"
              onClick={() => void reconnect()}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-theme-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
            >
              Kết nối lại
            </button>
          )}
        </div>

        {liveUpdates.length === 0 ? (
          <div className="px-5 py-6 text-center text-theme-sm text-gray-400 dark:text-gray-500">
            {isConnected
              ? "Đang chờ cập nhật kho... Khi có đơn hàng mới, tồn kho sẽ thay đổi ở đây."
              : "Chưa kết nối SignalR — deploy BE và đảm bảo /hubs/inventory accessible."}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {liveUpdates.slice(0, 5).map((u, i) => (
              <li key={`${u.productId}-${u.updatedAt}-${i}`}
                className={cn(
                  "flex items-center gap-4 px-5 py-3 text-theme-sm transition-colors",
                  i === 0 && "bg-brand-50/40 dark:bg-brand-500/5",
                )}>
                <span className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  u.newStock <= 0
                    ? "bg-error-100 text-error-600 dark:bg-error-500/20 dark:text-error-400"
                    : u.newStock <= 5
                    ? "bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400"
                    : "bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-500",
                )}>
                  {u.newStock <= 0 ? "!" : u.newStock <= 5 ? "⚠" : "↓"}
                </span>
                <div className="flex-1">
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    Sản phẩm #{u.productId}
                  </span>
                  <span className="ml-2 text-gray-500 dark:text-gray-400">
                    tồn kho →{" "}
                    <strong className={cn(
                      "font-semibold",
                      u.newStock <= 0 ? "text-error-500" :
                      u.newStock <= 5 ? "text-warning-600" : "text-success-600",
                    )}>
                      {u.newStock}
                    </strong>
                    {u.newStock <= 0 && " (Hết hàng)"}
                    {u.newStock > 0 && u.newStock <= 5 && " (Sắp hết)"}
                  </span>
                </div>
                <span className="shrink-0 text-theme-xs text-gray-400">
                  {new Date(u.updatedAt).toLocaleTimeString("vi-VN")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Revenue chart ──────────────────────────────────────────────────── */}
      <ChartCard
        title="Doanh thu"
        subtitle="Chỉ tính đơn Delivered / Completed"
        comparison={revenue.data?.comparison}
        filter={revenueFilter}
        onFilter={setRevenueFilter}
        categories={categories}
        showCategory
        loading={revenue.loading}
      >
        {revenue.loading
          ? <ChartSkeleton h={280} />
          : <ReactApexChart type="area" series={vals(revenue.data)} options={revOpts} height={280} />
        }
      </ChartCard>

      {/* ── Orders + Donut ─────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        <ChartCard
          className="lg:col-span-7"
          title="Đơn hàng"
          subtitle="Tổng / hoàn thành / đã huỷ"
          comparison={orders.data?.comparison}
          compUnit="đơn"
          filter={ordersFilter}
          onFilter={setOrdersFilter}
          categories={categories}
          showCategory
          loading={orders.loading}
        >
          {orders.loading
            ? <ChartSkeleton h={240} />
            : <ReactApexChart type="bar" series={vals(orders.data)} options={ordOpts} height={240} />
          }
        </ChartCard>

        <Card className="lg:col-span-5">
          <CardHeader title="Trạng thái đơn" subtitle="Phân bố toàn thời gian" />
          {summaryLoading || !orderStatus.length
            ? <ChartSkeleton h={240} />
            : <ReactApexChart type="donut" series={orderStatus.map((o) => o.count)} options={donutOpts} height={240} />
          }
        </Card>
      </div>

      {/* ── Users line ─────────────────────────────────────────────────────── */}
      <ChartCard
        title="Người dùng mới"
        comparison={users.data?.comparison}
        compUnit="users"
        filter={usersFilter}
        onFilter={setUsersFilter}
        loading={users.loading}
      >
        {users.loading
          ? <ChartSkeleton h={200} />
          : <ReactApexChart type="line" series={vals(users.data)} options={usrOpts} height={200} />
        }
      </ChartCard>

      {/* ── Top products ───────────────────────────────────────────────────── */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-outfit text-lg font-semibold text-gray-900 dark:text-white">Top sản phẩm bán chạy</h3>
            <p className="mt-0.5 text-theme-sm text-gray-500 dark:text-gray-400">Theo doanh thu trong khoảng thời gian chọn</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChartFilterBar value={topFilter} onChange={setTopFilter} categories={categories} showCategory loading={topProds.loading} />
            <select
              value={topFilter.limit ?? 10}
              onChange={(e) => setTopFilter((f) => ({ ...f, limit: Number(e.target.value) }))}
              className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-theme-xs text-gray-600 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
            >
              {[5, 10, 20].map((n) => <option key={n} value={n}>Top {n}</option>)}
            </select>
          </div>
        </div>
        <TopProductsTable data={topProds.data} loading={topProds.loading} />
      </Card>
    </div>
  );
}

// ─── ChartCard wrapper ────────────────────────────────────────────────────────
function ChartCard({
  title, subtitle, comparison, compUnit, filter, onFilter,
  categories, showCategory, loading, children, className,
}: {
  title: string; subtitle?: string;
  comparison?: { current: number; previous: number; growthPercent: number } | null;
  compUnit?: string;
  filter: ChartQueryParams; onFilter: (v: ChartQueryParams) => void;
  categories?: { id: number; name: string }[]; showCategory?: boolean;
  loading: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={className}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-outfit text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {comparison && (
              <Badge color={comparison.growthPercent >= 0 ? "success" : "error"} size="sm">
                {comparison.growthPercent >= 0 ? "↑" : "↓"} {Math.abs(comparison.growthPercent).toFixed(1)}%
                {compUnit && ` • ${comparison.current.toLocaleString()} ${compUnit}`}
              </Badge>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-theme-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        <ChartFilterBar
          value={filter} onChange={onFilter}
          categories={categories} showCategory={showCategory}
          loading={loading}
        />
      </div>
      {children}
    </Card>
  );
}

// ─── Top products table ───────────────────────────────────────────────────────
function TopProductsTable({ data, loading }: { data: TopProduct[] | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    );
  }
  if (!data?.length) {
    return <p className="py-10 text-center text-theme-sm text-gray-400">Chưa có dữ liệu trong khoảng thời gian này.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            {["#", "Sản phẩm", "Thương hiệu", "Đã bán", "Đơn", "Doanh thu"].map((h) => (
              <th key={h} className="pb-3 pr-4 text-left text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 first:pl-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.map((p, i) => (
            <tr key={p.productId}>
              <td className="py-3 pr-4 w-8 text-theme-xs font-bold text-gray-400">{i + 1}</td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    <img
                      src={p.imageUrl ? getImageUrl(p.imageUrl) : IMAGE_PLACEHOLDER}
                      onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                      alt={p.productName} className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="line-clamp-1 max-w-[200px] text-theme-sm font-medium text-gray-900 dark:text-white">
                    {p.productName}
                  </span>
                </div>
              </td>
              <td className="py-3 pr-4 text-theme-sm text-gray-500">{p.brandName ?? "—"}</td>
              <td className="py-3 pr-4 text-theme-sm text-gray-700 dark:text-gray-300">{p.quantitySold}</td>
              <td className="py-3 pr-4 text-theme-sm text-gray-700 dark:text-gray-300">{p.orderCount}</td>
              <td className="py-3 text-theme-sm font-bold text-brand-600 dark:text-brand-400">{formatVND(p.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────
function MetricCard({
  icon, label, value, sub, delta, loading,
}: { icon: string; label: string; value?: string | number; sub?: string; delta?: number; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-2xl dark:bg-brand-500/[0.12]">
          {icon}
        </div>
        {delta !== undefined && !loading && (
          <Badge color={delta >= 0 ? "success" : "error"} size="sm">
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
          </Badge>
        )}
      </div>
      <div className="mt-4">
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">{label}</p>
        {loading
          ? <div className="mt-1.5 h-7 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          : <p className="mt-1 font-outfit text-2xl font-bold text-gray-900 dark:text-white">{value ?? "—"}</p>
        }
        {sub && !loading && <p className="mt-1 text-theme-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function QuickStat({
  label, value, color, loading,
}: { label: string; value?: number; color: "warning" | "success" | "error"; loading: boolean }) {
  const cls: Record<string, string> = {
    warning: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
    success: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500",
    error:   "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
  };
  return (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-3.5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-theme-sm text-gray-600 dark:text-gray-400">{label}</p>
      {loading
        ? <div className="h-6 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        : <span className={cn("rounded-full px-3 py-1 text-theme-sm font-bold", cls[color])}>{value ?? 0}</span>
      }
    </div>
  );
}

function ChartSkeleton({ h }: { h: number }) {
  return <div className="animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" style={{ height: h }} />;
}
