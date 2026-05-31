import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { bannerApi, type BannerDto } from "@/api/banner.api";
import { brandApi } from "@/api/brand.api";
import { categoryApi } from "@/api/category.api";
import { productApi } from "@/api/product.api";
import { cartApi } from "@/api/cart.api";
import type { Brand, Category, Product } from "@/api/types";
import { HeroCarousel } from "@/components/ui/Carousel";
import { computeDiscountPrice, formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { emitCartUpdated, flyToCart } from "@/utils/cartEvents";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/utils/cn";

/* ── Spec chip icons ── */
const CPU_ICON = "🔲"; const RAM_ICON = "📦"; const SSD_ICON = "💾";
const SCR_ICON = "🖥️"; const GPU_ICON = "🎮";

/* Parse spec label — ưu tiên các field flat backend trả (cpu/ram/storage/...)
   Fallback: object specification (chi tiết) hoặc parse từ description. */
function parseSpecs(p: Product): { cpu?: string; ram?: string; ssd?: string; screen?: string; gpu?: string } {
  // Field flat ở ProductDto (cpu/ram/storage/screen/gpu) — backend mới
  const flatCpu     = (p as any).cpu     as string | null | undefined;
  const flatRam     = (p as any).ram     as string | null | undefined;
  const flatStorage = (p as any).storage as string | null | undefined;
  const flatScreen  = (p as any).screen  as string | null | undefined;
  const flatGpu     = (p as any).gpu     as string | null | undefined;

  if (flatCpu || flatRam || flatStorage || flatScreen || flatGpu) {
    return {
      cpu:    flatCpu?.split(" ").slice(0, 4).join(" ") || undefined,
      gpu:    flatGpu?.split(" ").slice(0, 4).join(" ") || undefined,
      ram:    flatRam?.replace(/lpddr\d+x?/gi, "").replace(/\s+/g, " ").trim() || undefined,
      ssd:    flatStorage?.replace(/nvme.*/i, "").trim() || undefined,
      screen: flatScreen?.split(",")[0]?.trim() || undefined,
    };
  }

  // Fallback 1: object specification (GET by id)
  const spec = (p as any).specification ?? (p as any).productSpecifications?.[0];
  if (spec) {
    return {
      cpu:    spec.cpu?.split(" ").slice(0, 4).join(" ") || undefined,
      gpu:    spec.gpu?.split(" ").slice(0, 4).join(" ") || undefined,
      ram:    spec.ram?.replace(/lpddr\d+x?/gi, "").replace(/\s+/g, " ").trim() || undefined,
      ssd:    spec.storage?.replace(/nvme.*/i, "").trim() || undefined,
      screen: spec.screen?.split(",")[0]?.trim() || undefined,
    };
  }

  // Fallback 2: parse từ description
  const desc = p.description ?? "";
  const ram  = desc.match(/(\d+GB)\s+(?:DDR|LP|Unified)/i)?.[1];
  const ssd  = desc.match(/(\d+(?:GB|TB)\s+(?:SSD|NVMe|Flash))/i)?.[1];
  return { ram, ssd };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [banners, setBanners]         = useState<BannerDto[]>([]);
  const [brands, setBrands]           = useState<Brand[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [loading, setLoading]         = useState(true);

  // Section products: each section has its own list
  const [newProducts, setNewProducts]       = useState<Product[]>([]);
  const [dealProducts, setDealProducts]     = useState<Product[]>([]);
  const [gamingProducts, setGamingProducts] = useState<Product[]>([]);
  const [officeProducts, setOfficeProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
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

      const gamingCat  = cats.find((c) => c.slug === "gaming" || c.slug === "laptop-gaming");
      const officeCat  = cats.find((c) => c.slug?.includes("van-phong") || c.slug?.includes("notebook"));

      await Promise.allSettled([
        productApi.getAll({ pageSize: 10, sortBy: "createdAt", sortOrder: "desc", isActive: true })
          .then((r) => { if (mounted) setNewProducts(r.items ?? []); }),
        productApi.getAll({ pageSize: 8, minDiscount: 3, sortBy: "discount", sortOrder: "desc", isActive: true })
          .then((r) => { if (mounted) setDealProducts(r.items ?? []); }),
        gamingCat ? productApi.getAll({ pageSize: 10, categoryId: gamingCat.id, isActive: true })
          .then((r) => { if (mounted) setGamingProducts(r.items ?? []); }) : Promise.resolve(),
        officeCat ? productApi.getAll({ pageSize: 10, categoryId: officeCat.id, isActive: true })
          .then((r) => { if (mounted) setOfficeProducts(r.items ?? []); }) : Promise.resolve(),
      ]);
      if (mounted) setLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const childCategories = categories.filter((c) => c.parentId);
  const topBrands       = brands.slice(0, 8);

  const handleAddToCart = useCallback(async (product: Product, qty: number, btnEl: HTMLElement | null) => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập", "Đăng nhập để thêm sản phẩm vào giỏ hàng");
      return;
    }
    try {
      await cartApi.addItem(product.id, qty);
      emitCartUpdated(qty);
      flyToCart(btnEl);
      toast.success("Đã thêm vào giỏ hàng!", product.name);
    } catch (e) {
      toast.error("Thêm thất bại", e instanceof Error ? e.message : undefined);
    }
  }, [isAuthenticated, toast]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      {banners.length > 0 ? (
        <HeroCarousel banners={banners} />
      ) : (
        <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 via-brand-700 to-purple-800 px-6 py-16 text-white md:px-16 md:py-20">
          <div className="relative z-10 mx-auto max-w-2xl">
            <p className="mb-2 text-theme-sm font-semibold text-white/70 uppercase tracking-widest">🏆 Nhà phân phối chính hãng</p>
            <h1 className="font-outfit text-4xl font-extrabold leading-tight md:text-5xl">
              Laptop chính hãng<br /><span className="text-brand-200">giá tốt nhất 2026</span>
            </h1>
            <p className="mt-4 max-w-lg text-white/75">
              MacBook · Dell · HP · Lenovo · ASUS · Acer · MSI · Razer — bảo hành 24 tháng.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/products" className="inline-flex h-12 items-center rounded-xl bg-white px-7 text-base font-bold text-brand-700 hover:bg-brand-50 transition">
                Mua ngay
              </Link>
              <Link to="/products?sort=discount" className="inline-flex h-12 items-center rounded-xl border border-white/30 px-7 text-base font-semibold text-white hover:bg-white/10 transition">
                Xem khuyến mãi
              </Link>
            </div>
          </div>
          <div className="absolute -right-20 top-0 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        </div>
      )}

      {/* ── CATEGORY PILLS ───────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-screen-2xl items-center gap-1.5 overflow-x-auto no-scrollbar px-4 py-2.5 md:px-8">
          <Link to="/products" className="shrink-0 rounded-full bg-brand-500 px-4 py-1.5 text-theme-sm font-semibold text-white hover:bg-brand-600">
            Tất cả
          </Link>
          {childCategories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.slug}`}
              className="shrink-0 rounded-full border border-gray-200 px-4 py-1.5 text-theme-sm font-medium text-gray-700 hover:border-brand-400 hover:text-brand-500 transition dark:border-gray-700 dark:text-gray-300">
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      {/* ── TRUST STRIP ──────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3 md:px-8">
          {[
            { icon: "🛡️", text: "Bảo hành 24 tháng", color: "text-brand-500" },
            { icon: "🔄", text: "Đổi mới 30 ngày",   color: "text-success-500" },
            { icon: "🚚", text: "Free ship ≥10 triệu", color: "text-warning-600" },
            { icon: "✅", text: "Hàng chính hãng",    color: "text-brand-500" },
            { icon: "💳", text: "Trả góp 0%",          color: "text-purple-500" },
          ].map((t) => (
            <span key={t.text} className="flex items-center gap-1.5 text-theme-xs font-medium text-gray-700 dark:text-gray-300">
              <span className={cn("text-sm", t.color)}>{t.icon}</span>{t.text}
            </span>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-screen-2xl px-4 py-8 space-y-10 md:px-8">
        {/* New arrivals */}
        <BrandFilterSection
          title="Laptop mới nhất"
          subtitle="Vừa cập kệ · Hàng mới 100%"
          allProducts={newProducts}
          brands={topBrands}
          loading={loading}
          cta="/products?sort=newest"
          onAddToCart={handleAddToCart}
        />

        {/* Hot deals — 8 sp x 2 hàng, ảnh tự xoay trong card */}
        <HotDealsSection
          products={dealProducts}
          loading={loading}
          onAddToCart={handleAddToCart}
        />

        {/* Gaming */}
        {(loading || gamingProducts.length > 0) && (
          <BrandFilterSection
            title="Laptop Gaming"
            subtitle="Chinh phục mọi tựa game — GPU mạnh mẽ"
            allProducts={gamingProducts}
            brands={topBrands.filter((b) => ["asus","msi","dell","lenovo","acer","razer"].includes(b.slug ?? ""))}
            loading={loading}
            cta="/products?category=gaming"
            onAddToCart={handleAddToCart}
          />
        )}

        {/* Office */}
        {(loading || officeProducts.length > 0) && (
          <BrandFilterSection
            title="Laptop Văn Phòng"
            subtitle="Mỏng nhẹ · Pin lâu · Làm việc không giới hạn"
            allProducts={officeProducts}
            brands={topBrands.filter((b) => ["apple","dell","hp","lenovo","lg","samsung"].includes(b.slug ?? ""))}
            loading={loading}
            cta="/products?category=notebook"
            onAddToCart={handleAddToCart}
          />
        )}

        {/* Brand strip */}
        {brands.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-white/[0.02]">
            <p className="mb-4 text-center text-theme-xs font-semibold uppercase tracking-widest text-gray-400">
              Thương hiệu phân phối chính hãng
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {brands.map((b) => (
                <Link key={b.id} to={`/products?brand=${b.slug}`}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold tracking-tight text-gray-600 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
                  {b.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BrandFilterSection ───────────────────────────────────────────────────────
interface SectionProps {
  title: string;
  subtitle?: string;
  allProducts: Product[];
  brands: Brand[];
  loading: boolean;
  cta: string;
  accent?: boolean;
  onAddToCart: (product: Product, qty: number, btn: HTMLElement | null) => Promise<void> | void;
}

function BrandFilterSection({ title, subtitle, allProducts, brands, loading, cta, accent, onAddToCart }: SectionProps) {
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

  const filtered = activeBrand
    ? allProducts.filter((p) => p.brandSlug === activeBrand || p.brandName?.toLowerCase() === activeBrand.toLowerCase())
    : allProducts;

  // Chỉ hiện brand tabs có sản phẩm
  const brandTabs = brands.filter((b) =>
    allProducts.some((p) => p.brandSlug === b.slug || p.brandName?.toLowerCase() === b.name.toLowerCase())
  );

  return (
    <section>
      {/* Section header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="mr-2">
          <h2 className={cn(
            "font-outfit text-xl font-bold md:text-2xl",
            accent ? "text-brand-600 dark:text-brand-400" : "text-gray-900 dark:text-white",
          )}>
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>

        {/* Free shipping badge */}
        <span className="hidden items-center gap-1.5 rounded-full border border-success-200 bg-success-50 px-3 py-1 text-theme-xs font-semibold text-success-700 sm:inline-flex dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
          🚚 Miễn phí giao hàng
        </span>

        {/* Brand tabs */}
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto no-scrollbar">
          {brandTabs.map((b) => (
            <button key={b.id} type="button"
              onClick={() => setActiveBrand(activeBrand === b.slug ? null : b.slug ?? null)}
              className={cn(
                "shrink-0 rounded-lg px-3.5 py-1.5 text-theme-xs font-bold transition-colors",
                activeBrand === b.slug
                  ? "bg-brand-500 text-white"
                  : "border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400",
              )}>
              {b.name.toUpperCase()}
            </button>
          ))}
        </div>

        <Link to={cta} className="ml-auto shrink-0 text-theme-sm font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400">
          Xem tất cả →
        </Link>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-theme-sm text-gray-400">Không có sản phẩm phù hợp.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.slice(0, 10).map((p) => (
            <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Product card — style giống reference ─────────────────────────────────────
function ProductCard({ product: p }: {
  product: Product;
  onAddToCart?: (product: Product, qty: number, btn: HTMLElement | null) => Promise<void> | void;
}) {
  const finalPrice  = computeDiscountPrice(p.price, p.discount);
  const hasDiscount = (p.discount ?? 0) > 0;
  const specs       = parseSpecs(p);

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
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:-translate-y-1 hover:shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Gift / discount badge */}
      {hasDiscount && (
        <div className="absolute right-3 top-3 z-10">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow text-base">🎁</span>
        </div>
      )}

      {/* Image */}
      <Link
        to={`/products/${p.slug}`}
        className="relative block aspect-4/3 overflow-hidden bg-gray-50 dark:bg-gray-800/50 p-2"
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
              "absolute inset-0 h-full w-full object-contain p-2 transition-opacity duration-500",
              i === idx ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        {images.length > 1 && (
          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn("h-1 rounded-full transition-all", i === idx ? "w-3 bg-brand-500" : "w-1 bg-gray-300")}
              />
            ))}
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        <Link to={`/products/${p.slug}`} className="line-clamp-2 text-theme-sm font-semibold leading-snug text-gray-800 hover:text-brand-500 dark:text-white/90">
          {p.name}
        </Link>

        {/* Spec chips */}
        {(specs.cpu || specs.ram || specs.ssd || specs.screen || specs.gpu) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {specs.cpu && <SpecChip icon={CPU_ICON}>{specs.cpu}</SpecChip>}
            {specs.gpu && <SpecChip icon={GPU_ICON}>{specs.gpu}</SpecChip>}
            {specs.ram && <SpecChip icon={RAM_ICON}>{specs.ram}</SpecChip>}
            {specs.ssd && <SpecChip icon={SSD_ICON}>{specs.ssd}</SpecChip>}
            {specs.screen && <SpecChip icon={SCR_ICON}>{specs.screen.split(" ").slice(0,2).join(" ")}</SpecChip>}
          </div>
        )}

        {/* Prices */}
        <div className="mt-auto pt-3">
          {hasDiscount && (
            <p className="text-theme-xs text-gray-400 line-through">
              {formatVND(p.price)}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="font-outfit text-lg font-extrabold text-brand-600 dark:text-brand-400">
              {formatVND(finalPrice)}
            </span>
            {hasDiscount && (
              <span className="rounded border border-error-400 px-1.5 py-0.5 text-[10px] font-bold text-error-500">
                -{p.discount}%
              </span>
            )}
          </div>

          {/* Rating + comment count */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-theme-xs text-gray-400">
            <span className="inline-flex items-center gap-0.5">
              <span className="text-[11px] text-warning-500">⭐</span>
              <span>{(p.averageRating ?? 0).toFixed(1)} ({p.totalReviews ?? 0} đánh giá)</span>
            </span>
            {(p.totalComments ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <span>💬</span>
                <span>{p.totalComments} bình luận</span>
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function SpecChip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      <span className="text-[9px]">{icon}</span>
      {children}
    </span>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="aspect-[4/3] animate-pulse bg-gray-100 dark:bg-gray-800" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="flex gap-1">
          {[1,2,3].map((i) => <div key={i} className="h-4 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />)}
        </div>
        <div className="h-5 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-8 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

/* ─── HotDealsSection ──────────────────────────────────────────────────────────
 * Section "🔥 Laptop giảm giá sốc" — 8 sản phẩm xếp 2 hàng × 4 cột.
 * Mỗi card có ảnh tự xoay vòng (nếu sản phẩm có nhiều ảnh) mỗi 3s,
 * lệch pha theo index để các card không đổi cùng lúc → nhìn bắt mắt.
 * ─────────────────────────────────────────────────────────────────────────── */
function HotDealsSection({
  products,
  loading,
  onAddToCart,
}: {
  products: Product[];
  loading: boolean;
  onAddToCart: (product: Product, qty: number, btn: HTMLElement | null) => Promise<void> | void;
}) {
  const items = products.slice(0, 8);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-error-50 via-warning-50 to-brand-50 p-5 dark:from-error-500/10 dark:via-warning-500/5 dark:to-brand-500/10 md:p-7">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-error-200/40 blur-3xl dark:bg-error-500/10" />
      <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-500/10" />

      {/* Header */}
      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-outfit text-2xl font-extrabold tracking-tight text-error-600 dark:text-error-400 md:text-3xl">
            🔥 Laptop giảm giá sốc
          </h2>
          <p className="mt-1 text-theme-sm text-gray-600 dark:text-gray-300">
            Khuyến mãi sâu — số lượng có hạn · 8 deal hot nhất hôm nay
          </p>
        </div>
        <Link
          to="/products?sort=discount"
          className="rounded-full bg-error-500 px-5 py-2 text-theme-sm font-bold text-white shadow-md transition hover:bg-error-600"
        >
          Xem tất cả →
        </Link>
      </div>

      {/* Grid 4 × 2 (responsive) */}
      <div className="relative grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : items.length === 0
          ? (
            <p className="col-span-full py-12 text-center text-theme-sm text-gray-500">
              Hiện chưa có deal nào — quay lại sau nhé.
            </p>
          )
          : items.map((p, i) => (
              <DealCard key={p.id} product={p} delayMs={i * 600} onAddToCart={onAddToCart} />
            ))}
      </div>
    </section>
  );
}

/* DealCard — variant của ProductCard, ảnh tự xoay nếu có nhiều ảnh */
function DealCard({
  product: p,
  delayMs,
}: {
  product: Product;
  delayMs: number;
  onAddToCart?: (product: Product, qty: number, btn: HTMLElement | null) => Promise<void> | void;
}) {
  const finalPrice  = computeDiscountPrice(p.price, p.discount);
  const hasDiscount = (p.discount ?? 0) > 0;
  const specs       = parseSpecs(p);

  // Tập ảnh để xoay vòng: ưu tiên productImages, fallback về mainImageUrl
  const images = (() => {
    const list = ((p as any).productImages as Array<{ imageUrl?: string | null; isActive?: boolean }> | undefined)
      ?.filter((i) => i.isActive !== false && i.imageUrl)
      .map((i) => i.imageUrl as string) ?? [];
    if (list.length === 0 && p.mainImageUrl) list.push(p.mainImageUrl);
    return list.length > 0 ? list : [""];
  })();

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const start = setTimeout(() => {
      const t = setInterval(() => setIdx((x) => (x + 1) % images.length), 3000);
      // cleanup-of-interval via closure
      (start as unknown as { _i?: number })._i = t as unknown as number;
    }, delayMs);
    return () => {
      clearTimeout(start);
      const t = (start as unknown as { _i?: number })._i;
      if (t) clearInterval(t as unknown as number);
    };
  }, [images.length, delayMs]);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
      {/* Discount ribbon */}
      {hasDiscount && (
        <div className="absolute left-0 top-3 z-10 rounded-r-full bg-error-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow">
          -{p.discount}%
        </div>
      )}
      <span className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-base shadow">
        🎁
      </span>

      {/* Image with crossfade */}
      <Link to={`/products/${p.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-gray-50 p-2 dark:bg-gray-800/50">
        {images.map((url, i) => (
          <img
            key={url + i}
            src={getImageUrl(url) || IMAGE_PLACEHOLDER}
            onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
            alt={p.name}
            loading="lazy"
            className={cn(
              "absolute inset-0 h-full w-full object-contain p-2 transition-opacity duration-700",
              i === idx ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        {/* Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all",
                  i === idx ? "w-3 bg-error-500" : "w-1 bg-gray-300",
                )}
              />
            ))}
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3">
        <Link to={`/products/${p.slug}`} className="line-clamp-2 min-h-[2.5rem] text-theme-sm font-semibold leading-snug text-gray-800 hover:text-error-500 dark:text-white/90">
          {p.name}
        </Link>

        {(specs.cpu || specs.ram || specs.ssd || specs.screen || specs.gpu) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {specs.cpu && <SpecChip icon={CPU_ICON}>{specs.cpu}</SpecChip>}
            {specs.gpu && <SpecChip icon={GPU_ICON}>{specs.gpu}</SpecChip>}
            {specs.ram && <SpecChip icon={RAM_ICON}>{specs.ram}</SpecChip>}
            {specs.ssd && <SpecChip icon={SSD_ICON}>{specs.ssd}</SpecChip>}
          </div>
        )}

        <div className="mt-auto pt-3">
          {hasDiscount && (
            <p className="text-theme-xs text-gray-400 line-through">{formatVND(p.price)}</p>
          )}
          <div className="flex items-baseline gap-2">
            <span className="font-outfit text-lg font-extrabold text-error-500">
              {formatVND(finalPrice)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-theme-xs text-gray-400">
            <span className="inline-flex items-center gap-0.5">
              <span className="text-[11px] text-warning-500">⭐</span>
              <span>{(p.averageRating ?? 0).toFixed(1)} ({p.totalReviews ?? 0})</span>
            </span>
            {(p.totalComments ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <span>💬</span>
                <span>{p.totalComments}</span>
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
