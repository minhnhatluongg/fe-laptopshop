import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { brandApi } from "@/api/brand.api";
import { categoryApi } from "@/api/category.api";
import { productApi } from "@/api/product.api";
import type { Brand, Category, Product, ProductFilter } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { computeDiscountPrice, formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { cn } from "@/utils/cn";

const PAGE_SIZES = [12, 24, 48];
const SORT_OPTIONS = [
  { value: "newest",        label: "Mới nhất",         sortBy: "createdAt",    asc: false },
  { value: "price-asc",     label: "Giá tăng dần",     sortBy: "price",        asc: true  },
  { value: "price-desc",    label: "Giá giảm dần",     sortBy: "price",        asc: false },
  { value: "discount",      label: "Khuyến mãi cao",   sortBy: "discount",     asc: false },
  { value: "name",          label: "Tên A→Z",           sortBy: "name",         asc: true  },
];

function useDebounce<T>(value: T, delay = 400): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [brands, setBrands]         = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);

  // Filters from URL
  const [search, setSearch]       = useState(searchParams.get("search") ?? "");
  const [sort, setSort]           = useState(searchParams.get("sort") ?? "newest");
  const [brandSlug, setBrandSlug] = useState(searchParams.get("brand") ?? "");
  const [catSlug, setCatSlug]     = useState(searchParams.get("category") ?? "");
  const [page, setPage]           = useState(Number(searchParams.get("page")) || 1);
  const [pageSize, setPageSize]   = useState(Number(searchParams.get("size")) || 12);

  const debouncedSearch = useDebounce(search);

  // Resolve slug → id for API
  const brandId    = useMemo(
    () => brands.find((b) => b.slug === brandSlug)?.id,
    [brands, brandSlug],
  );
  const categoryId = useMemo(
    () => categories.find((c) => c.slug === catSlug)?.id,
    [categories, catSlug],
  );

  const sortOpt = SORT_OPTIONS.find((s) => s.value === sort) ?? SORT_OPTIONS[0];

  const filter = useMemo<ProductFilter>(
    () => ({
      pageNumber: page,
      pageSize,
      search: debouncedSearch || undefined,
      brandId,
      categoryId,
      isActive: true,
      sortBy:    sortOpt.sortBy,
      sortOrder: sortOpt.asc ? "asc" : "desc",
    }),
    [page, pageSize, debouncedSearch, brandId, categoryId, sortOpt],
  );

  // Sync URL params
  useEffect(() => {
    const p: Record<string, string> = {};
    if (search)    p.search   = search;
    if (sort !== "newest") p.sort = sort;
    if (brandSlug) p.brand    = brandSlug;
    if (catSlug)   p.category = catSlug;
    if (page > 1)  p.page     = String(page);
    if (pageSize !== 12) p.size = String(pageSize);
    setSearchParams(p, { replace: true });
  }, [search, sort, brandSlug, catSlug, page, pageSize]);

  // Load options once
  useEffect(() => {
    Promise.allSettled([
      brandApi.getActive(),
      categoryApi.getAll({ pageSize: 100 }),
    ]).then(([b, c]) => {
      if (b.status === "fulfilled") setBrands(b.value);
      if (c.status === "fulfilled") setCategories(c.value.items ?? []);
    });
  }, []);

  // Load products
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productApi.getAll(filter);
      setProducts(res.items ?? []);
      setTotal(res.totalCount ?? 0);
    } catch { setProducts([]); setTotal(0); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const childCats  = categories.filter((c) => c.parentId);

  const resetPage = () => setPage(1);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="font-outfit text-2xl font-bold text-gray-900 dark:text-white">
          {brandSlug
            ? `${brands.find((b) => b.slug === brandSlug)?.name ?? "Thương hiệu"}`
            : catSlug
            ? `${categories.find((c) => c.slug === catSlug)?.name ?? "Danh mục"}`
            : "Tất cả sản phẩm"}
        </h1>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          {loading ? "Đang tải..." : `${total.toLocaleString()} sản phẩm`}
        </p>
      </div>

      <div className="flex gap-6 lg:items-start">
        {/* ── Sidebar filters ────────────────────────────────────────── */}
        <aside className="hidden w-56 shrink-0 space-y-6 lg:block">
          {/* Categories */}
          <FilterSection title="Danh mục">
            <FilterChip active={!catSlug} onClick={() => { setCatSlug(""); resetPage(); }}>
              Tất cả
            </FilterChip>
            {childCats.map((c) => (
              <FilterChip
                key={c.id}
                active={catSlug === c.slug}
                onClick={() => { setCatSlug(c.slug); resetPage(); }}
              >
                {c.name}
              </FilterChip>
            ))}
          </FilterSection>

          {/* Brands */}
          <FilterSection title="Thương hiệu">
            <FilterChip active={!brandSlug} onClick={() => { setBrandSlug(""); resetPage(); }}>
              Tất cả
            </FilterChip>
            {brands.map((b) => (
              <FilterChip
                key={b.id}
                active={brandSlug === b.slug}
                onClick={() => { setBrandSlug(b.slug!); resetPage(); }}
              >
                {b.name}
              </FilterChip>
            ))}
          </FilterSection>
        </aside>

        {/* ── Main content ────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="search"
                placeholder="Tìm sản phẩm..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-theme-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>

            {/* Mobile category + brand chips */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar lg:hidden">
              <select
                value={catSlug}
                onChange={(e) => { setCatSlug(e.target.value); resetPage(); }}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-theme-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 focus:outline-none"
              >
                <option value="">Danh mục</option>
                {childCats.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
              <select
                value={brandSlug}
                onChange={(e) => { setBrandSlug(e.target.value); resetPage(); }}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-theme-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 focus:outline-none"
              >
                <option value="">Thương hiệu</option>
                {brands.map((b) => <option key={b.id} value={b.slug!}>{b.name}</option>)}
              </select>
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); resetPage(); }}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-theme-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 focus:outline-none"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Page size */}
            <div className="flex items-center gap-1 text-theme-xs text-gray-500">
              {PAGE_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setPageSize(s); resetPage(); }}
                  className={cn(
                    "h-8 w-9 rounded-lg text-theme-xs font-medium transition-colors",
                    pageSize === s
                      ? "bg-brand-500 text-white"
                      : "border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Active filter chips */}
            {(catSlug || brandSlug || search) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setCatSlug(""); setBrandSlug(""); resetPage(); }}
                className="h-8 rounded-lg border border-gray-200 px-3 text-theme-xs text-gray-500 hover:border-error-300 hover:text-error-500 dark:border-gray-700"
              >
                Xoá bộ lọc ×
              </button>
            )}
          </div>

          {/* Product grid */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: pageSize }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 text-5xl">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Không tìm thấy sản phẩm
              </h3>
              <p className="mt-2 text-theme-sm text-gray-500">
                Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.
              </p>
              <button
                type="button"
                onClick={() => { setSearch(""); setCatSlug(""); setBrandSlug(""); resetPage(); }}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-theme-sm font-medium text-white hover:bg-brand-600"
              >
                Xem tất cả
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total} sản phẩm
              </p>
              <div className="flex items-center gap-1.5">
                <PaginationBtn disabled={page <= 1} onClick={() => setPage(1)}>«</PaginationBtn>
                <PaginationBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</PaginationBtn>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = totalPages <= 5 ? i + 1
                    : page <= 3 ? i + 1
                    : page >= totalPages - 2 ? totalPages - 4 + i
                    : page - 2 + i;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={cn(
                        "h-9 min-w-[36px] rounded-lg px-2 text-theme-sm font-medium transition-colors",
                        p === page
                          ? "bg-brand-500 text-white"
                          : "border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400",
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
                <PaginationBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</PaginationBtn>
                <PaginationBtn disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</PaginationBtn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-theme-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {title}
      </h4>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-2 text-left text-theme-sm transition-colors",
        active
          ? "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/[0.12] dark:text-brand-400"
          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
      )}
    >
      {children}
    </button>
  );
}

