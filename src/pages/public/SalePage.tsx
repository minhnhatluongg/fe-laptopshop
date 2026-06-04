import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { productApi } from "@/api/product.api";
import type { Product } from "@/api/types";
import { computeDiscountPrice, formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { cn } from "@/utils/cn";

// ── Countdown helper ──────────────────────────────────────────────────────────
function useCountdown(targetHour = 24) {
  const [secs, setSecs] = useState(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(targetHour, 0, 0, 0);
    if (end <= now) end.setDate(end.getDate() + 1);
    return Math.floor((end.getTime() - now.getTime()) / 1000);
  });

  useEffect(() => {
    const id = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return { h, m, s };
}

function TimeUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="rounded-xl bg-white/15 px-3 py-2 font-outfit text-2xl font-bold tabular-nums text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm md:text-3xl">
        {value}
      </span>
      <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
        {label}
      </span>
    </div>
  );
}

const Bolt = ({ className }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13 2 3 14h7v8l10-12h-7z" />
  </svg>
);

// ── Sort options ──────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { label: "Giảm giá nhiều nhất", sortBy: "discount", asc: false },
  { label: "Giá thấp → cao",      sortBy: "price",    asc: true  },
  { label: "Giá cao → thấp",      sortBy: "price",    asc: false },
  { label: "Mới nhất",            sortBy: "createdAt", asc: false },
];

// ── Product card ──────────────────────────────────────────────────────────────
function SaleCard({ product: p }: { product: Product }) {
  const finalPrice = computeDiscountPrice(p.price, p.discount);
  const saved = p.price - finalPrice;

  return (
    <Link
      to={`/products/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-error-300 hover:shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-error-500/40"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <img
          src={p.mainImageUrl ? getImageUrl(p.mainImageUrl) : IMAGE_PLACEHOLDER}
          onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
          alt={p.name}
          loading="lazy"
          className="h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-105"
        />
        {/* Discount ribbon */}
        <div className="absolute left-0 top-3 rounded-r-full bg-error-500 px-3 py-1 text-xs font-extrabold text-white shadow-md">
          -{p.discount}%
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-theme-sm font-semibold leading-snug text-gray-800 transition-colors group-hover:text-error-500 dark:text-white/90">
          {p.name}
        </h3>

        <div className="mt-auto pt-3">
          <p className="text-theme-xs text-gray-400 line-through">{formatVND(p.price)}</p>
          <div className="flex items-baseline gap-2">
            <span className="font-outfit text-lg font-extrabold text-error-500">
              {formatVND(finalPrice)}
            </span>
          </div>
          <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-md bg-success-50 px-1.5 py-0.5 text-[11px] font-semibold text-success-600 dark:bg-success-500/15 dark:text-success-400">
            Tiết kiệm {formatVND(saved)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SalePage() {
  const { h, m, s } = useCountdown(24);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [sortIdx, setSortIdx]   = useState(0);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const PAGE_SIZE = 20;

  const sort = SORT_OPTIONS[sortIdx];

  useEffect(() => {
    setLoading(true);
    setPage(1);
  }, [sortIdx]);

  useEffect(() => {
    setLoading(true);
    productApi
      .getAll({
        minDiscount: 1,
        isActive: true,
        sortBy: sort.sortBy,
        sortOrder: sort.asc ? "asc" : "desc",
        pageNumber: page,
        pageSize: PAGE_SIZE,
      })
      .then((res) => {
        setProducts(res.items ?? []);
        setTotal(res.totalCount ?? 0);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [sort.sortBy, sort.asc, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">

      {/* ── Hero banner ── */}
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-error-600 via-error-500 to-warning-500 px-8 py-10 text-white shadow-lg md:px-14 md:py-12">
        {/* Soft ambient glow — tạo chiều sâu, không phải neon */}
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-warning-300/25 blur-3xl" />

        <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-theme-xs font-semibold uppercase tracking-[0.18em] ring-1 ring-inset ring-white/25 backdrop-blur-sm">
              <Bolt /> Flash Sale
            </span>
            <h1 className="mt-3 font-outfit text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Khuyến mãi cực sốc
            </h1>
            <p className="mt-2.5 max-w-md text-theme-sm leading-relaxed text-white/85">
              Giảm đến <strong className="font-bold">50%</strong> hàng trăm laptop chính hãng. Số lượng có hạn!
            </p>
            <a
              href="#san-pham"
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-white px-6 text-theme-sm font-semibold text-error-600 transition hover:bg-error-50 active:scale-[0.98]"
            >
              Săn deal ngay
            </a>
          </div>

          {/* Countdown */}
          <div className="flex flex-col items-center gap-2.5">
            <p className="text-theme-xs font-semibold uppercase tracking-widest text-white/75">
              Kết thúc sau
            </p>
            <div className="flex items-start gap-2">
              <TimeUnit value={h} label="Giờ" />
              <span className="pt-2 text-2xl font-bold text-white/50">:</span>
              <TimeUnit value={m} label="Phút" />
              <span className="pt-2 text-2xl font-bold text-white/50">:</span>
              <TimeUnit value={s} label="Giây" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Toolbar ── */}
      <div id="san-pham" className="mb-6 flex flex-wrap items-center justify-between gap-3 scroll-mt-20">
        <p className="text-theme-sm font-medium text-gray-600 dark:text-gray-400">
          {loading ? "Đang tải..." : (
            <><span className="font-bold text-gray-900 dark:text-white">{total}</span> sản phẩm đang giảm giá</>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSortIdx(i)}
              className={cn(
                "rounded-xl px-4 py-2 text-theme-xs font-semibold transition-colors",
                i === sortIdx
                  ? "bg-error-500 text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-error-300 hover:text-error-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Product grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center dark:border-gray-800">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><path d="M7 7h.01" />
            </svg>
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">Hiện chưa có sản phẩm khuyến mãi</p>
          <p className="mt-1 text-theme-sm text-gray-400">Ghé lại sau để không bỏ lỡ ưu đãi mới nhé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => <SaleCard key={p.id} product={p} />)}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-gray-200 px-4 text-theme-sm font-medium text-gray-600 transition-colors hover:border-error-300 hover:text-error-500 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Trước
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={i} className="px-2 py-2 text-gray-400">…</span>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(p as number)}
                  className={cn(
                    "h-10 w-10 rounded-xl text-theme-sm font-semibold transition-colors",
                    page === p
                      ? "bg-error-500 text-white"
                      : "border border-gray-200 text-gray-600 hover:border-error-300 hover:text-error-500 dark:border-gray-700 dark:text-gray-300",
                  )}
                >
                  {p}
                </button>
              )
            )}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-gray-200 px-4 text-theme-sm font-medium text-gray-600 transition-colors hover:border-error-300 hover:text-error-500 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
          >
            Tiếp
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}
