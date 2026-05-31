import { useEffect, useMemo, useState } from "react";
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
      <span className="rounded-lg bg-gray-900 px-3 py-1.5 font-outfit text-2xl font-bold tabular-nums text-white dark:bg-white/10 md:text-3xl">
        {value}
      </span>
      <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </span>
    </div>
  );
}

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

  return (
    <Link
      to={`/products/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-gray-50 dark:bg-gray-800">
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
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-gray-800 group-hover:text-brand-500 dark:text-white/90">
          {p.name}
        </h3>

        <div className="mt-auto pt-3">
          <p className="text-xs text-gray-400 line-through">{formatVND(p.price)}</p>
          <div className="flex items-center gap-2">
            <span className="font-outfit text-lg font-extrabold text-error-500">
              {formatVND(finalPrice)}
            </span>
            <span className="rounded border border-error-400 px-1.5 py-0.5 text-[10px] font-bold text-error-500">
              -{p.discount}%
            </span>
          </div>
          <p className="mt-1 text-xs text-success-600 dark:text-success-400">
            Tiết kiệm {formatVND(p.price - finalPrice)}
          </p>
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
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-linear-to-r from-error-600 via-error-500 to-orange-400 px-8 py-10 text-white shadow-xl md:px-16">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 right-32 h-48 w-48 rounded-full bg-white/5" />

        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Flash Sale
            </p>
            <h1 className="mt-1 font-outfit text-3xl font-extrabold leading-tight md:text-5xl">
              Khuyến mãi<br className="md:hidden" /> cực sốc 🔥
            </h1>
            <p className="mt-2 text-white/80">
              Giảm đến <strong>50%</strong> hàng trăm laptop — số lượng có hạn!
            </p>
          </div>

          {/* Countdown */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              Kết thúc sau
            </p>
            <div className="flex items-end gap-2">
              <TimeUnit value={h} label="Giờ" />
              <span className="mb-4 text-2xl font-bold text-white/60">:</span>
              <TimeUnit value={m} label="Phút" />
              <span className="mb-4 text-2xl font-bold text-white/60">:</span>
              <TimeUnit value={s} label="Giây" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
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
                "rounded-xl px-4 py-2 text-xs font-semibold transition",
                i === sortIdx
                  ? "bg-error-500 text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-700 hover:border-error-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
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
        <div className="py-20 text-center text-gray-500">
          <p className="text-5xl mb-3">😔</p>
          <p className="font-semibold">Hiện chưa có sản phẩm khuyến mãi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => <SaleCard key={p.id} product={p} />)}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-10 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-gray-700"
          >
            ← Trước
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
                    "h-10 w-10 rounded-xl text-sm font-semibold transition",
                    page === p
                      ? "bg-error-500 text-white"
                      : "border border-gray-200 hover:border-error-300 dark:border-gray-700",
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
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-gray-700"
          >
            Tiếp →
          </button>
        </div>
      )}
    </div>
  );
}