function PaginationBtn({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-9 min-w-[36px] rounded-lg border border-gray-200 px-2 text-gray-600 hover:border-brand-300 hover:text-brand-500 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400"
    >
      {children}
    </button>
  );
}

function ProductCard({ product: p }: { product: Product }) {
  const finalPrice = computeDiscountPrice(p.price, p.discount);
  const hasDiscount = (p.discount ?? 0) > 0;

  // Gộp pin + cân nặng ("60Wh • 1.4kg") để tiết kiệm dòng
  const batteryWeight = [p.battery, p.weight].filter(Boolean).join(" • ");
  const screen = p.screen;
  const rating = p.averageRating ?? 0;
  const totalReviews = p.totalReviews ?? 0;

  // Ảnh: main trước, rồi các ảnh còn lại theo displayOrder
  const images = (() => {
    if (p.productImages && p.productImages.length > 0) {
      return [...p.productImages]
        .filter((i) => i.isActive !== false && i.imageUrl)
        .sort((a, b) => {
          if (a.isMain && !b.isMain) return -1;
          if (!a.isMain && b.isMain) return 1;
          return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
        })
        .map((i) => i.imageUrl as string);
    }
    return p.mainImageUrl ? [p.mainImageUrl] : [""];
  })();

  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleMouseEnter = () => {
    if (images.length < 2) return;
    let cur = 1;
    setIdx(cur);
    timerRef.current = setInterval(() => {
      cur = cur >= images.length - 1 ? 1 : cur + 1;
      setIdx(cur);
    }, 800);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIdx(0);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <Link
      to={`/products/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:-translate-y-1 hover:shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div
        className="relative aspect-4/3 overflow-hidden bg-gray-100 dark:bg-gray-800"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {images.map((url, i) => (
          <img
            key={url + i}
            src={getImageUrl(url) || IMAGE_PLACEHOLDER}
            onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
            alt={p.name}
            loading="lazy"
            className={cn(
              "absolute inset-0 h-full w-full object-contain transition-opacity duration-500",
              i === idx ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        {hasDiscount && (
          <div className="absolute left-3 top-3 z-10">
            <Badge color="error" variant="solid" size="sm">−{p.discount}%</Badge>
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn("h-1 rounded-full transition-all", i === idx ? "w-3 bg-brand-500" : "w-1 bg-gray-300")}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-theme-sm font-semibold leading-snug text-gray-800 group-hover:text-brand-500 dark:text-white/90">
          {p.name}
        </h3>

        {/* Specs tóm tắt */}
        <ul className="mt-3 space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-theme-xs text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
          {p.cpu && <SpecLine icon="⚙" text={p.cpu} />}
          {p.gpu && <SpecLine icon="🎮" text={p.gpu} />}
          {(p.ram || p.storage) && (
            <SpecLine
              icon="💾"
              text={[p.ram, p.storage].filter(Boolean).join(" • ")}
              extra={screen ? <span className="text-gray-500">📺 {screen}</span> : null}
            />
          )}
          {batteryWeight && <SpecLine icon="🔋" text={batteryWeight} />}
        </ul>

        {/* Price */}
        <div className="mt-3 flex items-baseline gap-2">
          {hasDiscount && (
            <span className="text-theme-xs text-gray-400 line-through">
              {formatVND(p.price)}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-outfit text-lg font-extrabold text-error-500">
            {formatVND(finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-theme-xs font-semibold text-error-500">
              -{p.discount}%
            </span>
          )}
        </div>

        {/* Rating + total reviews + comments */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-theme-xs text-gray-500">
          <span className="inline-flex items-center gap-0.5">
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {rating.toFixed(1)}
            </span>
            <span className="text-warning-500">★</span>
            <span>({totalReviews} đánh giá)</span>
          </span>
          {(p.totalComments ?? 0) > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <span>💬</span>
              <span>{p.totalComments} bình luận</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function SpecLine({
  icon,
  text,
  extra,
}: {
  icon: string;
  text: string;
  extra?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-1.5 truncate">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
      {extra && <span className="ml-auto shrink-0">{extra}</span>}
    </li>
  );
}

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="aspect-[4/3] animate-pulse bg-gray-100 dark:bg-gray-800" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}
