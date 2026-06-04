import { useCallback, useEffect, useRef, useState } from "react";
import { Gift } from "lucide-react";
import { GiftHoverBadge } from "@/components/product/GiftHoverBadge";
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

/* ── Spec chip icons (line-icon names, render trong SpecChip) ── */
const CPU_ICON = "cpu"; const RAM_ICON = "ram"; const SSD_ICON = "ssd";
const SCR_ICON = "screen"; const GPU_ICON = "gpu";

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

/* Trust strip — line icons (path-only để render gọn), một tông trung tính */
const TRUST_ITEMS = [
  { text: "Bảo hành 24 tháng",   icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { text: "Đổi mới 30 ngày",     icon: "M23 4v6h-6|M1 20v-6h6|M3.51 9a9 9 0 0 1 14.85-3.36L23 10|M1 14l4.64 4.36A9 9 0 0 0 20.49 15" },
  { text: "Free ship ≥ 10 triệu", icon: "M1 6h13v9H1z|M14 9h4l3 3v3h-7z|M3.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z|M17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" },
  { text: "Hàng chính hãng",     icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M9 12l2 2 4-4" },
  { text: "Trả góp 0%",          icon: "M2 5h20v14H2z|M2 10h20" },
];

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
        <div className="px-4 pt-6 md:px-8">
          <HeroCarousel banners={banners} />
        </div>
      ) : (
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-20 text-white md:px-16 md:py-24">
          <div className="relative z-10 mx-auto max-w-2xl">
            <p className="mb-3 text-theme-xs font-semibold uppercase tracking-[0.18em] text-white/60">Nhà phân phối chính hãng</p>
            <h1 className="font-outfit text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Laptop chính hãng,<br />giá tốt nhất 2026.
            </h1>
            <p className="mt-4 max-w-lg text-theme-sm leading-relaxed text-white/70">
              MacBook, Dell, HP, Lenovo, ASUS, Acer, MSI, Razer. Bảo hành chính hãng tới 24 tháng.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="inline-flex h-12 items-center rounded-xl bg-white px-7 text-base font-semibold text-brand-700 transition hover:bg-brand-50 active:scale-[0.98]">
                Mua ngay
              </Link>
              <Link to="/products?sort=discount" className="inline-flex h-12 items-center rounded-xl border border-white/25 px-7 text-base font-medium text-white transition hover:bg-white/10">
                Xem khuyến mãi
              </Link>
            </div>
          </div>
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
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
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-center gap-x-7 gap-y-2.5 px-4 py-3.5 md:px-8">
          {TRUST_ITEMS.map((t, i) => (
            <span key={t.text} className="flex items-center gap-2.5 text-theme-xs font-medium text-gray-600 dark:text-gray-400">
              {i > 0 && <span aria-hidden className="hidden h-3.5 w-px bg-gray-200 dark:bg-gray-700 sm:block" />}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400 dark:text-gray-500">
                {t.icon.split("|").map((d, k) => <path key={k} d={d} />)}
              </svg>
              {t.text}
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
            subtitle="Chinh phục mọi tựa game, GPU mạnh mẽ"
            allProducts={gamingProducts}
            brands={topBrands.filter((b) => ["asus","msi","dell","lenovo","acer","razer"].includes(b.slug ?? ""))}
            loading={loading}
            cta="/products?category=gaming"
            framed
            carousel
            onAddToCart={handleAddToCart}
          />
        )}

        {/* Office */}
        {(loading || officeProducts.length > 0) && (
          <BrandFilterSection
            title="Laptop Văn Phòng"
            subtitle="Mỏng nhẹ, pin lâu, làm việc không giới hạn"
            allProducts={officeProducts}
            brands={topBrands.filter((b) => ["apple","dell","hp","lenovo","lg","samsung"].includes(b.slug ?? ""))}
            loading={loading}
            cta="/products?category=notebook"
            onAddToCart={handleAddToCart}
          />
        )}

        {/* Brand strip — marquee tự trượt ngang, dừng khi hover */}
        {brands.length > 0 && (
          <div className="rounded-3xl border border-gray-100 bg-gray-50 py-6 dark:border-gray-800 dark:bg-white/[0.02]">
            <p className="mb-5 text-center text-theme-xs font-semibold uppercase tracking-widest text-gray-400">
              Thương hiệu phân phối chính hãng
            </p>
            <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
              <div className="flex w-max animate-marquee items-center gap-3 pr-3 group-hover:[animation-play-state:paused]">
                {[...brands, ...brands].map((b, i) => (
                  <Link
                    key={`${b.id}-${i}`}
                    to={`/products?brand=${b.slug}`}
                    aria-hidden={i >= brands.length}
                    tabIndex={i >= brands.length ? -1 : 0}
                    className="shrink-0 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold tracking-tight text-gray-600 transition-colors hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
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
  framed?: boolean;
  carousel?: boolean;
  onAddToCart: (product: Product, qty: number, btn: HTMLElement | null) => Promise<void> | void;
}

function BrandFilterSection({ title, subtitle, allProducts, brands, loading, cta, accent, framed, carousel, onAddToCart }: SectionProps) {
  const [activeBrand, setActiveBrand] = useState<string | null>(null);

  const filtered = activeBrand
    ? allProducts.filter((p) => p.brandSlug === activeBrand || p.brandName?.toLowerCase() === activeBrand.toLowerCase())
    : allProducts;

  // Chỉ hiện brand tabs có sản phẩm
  const brandTabs = brands.filter((b) =>
    allProducts.some((p) => p.brandSlug === b.slug || p.brandName?.toLowerCase() === b.name.toLowerCase())
  );

  return (
    <section className={cn(framed && "rounded-3xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-white/[0.02] md:p-7")}>
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
        <span className="hidden items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-theme-xs font-medium text-gray-500 sm:inline-flex dark:border-gray-700 dark:text-gray-400">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M1 6h13v9H1z" /><path d="M14 9h4l3 3v3h-7z" />
            <path d="M3.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" /><path d="M17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
          </svg>
          Miễn phí giao hàng
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
      ) : carousel ? (
        <ProductCarousel key={activeBrand ?? "all"} products={filtered.slice(0, 10)} />
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

/* ─── ProductCarousel ──────────────────────────────────────────────────────────
 * 1 hàng, mặc định 4 sản phẩm (2 trên mobile). Tự trượt sang phải mỗi 2s,
 * loop liền mạch (clone phần đầu), dừng khi hover. Tôn trọng reduced-motion.
 * ─────────────────────────────────────────────────────────────────────────── */
function ProductCarousel({ products }: { products: Product[] }) {
  const STEP_MS = 2000;
  const [per, setPer]       = useState(4);
  const [idx, setIdx]       = useState(0);
  const [anim, setAnim]     = useState(true);
  const [paused, setPaused] = useState(false);

  // Responsive: 4 cột ≥ md, 2 cột mobile
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => { setPer(mq.matches ? 4 : 2); setIdx(0); };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const loopable = products.length > per;
  // Clone `per` item đầu vào cuối để wrap mượt
  const items = loopable ? [...products, ...products.slice(0, per)] : products;

  // Auto-advance mỗi 2s (bỏ qua nếu user tắt animation)
  useEffect(() => {
    if (!loopable || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIdx((i) => i + 1), STEP_MS);
    return () => clearInterval(t);
  }, [loopable, paused, per]);

  // Khi chạm vùng clone → snap về đầu không animation
  const onTransitionEnd = () => {
    if (idx >= products.length) { setAnim(false); setIdx(0); }
  };
  useEffect(() => {
    if (!anim) {
      const r = requestAnimationFrame(() => setAnim(true));
      return () => cancelAnimationFrame(r);
    }
  }, [anim]);

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex"
        style={{
          transform: `translateX(-${idx * (100 / per)}%)`,
          transition: anim ? "transform 600ms cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {items.map((p, i) => (
          <div key={`${p.id}-${i}`} className="shrink-0 px-2" style={{ width: `${100 / per}%` }}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
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
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/30">
      {/* Gift badge — only when product has gifts */}
      {p.hasGifts && (
        <div className="absolute right-3 top-3 z-20">
          <GiftHoverBadge productId={p.id} />
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
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 text-theme-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <StarIcon />
              <span>{(p.averageRating ?? 0).toFixed(1)} ({p.totalReviews ?? 0})</span>
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
    </div>
  );
}

const SPEC_ICONS: Record<string, string> = {
  cpu:    "M6 6h12v12H6z|M9 9h6v6H9z|M9 2v2|M15 2v2|M9 20v2|M15 20v2|M2 9h2|M2 15h2|M20 9h2|M20 15h2",
  gpu:    "M12 2 2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5",
  ram:    "M2 7h20v10H2z|M6 7v10|M10 7v10|M14 7v10|M18 7v10",
  ssd:    "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z|M2 12h20|M6 16h.01",
  screen: "M2 3h20v14H2z|M8 21h8|M12 17v4",
};
function SpecChip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400 dark:text-gray-500">
        {(SPEC_ICONS[icon] ?? "").split("|").map((d, i) => <path key={i} d={d} />)}
      </svg>
      {children}
    </span>
  );
}

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-warning-400">
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </svg>
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
 * Section "Đang giảm giá" — 8 sản phẩm xếp 2 hàng × 4 cột.
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
    <section className="rounded-3xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-white/[0.02] md:p-7">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-outfit text-xl font-bold tracking-tight text-gray-900 dark:text-white md:text-2xl">
              Đang giảm giá
            </h2>
            <span className="rounded-md bg-error-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-error-500 dark:bg-error-500/15">
              Sale
            </span>
          </div>
          <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            Ưu đãi sâu, số lượng có hạn
          </p>
        </div>
        <Link
          to="/products?sort=discount"
          className="shrink-0 text-theme-sm font-semibold text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400"
        >
          Xem tất cả →
        </Link>
      </div>

      {/* Grid 4 × 2 (responsive) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
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
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500/30">
      {/* Discount ribbon */}
      {hasDiscount && (
        <div className="absolute left-0 top-3 z-10 rounded-r-full bg-error-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow">
          -{p.discount}%
        </div>
      )}
      {p.hasGifts && (
        <span className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md text-purple-500"
          title="Có quà tặng kèm">
          <Gift size={14} strokeWidth={2} />
        </span>
      )}

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

          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 text-theme-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <StarIcon />
              <span>{(p.averageRating ?? 0).toFixed(1)} ({p.totalReviews ?? 0})</span>
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
    </div>
  );
}
