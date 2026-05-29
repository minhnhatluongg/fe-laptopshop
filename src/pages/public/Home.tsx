import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { bannerApi, type BannerDto } from "@/api/banner.api";
import { brandApi } from "@/api/brand.api";
import { categoryApi } from "@/api/category.api";
import { productApi } from "@/api/product.api";
import type { Brand, Category, Product } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { HeroCarousel } from "@/components/ui/Carousel";
import { computeDiscountPrice, formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { cn } from "@/utils/cn";

// ─── Business sections config ─────────────────────────────────────────────────
// 4 kiểu section khác nhau để hiển thị sản phẩm đa dạng
const sections = [
  {
    key: "new",
    title: "Sản phẩm mới nhất",
    subtitle: "Vừa cập kệ — laptop mới nhất thị trường",
    query: { pageSize: 8, sortBy: "createdAt", sortOrder: "desc" as const, isActive: true },
    cta: "/products?sort=newest",
  },
  {
    key: "deals",
    title: "🔥 Ưu đãi hôm nay",
    subtitle: "Giảm giá sâu — số lượng có hạn",
    query: { pageSize: 8, minDiscount: 5, sortBy: "discount", sortOrder: "desc" as const, isActive: true },
    cta: "/products?sort=discount",
    accent: true,
  },
  {
    key: "gaming",
    title: "Gaming",
    subtitle: "Chinh phục mọi tựa game với hiệu năng đỉnh cao",
    query: { pageSize: 4, sortBy: "price", sortOrder: "desc" as const, categoryId: 0, isActive: true },
    catSlug: "laptop-gaming",
    cta: "/products?category=laptop-gaming",
  },
  {
    key: "office",
    title: "Laptop Văn Phòng",
    subtitle: "Mỏng nhẹ, pin lâu — đồng hành mọi hành trình",
    query: { pageSize: 4, sortBy: "price", sortOrder: "asc" as const, categoryId: 0, isActive: true },
    catSlug: "laptop-van-phong",
    cta: "/products?category=laptop-van-phong",
  },
];

export default function HomePage() {
  const [banners, setBanners] = useState<BannerDto[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sectionProducts, setSectionProducts] = useState<Record<string, Product[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadAll = async () => {
      // Fetch in parallel
      const [bn, br, cat] = await Promise.allSettled([
        bannerApi.getActive("HOMEPAGE_TOP").catch(() => [] as BannerDto[]),
        brandApi.getActive().catch(() => [] as Brand[]),
        categoryApi.getAll({ pageSize: 50 }).catch(() => null),
      ]);

      if (!mounted) return;
      if (bn.status === "fulfilled") setBanners(bn.value);
      if (br.status === "fulfilled") setBrands(br.value);
      const cats = cat.status === "fulfilled" ? cat.value?.items ?? [] : [];
      setCategories(cats);

      // Load product sections using category IDs if needed
      const results: Record<string, Product[]> = {};
      await Promise.allSettled(
        sections.map(async (s) => {
          try {
            const query: Record<string, unknown> = { ...s.query };
            if ("catSlug" in s && s.catSlug) {
              const found = cats.find((c) => c.slug === s.catSlug);
              if (found) query.categoryId = found.id;
            }
            const res = await productApi.getAll(query as Parameters<typeof productApi.getAll>[0]);
            results[s.key] = res.items ?? [];
          } catch {
            results[s.key] = [];
          }
        }),
      );

      if (mounted) {
        setSectionProducts(results);
        setLoading(false);
      }
    };

    void loadAll();
    return () => { mounted = false; };
  }, []);

  const childCategories = categories.filter((c) => c.parentId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── HERO CAROUSEL ─────────────────────────────────────────────────── */}
      {banners.length > 0 ? (
        <HeroCarousel banners={banners} />
      ) : (
        /* Fallback gradient hero khi chưa có banner */
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-purple-800 px-6 py-16 text-white md:px-16 md:py-24">
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <Badge color="light" className="bg-white/10 text-white mb-4">
              Chào mừng đến LaptopShop
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
              Laptop chính hãng<br />
              <span className="text-brand-200">giá tốt nhất</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/80">
              MacBook, Dell, HP, Lenovo, ASUS, Acer, MSI, Razer — bảo hành 24 tháng, đổi mới 30 ngày.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link to="/products" className="inline-flex h-12 items-center rounded-xl bg-white px-8 text-base font-semibold text-brand-700 hover:bg-brand-50 transition">
                Mua ngay
              </Link>
              <Link to="/sale" className="inline-flex h-12 items-center rounded-xl border border-white/30 px-8 text-base font-semibold text-white hover:bg-white/10 transition">
                Xem khuyến mãi
              </Link>
            </div>
          </div>
          <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl" />
        </div>
      )}

      {/* ── CATEGORY PILLS ────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-screen-2xl items-center gap-2 overflow-x-auto no-scrollbar px-4 py-3 md:px-8">
          <Link
            to="/products"
            className="shrink-0 rounded-full bg-brand-500 px-4 py-2 text-theme-sm font-semibold text-white"
          >
            Tất cả
          </Link>
          {childCategories.map((c) => (
            <Link
              key={c.id}
              to={`/products?category=${c.slug}`}
              className="shrink-0 rounded-full border border-gray-200 px-4 py-2 text-theme-sm font-medium text-gray-700 hover:border-brand-400 hover:text-brand-500 transition dark:border-gray-700 dark:text-gray-300"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* ── TRUST STRIP ───────────────────────────────────────────────────── */}
      <div className="border-y border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-4 md:px-8">
          {[
            { icon: "🛡️", text: "Bảo hành 24 tháng",  color: "text-brand-500"   },
            { icon: "🔄", text: "Đổi mới 30 ngày",    color: "text-success-500" },
            { icon: "🚚", text: "Giao hàng toàn quốc", color: "text-warning-600" },
            { icon: "✅", text: "Hàng chính hãng 100%", color: "text-brand-500" },
            { icon: "💳", text: "Trả góp 0%",          color: "text-purple-500"  },
          ].map((t) => (
            <span key={t.text}
              className="flex items-center gap-2 text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              <span className={cn("text-base leading-none", t.color)}>{t.icon}</span>
              {t.text}
            </span>
          ))}
        </div>
      </div>

      {/* ── PRODUCT SECTIONS ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-2xl space-y-10 px-4 py-10 md:px-8">
        {sections.map((s) => {
          const products = sectionProducts[s.key] ?? [];
          return (
            <section key={s.key}>
              <SectionHeader
                title={s.title}
                subtitle={s.subtitle}
                cta={s.cta}
                accent={s.accent}
              />
              <div className={cn(
                "mt-5 grid gap-4",
                products.length <= 4
                  ? "sm:grid-cols-2 lg:grid-cols-4"
                  : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
              )}>
                {loading
                  ? Array.from({ length: s.query.pageSize }).map((_, i) => (
                      <ProductCardSkeleton key={i} />
                    ))
                  : products.length === 0
                  ? <EmptySection />
                  : products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          );
        })}

        {/* ── BRAND CAROUSEL SHOWCASE ─────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Thương hiệu uy tín"
            subtitle="Phân phối chính hãng — hover để xem sản phẩm nổi bật"
          />
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
                ))
              : brands.slice(0, 5).map((b) => (
                  <BrandProductCarousel key={b.id} brand={b} />
                ))}
          </div>
        </section>

        {/* ── WHY US ──────────────────────────────────────────────────────── */}
        <section className="rounded-3xl bg-gradient-to-br from-brand-50 to-purple-50 px-6 py-10 dark:from-brand-500/[0.08] dark:to-purple-500/[0.08]">
          <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white">
            Tại sao chọn LaptopShop?
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "🛡️", title: "Chính hãng 100%", desc: "Nhập khẩu chính thức, đầy đủ hóa đơn VAT và giấy tờ xuất xứ." },
              { icon: "⚡", title: "Giao hàng nhanh", desc: "Nội thành 2–4h, toàn quốc 1–2 ngày làm việc." },
              { icon: "🔧", title: "Bảo hành tận nơi", desc: "Đội kỹ thuật viên đến nhà xử lý, không cần mang máy." },
              { icon: "💰", title: "Giá cạnh tranh", desc: "Cam kết hoàn tiền nếu mua rẻ hơn tại nơi khác trong 7 ngày." },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-brand-100 bg-white p-5 dark:border-brand-500/20 dark:bg-white/[0.04]"
              >
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-white">{f.title}</h3>
                <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Brand product carousel ───────────────────────────────────────────────────
