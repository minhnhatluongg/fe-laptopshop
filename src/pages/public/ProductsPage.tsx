import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { brandApi } from "@/api/brand.api";
import { categoryApi } from "@/api/category.api";
import { productApi } from "@/api/product.api";
import type { Brand, Category, Product, ProductFilter } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { GiftHoverBadge } from "@/components/product/GiftHoverBadge";
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
  // API categories hiện chỉ trả {id, name, slug, description} — KHÔNG có parentId/isActive/displayOrder.
  // Phải robust với các field thiếu, nếu không filter sẽ rỗng và mục "Danh mục" chỉ còn nút "Tất cả".
  const displayCats = useMemo(() => {
    const hasHierarchy = categories.some((c) => c.parentId != null);
    // Có phân cấp → ưu tiên danh mục con; catalog phẳng → hiển thị tất cả.
    const list = hasHierarchy ? categories.filter((c) => c.parentId != null) : categories;
    // Chỉ loại mục đã tắt khi backend thực sự trả isActive === false (undefined vẫn giữ).
    return list
      .filter((c) => c.isActive !== false)
      .slice()
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [categories]);

  const resetPage = () => setPage(1);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="font-outfit text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
          {brandSlug
            ? `${brands.find((b) => b.slug === brandSlug)?.name ?? "Thương hiệu"}`
            : catSlug
            ? `${categories.find((c) => c.slug === catSlug)?.name ?? "Danh mục"}`
            : "Tất cả sản phẩm"}
        </h1>
        <p className="mt-1.5 text-theme-sm text-gray-500 dark:text-gray-400">
          {loading
            ? "Đang tải sản phẩm..."
            : <><span className="font-semibold text-gray-700 dark:text-gray-300">{total.toLocaleString()}</span> sản phẩm</>}
        </p>
      </div>

      <div className="flex gap-6 lg:items-start">
        {/* ── Sidebar filters ────────────────────────────────────────── */}
        <aside className="hidden w-60 shrink-0 space-y-7 lg:sticky lg:top-20 lg:block">
          {/* Categories */}
          <FilterSection title="Danh mục">
            <FilterChip active={!catSlug} onClick={() => { setCatSlug(""); resetPage(); }}>
              Tất cả
            </FilterChip>
            {displayCats.map((c) => (
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
                {displayCats.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
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

            {/* Page size — segmented control */}
            <div className="inline-flex h-10 items-center rounded-xl border border-gray-200 p-0.5 dark:border-gray-700">
              {PAGE_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setPageSize(s); resetPage(); }}
                  className={cn(
                    "h-9 w-9 rounded-lg text-theme-xs font-semibold transition-colors",
                    pageSize === s
                      ? "bg-brand-500 text-white"
                      : "text-gray-500 hover:text-brand-500 dark:text-gray-400",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Clear filters */}
            {(catSlug || brandSlug || search) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setCatSlug(""); setBrandSlug(""); resetPage(); }}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-theme-sm text-gray-500 transition-colors hover:border-error-300 hover:text-error-500 dark:border-gray-700"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Xoá bộ lọc
              </button>
            )}
          </div>

          {/* Product grid */}
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: pageSize }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center dark:border-gray-800">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Không tìm thấy sản phẩm
              </h3>
              <p className="mt-2 max-w-xs text-theme-sm text-gray-500">
                Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.
              </p>
              <button
                type="button"
                onClick={() => { setSearch(""); setCatSlug(""); setBrandSlug(""); resetPage(); }}
                className="mt-5 inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-theme-sm font-medium text-white transition-colors hover:bg-brand-600 active:scale-[0.98]"
              >
                Xem tất cả sản phẩm
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} / {total} sản phẩm
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
  const batteryWeight = [p.battery, p.weight].filter(Boolean).join(" · ");
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/30"
    >
      {p.hasGifts && (
        <div className="absolute right-3 top-3 z-20"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <GiftHoverBadge productId={p.id} />
        </div>
      )}
      <div
        className="relative aspect-4/3 overflow-hidden bg-gray-50 dark:bg-gray-900"
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
              "absolute inset-0 h-full w-full object-contain p-3 transition-opacity duration-500",
              i === idx ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        {hasDiscount && (
          <div className="absolute left-3 top-3 z-10">
            <Badge color="error" variant="solid" size="sm">-{p.discount}%</Badge>
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn("h-1 rounded-full transition-all", i === idx ? "w-3 bg-brand-500" : "w-1 bg-gray-300 dark:bg-gray-600")}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-theme-sm font-semibold leading-snug text-gray-800 transition-colors group-hover:text-brand-500 dark:text-white/90">
          {p.name}
        </h3>

        {/* Specs tóm tắt */}
        <ul className="mt-3 space-y-1.5 rounded-xl bg-gray-50 px-3 py-2.5 text-theme-xs text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
          {p.cpu && <SpecLine icon="cpu" text={p.cpu} />}
          {p.gpu && <SpecLine icon="gpu" text={p.gpu} />}
          {(p.ram || p.storage) && (
            <SpecLine
              icon="memory"
              text={[p.ram, p.storage].filter(Boolean).join(" · ")}
              extra={screen ? { icon: "screen", text: screen } : undefined}
            />
          )}
          {batteryWeight && <SpecLine icon="battery" text={batteryWeight} />}
        </ul>

        {/* Price + rating — ghim đáy để các card thẳng hàng dù số dòng specs khác nhau */}
        <div className="mt-auto pt-3">
          {hasDiscount && (
            <span className="text-theme-xs text-gray-400 line-through">
              {formatVND(p.price)}
            </span>
          )}
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "font-outfit text-lg font-extrabold",
              hasDiscount ? "text-error-500" : "text-gray-900 dark:text-white",
            )}>
              {formatVND(finalPrice)}
            </span>
          </div>

          {/* Rating + total reviews + comments */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-theme-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <StarIcon />
              <span className="font-semibold text-gray-700 dark:text-gray-200">{rating.toFixed(1)}</span>
              <span className="text-gray-400">({totalReviews})</span>
            </span>
            {(p.totalComments ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1">
                <CommentIcon />
                <span>{p.totalComments}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Bộ icon spec — đồng bộ stroke với phần còn lại của codebase, thay cho emoji.
const SPEC_ICONS: Record<string, string> = {
  cpu:     "M6 6h12v12H6z|M9 9h6v6H9z|M9 2v2|M15 2v2|M9 20v2|M15 20v2|M2 9h2|M2 15h2|M20 9h2|M20 15h2",
  gpu:     "M12 2 2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5",
  memory:  "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z|M2 12h20|M6 16h.01|M10 16h.01",
  screen:  "M2 3h20v14H2z|M8 21h8|M12 17v4",
  battery: "M2 7h15v10H2z|M20 10v4",
};
function SpecIcon({ name }: { name: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      className="shrink-0 text-gray-400 dark:text-gray-500">
      {SPEC_ICONS[name].split("|").map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-warning-400">
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </svg>
  );
}

function SpecLine({
  icon,
  text,
  extra,
}: {
  icon: string;
  text: string;
  extra?: { icon: string; text: string };
}) {
  return (
    <li className="flex items-center gap-1.5">
      <SpecIcon name={icon} />
      <span className="truncate">{text}</span>
      {extra && (
        <span className="ml-auto flex shrink-0 items-center gap-1 text-gray-500 dark:text-gray-400">
          <SpecIcon name={extra.icon} />
          {extra.text}
        </span>
      )}
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
