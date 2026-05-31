import { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient, API_V1, unwrap } from "@/api/client";
import type { ApiResponse } from "@/api/types";
import { cn } from "@/utils/cn";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WarrantyResult {
  id: number;
  warrantyCode: string;
  productName: string;
  serialNumber?: string | null;
  orderNumber: string;
  purchaseDate: string;
  startDate: string;
  endDate: string;
  warrantyMonths: number;
  status: string;
  statusLabel: string;
  isExpired: boolean;
  remainingDays: number;
}

// ── API call — lookup bằng WarrantyCode hoặc SerialNumber ─────────────────────
const lookupWarranty = async (query: string): Promise<WarrantyResult> =>
  unwrap(
    apiClient.get<ApiResponse<WarrantyResult>>(
      `${API_V1}/warranty/lookup?query=${encodeURIComponent(query)}`,
    ),
  );

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  Pending:    { label: "Chờ xác nhận",  color: "bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300" },
  Confirmed:  { label: "Đã xác nhận",   color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  Processing: { label: "Đang xử lý",    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  Shipped:    { label: "Đang giao",      color: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300" },
  Delivered:  { label: "Đã giao hàng",  color: "bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300" },
  Completed:  { label: "Hoàn thành",    color: "bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300" },
  Cancelled:  { label: "Đã hủy",        color: "bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-300" },
  Returned:   { label: "Đã hoàn trả",   color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300" },
  Refunded:   { label: "Đã hoàn tiền",  color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", s.color)}>
      {s.label}
    </span>
  );
}

// ── Benefit cards ─────────────────────────────────────────────────────────────
const BENEFITS = [
  { icon: "🛡️", title: "Bảo hành chính hãng", desc: "Tối thiểu 12 tháng tại trung tâm hãng" },
  { icon: "🔄", title: "Đổi trả 30 ngày",      desc: "Hoàn tiền nếu lỗi nhà sản xuất" },
  { icon: "🏠", title: "Bảo hành tại nhà",     desc: "Hỗ trợ một số dòng Apple & Dell" },
  { icon: "📞", title: "Hỗ trợ 7/7",           desc: "Hotline 1900 5301 (8:00 – 22:00)" },
];

// ── Tab: Tra cứu phiếu bảo hành ──────────────────────────────────────────────
function WarrantyTab() {
  const [query, setQuery]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<WarrantyResult | null>(null);
  const [error, setError]     = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await lookupWarranty(query.trim());
      setResult(data);
    } catch {
      setError("Không tìm thấy phiếu bảo hành. Vui lòng kiểm tra lại mã hoặc số serial.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Nhập <strong>mã phiếu bảo hành</strong> (dạng{" "}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">WR-2025-123456</code>)
        hoặc <strong>số serial</strong> in trên máy / hộp sản phẩm.
      </p>

      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          placeholder="VD: WR-2025-123456 hoặc C02XG0JHJGH5"
          className="h-12 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium tracking-wide text-gray-800 placeholder:text-gray-400 placeholder:tracking-normal focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="h-12 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : "Tra cứu"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
          <span className="text-2xl">😔</span>
          <div>
            <p className="font-semibold text-error-700 dark:text-error-400">Không tìm thấy</p>
            <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">

          {/* Header: mã + trạng thái */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Mã phiếu bảo hành</p>
              <p className="font-outfit text-xl font-bold tracking-wide text-gray-900 dark:text-white">
                {result.warrantyCode}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">Đơn hàng #{result.orderNumber}</p>
            </div>
            <StatusBadge status={result.isExpired ? "Expired" : result.status} />
          </div>

          {/* Thông tin sản phẩm */}
          <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Sản phẩm</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{result.productName}</p>
            {result.serialNumber && (
              <p className="mt-0.5 text-xs text-gray-500">
                Serial: <span className="font-mono font-medium">{result.serialNumber}</span>
              </p>
            )}
          </div>

          {/* Thời hạn bảo hành */}
          <div className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm dark:bg-white/3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-400">Ngày mua</p>
              <p className="font-medium text-gray-800 dark:text-white">
                {new Date(result.purchaseDate).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Bảo hành đến</p>
              <p className={cn("font-semibold", result.isExpired ? "text-error-500" : "text-success-600 dark:text-success-400")}>
                {new Date(result.endDate).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Thời hạn</p>
              <p className="font-medium text-gray-800 dark:text-white">{result.warrantyMonths} tháng</p>
            </div>
          </div>

          {/* Thanh còn lại */}
          {!result.isExpired && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-gray-400">Thời gian bảo hành còn lại</span>
                <span className="font-semibold text-success-600 dark:text-success-400">
                  {result.remainingDays} ngày
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-success-500 transition-all"
                  style={{ width: `${Math.min(100, (result.remainingDays / (result.warrantyMonths * 30)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className={cn(
            "rounded-xl border p-3 text-sm",
            result.isExpired
              ? "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
              : "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400"
          )}>
            {result.isExpired
              ? "⚠️ Phiếu bảo hành đã hết hạn. Liên hệ 1900 5301 để được tư vấn dịch vụ sửa chữa."
              : `🛡️ ${result.statusLabel} — Liên hệ 1900 5301 để được hỗ trợ bảo hành tại nhà.`
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Tra cứu IMEI ─────────────────────────────────────────────────────────
function ImeiTab() {
  const [imei, setImei] = useState("");

  return (
    <div>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Nhập số IMEI (15 chữ số) in trên hộp máy hoặc vào <strong>Cài đặt → Giới thiệu</strong> để tra cứu thông tin bảo hành.
      </p>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex gap-3"
      >
        <input
          value={imei}
          onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
          placeholder="Nhập số IMEI (15 chữ số)"
          className="h-12 flex-1 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium tracking-widest text-gray-800 placeholder:text-gray-400 placeholder:tracking-normal focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        />
        <button
          type="submit"
          disabled={imei.length < 15}
          className="h-12 rounded-xl bg-brand-500 px-6 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          Tra cứu
        </button>
      </form>
      <div className="mt-6 rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400">
        ℹ️ Tính năng tra cứu IMEI đang được phát triển. Vui lòng gọi <strong>1900 5301</strong> để tra cứu nhanh.
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WarrantyPage() {
  const [tab, setTab] = useState<"warranty" | "imei">("warranty");

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10 md:px-8">

      {/* ── Hero ── */}
      <div className="mb-10 text-center">
        <span className="inline-block rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          Bảo hành
        </span>
        <h1 className="mt-3 font-outfit text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
          Tra cứu bảo hành
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-gray-500 dark:text-gray-400">
          Kiểm tra tình trạng bảo hành sản phẩm bằng mã đơn hàng hoặc số IMEI của thiết bị.
        </p>
      </div>

      {/* ── Benefits ── */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <span className="text-2xl">{b.icon}</span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{b.title}</p>
              <p className="text-xs text-gray-500">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Lookup card ── */}
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">

          {/* Tab switcher */}
          <div className="mb-6 flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
            {[
              { key: "warranty" as const, label: "Tra cứu phiếu bảo hành" },
              { key: "imei"    as const, label: "Tra cứu IMEI" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "flex-1 rounded-lg py-2.5 text-sm font-semibold transition",
                  tab === key
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "warranty" ? <WarrantyTab /> : <ImeiTab />}
        </div>

        {/* Help prompt */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Cần hỗ trợ thêm?{" "}
          <Link to="/contact" className="font-semibold text-brand-500 hover:underline">
            Liên hệ ngay →
          </Link>
        </p>
      </div>
    </div>
  );
}
