import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { apiClient, API_V1, unwrap } from "@/api/client";
import type { ApiResponse } from "@/api/types";
import { cn } from "@/utils/cn";

/* ──────────────────────────────────────────────────────────────────────────
 * Trang Tra cứu bảo hành — phong cách BRUTALIST:
 *   monospace · viền dày · góc vuông · đổ bóng cứng (offset) · tương phản cao.
 * ────────────────────────────────────────────────────────────────────────── */

// Lớp dùng chung cho khối brutalist
const BRUT = "border-2 border-gray-900 dark:border-white";
const SHADOW = "shadow-[5px_5px_0_0_#111827] dark:shadow-[5px_5px_0_0_#f9fafb]";
const PRESS = "transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none";

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

const lookupWarranty = async (query: string): Promise<WarrantyResult> =>
  unwrap(
    apiClient.get<ApiResponse<WarrantyResult>>(
      `${API_V1}/warranty/lookup?query=${encodeURIComponent(query)}`,
    ),
  );

// ── Icon helper (stroke dày cho cảm giác brutalist) ──────────────────────────
function Ic({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

// ── Status badge — khối phẳng viền đen, chữ in hoa mono ──────────────────────
const STATUS_MAP: Record<string, { label: string; bg: string }> = {
  Pending:    { label: "Chờ xác nhận", bg: "bg-warning-300" },
  Confirmed:  { label: "Đã xác nhận",  bg: "bg-blue-300" },
  Processing: { label: "Đang xử lý",   bg: "bg-blue-300" },
  Shipped:    { label: "Đang giao",    bg: "bg-brand-300" },
  Delivered:  { label: "Đã giao hàng", bg: "bg-success-300" },
  Completed:  { label: "Hoàn thành",   bg: "bg-success-300" },
  Cancelled:  { label: "Đã hủy",       bg: "bg-error-300" },
  Returned:   { label: "Đã hoàn trả",  bg: "bg-gray-300" },
  Refunded:   { label: "Đã hoàn tiền", bg: "bg-gray-300" },
  Expired:    { label: "Hết hạn",      bg: "bg-error-300" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, bg: "bg-gray-300" };
  return (
    <span className={cn("inline-block border-2 border-gray-900 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-gray-900", s.bg)}>
      {s.label}
    </span>
  );
}

// ── Benefits ──────────────────────────────────────────────────────────────────
const BENEFITS = [
  { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", title: "Bảo hành chính hãng", desc: "Tối thiểu 12 tháng tại trung tâm hãng" },
  { icon: "M23 4v6h-6|M1 20v-6h6|M3.51 9a9 9 0 0 1 14.85-3.36L23 10|M1 14l4.64 4.36A9 9 0 0 0 20.49 15", title: "Đổi trả 30 ngày", desc: "Hoàn tiền nếu lỗi nhà sản xuất" },
  { icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10", title: "Bảo hành tại nhà", desc: "Hỗ trợ một số dòng Apple và Dell" },
  { icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z", title: "Hỗ trợ 7/7", desc: "Hotline 0798175906 (8:00 - 22:00)" },
];

// Khối thông báo brutalist (error / warning / success)
function Notice({ tone, icon, children }: { tone: "error" | "warning" | "success"; icon: string; children: ReactNode }) {
  const bg = { error: "bg-error-100", warning: "bg-warning-100", success: "bg-success-100" }[tone];
  return (
    <div className={cn("flex items-start gap-3 p-4 font-mono text-theme-sm text-gray-900", BRUT, bg)}>
      <span className="shrink-0"><Ic d={icon} size={18} /></span>
      <div>{children}</div>
    </div>
  );
}

const ICON_ALERT = "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01";
const ICON_INFO  = "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 16v-4|M12 8h.01";
const ICON_SHIELD = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z";

// ── Tab: Tra cứu phiếu bảo hành ──────────────────────────────────────────────
function WarrantyTab() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WarrantyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      setResult(await lookupWarranty(query.trim()));
    } catch {
      setError("Không tìm thấy phiếu bảo hành. Vui lòng kiểm tra lại mã hoặc số serial.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="mb-6 font-mono text-theme-sm text-gray-600 dark:text-gray-300">
        Nhập <strong className="font-bold">mã phiếu bảo hành</strong> (dạng{" "}
        <code className="border border-gray-900 bg-warning-200 px-1 text-gray-900 dark:border-white">WR-2025-123456</code>)
        hoặc <strong className="font-bold">số serial</strong> in trên máy / hộp sản phẩm.
      </p>

      <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          placeholder="VD: WR-2025-123456 hoặc C02XG0JHJGH5"
          className={cn(
            "h-12 flex-1 bg-white px-4 font-mono text-theme-sm font-medium tracking-wide text-gray-900 placeholder:text-gray-400 placeholder:tracking-normal focus:outline-none focus:shadow-[4px_4px_0_0_#111827] dark:bg-gray-900 dark:text-white dark:focus:shadow-[4px_4px_0_0_#f9fafb]",
            BRUT,
          )}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className={cn(
            "flex h-12 items-center justify-center bg-brand-500 px-7 font-mono text-theme-sm font-bold uppercase tracking-wide text-white disabled:opacity-50",
            BRUT, SHADOW, PRESS,
          )}
        >
          {loading ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : "Tra cứu"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mt-6">
          <Notice tone="error" icon={ICON_ALERT}>
            <p className="font-bold uppercase">Không tìm thấy</p>
            <p className="mt-0.5">{error}</p>
          </Notice>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={cn("mt-6 space-y-5 bg-white p-6 dark:bg-gray-900", BRUT, SHADOW)}>

          {/* Header: mã + trạng thái */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-dashed border-gray-300 pb-4 dark:border-gray-700">
            <div>
              <p className="font-mono text-theme-xs font-bold uppercase tracking-wider text-gray-400">Mã phiếu bảo hành</p>
              <p className="mt-1 font-mono text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                {result.warrantyCode}
              </p>
              <p className="mt-0.5 font-mono text-theme-xs text-gray-500">Đơn hàng #{result.orderNumber}</p>
            </div>
            <StatusBadge status={result.isExpired ? "Expired" : result.status} />
          </div>

          {/* Thông tin sản phẩm */}
          <div className={cn("p-4", BRUT)}>
            <p className="font-mono text-theme-xs font-bold uppercase tracking-wider text-gray-400">Sản phẩm</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">{result.productName}</p>
            {result.serialNumber && (
              <p className="mt-0.5 font-mono text-theme-xs text-gray-500">
                Serial: <span className="font-bold text-gray-700 dark:text-gray-300">{result.serialNumber}</span>
              </p>
            )}
          </div>

          {/* Thời hạn bảo hành — 3 ô chia vạch */}
          <div className={cn("grid grid-cols-1 divide-y-2 divide-gray-900 sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0 dark:divide-white", BRUT)}>
            <Cell label="Ngày mua" value={new Date(result.purchaseDate).toLocaleDateString("vi-VN")} />
            <Cell
              label="Bảo hành đến"
              value={new Date(result.endDate).toLocaleDateString("vi-VN")}
              valueClass={result.isExpired ? "text-error-600" : "text-success-700 dark:text-success-400"}
            />
            <Cell label="Thời hạn" value={`${result.warrantyMonths} tháng`} />
          </div>

          {/* Thanh còn lại — blocky */}
          {!result.isExpired && (
            <div>
              <div className="mb-1.5 flex items-center justify-between font-mono text-theme-xs uppercase">
                <span className="text-gray-500">Thời gian còn lại</span>
                <span className="font-bold text-gray-900 dark:text-white">{result.remainingDays} ngày</span>
              </div>
              <div className={cn("h-4 w-full overflow-hidden bg-gray-100 dark:bg-gray-800", BRUT)}>
                <div
                  className="h-full bg-success-500"
                  style={{ width: `${Math.min(100, (result.remainingDays / (result.warrantyMonths * 30)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          {result.isExpired ? (
            <Notice tone="error" icon={ICON_ALERT}>
              Phiếu bảo hành đã hết hạn. Liên hệ <strong className="font-bold">0798175906</strong> để được tư vấn dịch vụ sửa chữa.
            </Notice>
          ) : (
            <Notice tone="success" icon={ICON_SHIELD}>
              {result.statusLabel}. Liên hệ <strong className="font-bold">0798175906</strong> để được hỗ trợ bảo hành tại nhà.
            </Notice>
          )}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="p-4">
      <p className="font-mono text-theme-xs uppercase tracking-wider text-gray-400">{label}</p>
      <p className={cn("mt-1 font-mono font-bold text-gray-900 dark:text-white", valueClass)}>{value}</p>
    </div>
  );
}

// ── Tab: Tra cứu IMEI ─────────────────────────────────────────────────────────
function ImeiTab() {
  const [imei, setImei] = useState("");

  return (
    <div>
      <p className="mb-6 font-mono text-theme-sm text-gray-600 dark:text-gray-300">
        Nhập số IMEI (15 chữ số) in trên hộp máy hoặc vào <strong className="font-bold">Cài đặt → Giới thiệu</strong> để tra cứu thông tin bảo hành.
      </p>
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={imei}
          onChange={(e) => setImei(e.target.value.replace(/\D/g, "").slice(0, 15))}
          placeholder="NHẬP SỐ IMEI (15 CHỮ SỐ)"
          className={cn(
            "h-12 flex-1 bg-white px-4 font-mono text-theme-sm font-medium tracking-widest text-gray-900 placeholder:text-gray-400 placeholder:tracking-normal focus:outline-none focus:shadow-[4px_4px_0_0_#111827] dark:bg-gray-900 dark:text-white dark:focus:shadow-[4px_4px_0_0_#f9fafb]",
            BRUT,
          )}
        />
        <button
          type="submit"
          disabled={imei.length < 15}
          className={cn(
            "h-12 bg-brand-500 px-7 font-mono text-theme-sm font-bold uppercase tracking-wide text-white disabled:opacity-50",
            BRUT, SHADOW, PRESS,
          )}
        >
          Tra cứu
        </button>
      </form>
      <div className="mt-6">
        <Notice tone="warning" icon={ICON_INFO}>
          Tính năng tra cứu IMEI đang được phát triển. Vui lòng gọi <strong className="font-bold">0798175906</strong> để tra cứu nhanh.
        </Notice>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WarrantyPage() {
  const [tab, setTab] = useState<"warranty" | "imei">("warranty");

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 md:px-8">

      {/* ── Hero ── */}
      <div className="mb-10">
        <span className={cn("inline-block bg-warning-300 px-3 py-1 font-mono text-theme-xs font-bold uppercase tracking-[0.2em] text-gray-900", BRUT)}>
          Bảo hành
        </span>
        <h1 className="mt-4 font-mono text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-gray-900 dark:text-white md:text-6xl">
          Tra cứu<br />bảo hành
        </h1>
        <p className="mt-4 max-w-lg font-mono text-theme-sm text-gray-600 dark:text-gray-400">
          Kiểm tra tình trạng bảo hành sản phẩm bằng mã phiếu, số serial hoặc IMEI của thiết bị.
        </p>
      </div>

      {/* ── Benefits ── */}
      <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b) => (
          <div key={b.title} className={cn("flex items-start gap-3 bg-white p-4 dark:bg-gray-900", BRUT)}>
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center bg-brand-500 text-white", BRUT)}>
              <Ic d={b.icon} size={20} />
            </span>
            <div>
              <p className="font-mono text-theme-sm font-bold uppercase text-gray-900 dark:text-white">{b.title}</p>
              <p className="mt-0.5 font-mono text-theme-xs text-gray-500">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Lookup ── */}
      <div className="mx-auto max-w-2xl">
        <div className={cn("bg-white p-6 dark:bg-gray-900", BRUT, SHADOW)}>

          {/* Tab switcher */}
          <div className={cn("mb-6 grid grid-cols-2", BRUT)}>
            {[
              { key: "warranty" as const, label: "Phiếu bảo hành" },
              { key: "imei" as const, label: "Tra cứu IMEI" },
            ].map(({ key, label }, i) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "py-3 font-mono text-theme-sm font-bold uppercase tracking-wide transition-colors",
                  i === 0 && "border-r-2 border-gray-900 dark:border-white",
                  tab === key
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/5",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "warranty" ? <WarrantyTab /> : <ImeiTab />}
        </div>

        {/* Help prompt */}
        <p className="mt-6 text-center font-mono text-theme-sm text-gray-500 dark:text-gray-400">
          Cần hỗ trợ thêm?{" "}
          <Link to="/contact" className="font-bold text-gray-900 underline underline-offset-2 dark:text-white">
            Liên hệ ngay →
          </Link>
        </p>
      </div>
    </div>
  );
}