function BrandProductCarousel({ brand }: { brand: Brand }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [current, setCurrent] = useState(0);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    productApi.getAll({ brandId: brand.id, pageSize: 6, isActive: true })
      .then((r) => setProducts(r.items ?? []))
      .catch(() => setProducts([]));
  }, [brand.id]);

  const total = products.length;

  const next = useCallback(() =>
    setCurrent((c) => (c + 1) % total), [total]);

  // Auto-advance every 2s (pause on hover)
  useEffect(() => {
    if (total === 0 || hovered) return;
    timerRef.current = setInterval(next, 2000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, total, hovered]);

  const p = products[current];

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Brand header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <span className="font-outfit text-base font-bold tracking-tight text-gray-900 dark:text-white">
          {brand.name}
        </span>
        <Link
          to={`/products?brand=${brand.slug}`}
          className="text-theme-xs font-medium text-brand-500 hover:text-brand-600"
        >
          Xem tất cả →
        </Link>
      </div>

      {/* Product card */}
      {total === 0 ? (
        <div className="flex flex-1 items-center justify-center py-10 text-theme-xs text-gray-400">
          Đang tải...
        </div>
      ) : p ? (
        <Link to={`/products/${p.slug}`} className="flex flex-1 flex-col">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 dark:bg-gray-800/50">
            <img
              key={p.id}
              src={p.mainImageUrl ? getImageUrl(p.mainImageUrl) : IMAGE_PLACEHOLDER}
              onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
              alt={p.name}
              className="h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Discount badge */}
            {(p.discount ?? 0) > 0 && (
              <div className="absolute left-2 top-2">
                <Badge color="error" variant="solid" size="sm">−{p.discount}%</Badge>
              </div>
            )}
            {/* Slide indicator dots */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {products.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.preventDefault(); setCurrent(i); }}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === current ? "w-4 bg-brand-500" : "w-1.5 bg-gray-300 dark:bg-gray-600",
                  )}
                />
              ))}
            </div>
          </div>
          {/* Info */}
          <div className="flex flex-1 flex-col p-3">
            <p className="line-clamp-2 text-theme-sm font-semibold leading-snug text-gray-800 dark:text-white/90 group-hover:text-brand-500">
              {p.name}
            </p>
            <div className="mt-auto flex items-baseline gap-2 pt-2">
              <span className="font-outfit text-sm font-bold text-brand-600 dark:text-brand-400">
                {formatVND(computeDiscountPrice(p.price, p.discount))}
              </span>
              {(p.discount ?? 0) > 0 && (
                <span className="text-theme-xs text-gray-400 line-through">
                  {formatVND(p.price)}
                </span>
              )}
            </div>
          </div>
        </Link>
      ) : null}

      {/* Prev / Next overlay (visible on hover) */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => setCurrent((c) => ((c - 1 + total) % total))}
            className="absolute left-1 top-1/3 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow opacity-0 transition group-hover:opacity-100 hover:bg-white dark:bg-gray-900/80 dark:text-gray-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button
            type="button"
            onClick={() => setCurrent((c) => (c + 1) % total)}
            className="absolute right-1 top-1/3 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow opacity-0 transition group-hover:opacity-100 hover:bg-white dark:bg-gray-900/80 dark:text-gray-200"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  title, subtitle, cta, accent,
}: {
  title: string; subtitle?: string; cta?: string; accent?: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className={cn(
          "font-outfit text-2xl font-bold",
          accent ? "text-brand-600 dark:text-brand-400" : "text-gray-900 dark:text-white",
        )}>
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}
      </div>
      {cta && (
        <Link
          to={cta}
          className="shrink-0 text-theme-sm font-semibold text-brand-500 hover:text-brand-600"
        >
          Xem tất cả →
        </Link>
      )}
    </div>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ product }: { product: Product }) {
  const finalPrice = computeDiscountPrice(product.price, product.discount);
  const hasDiscount = (product.discount ?? 0) > 0;
  // mainImageUrl: flat field từ ProductDto (GetAll trả về)
  const mainImage = product.mainImageUrl ?? null;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:-translate-y-1 hover:shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
        <img
          src={mainImage ? getImageUrl(mainImage) : IMAGE_PLACEHOLDER}
          onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {hasDiscount && (
          <div className="absolute left-3 top-3">
            <Badge color="error" variant="solid" size="sm">−{product.discount}%</Badge>
          </div>
        )}
        {!mainImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-300">
              <rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>
            </svg>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span className="text-theme-xs font-medium text-gray-400">
          {product.brand?.name}
        </span>
        <h3 className="mt-1 line-clamp-2 text-theme-sm font-semibold text-gray-800 leading-snug group-hover:text-brand-500 dark:text-white/90">
          {product.name}
        </h3>
        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="text-base font-extrabold text-brand-600 dark:text-brand-400">
            {formatVND(finalPrice)}
          </span>
          {hasDiscount && (
            <span className="text-theme-xs text-gray-400 line-through">
              {formatVND(product.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="aspect-[4/3] animate-pulse bg-gray-100 dark:bg-gray-800" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800 pt-1" />
      </div>
    </div>
  );
}

function EmptySection() {
  return (
    <p className="col-span-full py-8 text-center text-theme-sm text-gray-400 dark:text-gray-600">
      Chưa có sản phẩm trong mục này.
    </p>
  );
}
