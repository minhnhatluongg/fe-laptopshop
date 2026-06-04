import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { brandApi } from "@/api/brand.api";
import { productApi } from "@/api/product.api";
import type { Brand } from "@/api/types";

interface BrandWithCount extends Brand {
  productCount: number;
}

/* Map slug nội bộ → slug Simple Icons khi khác nhau. Còn lại dùng chính slug. */
const SI_SLUG: Record<string, string> = {
  msi: "msibusiness",
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const raw = await brandApi.getActive();
      const withCounts = await Promise.all(
        raw.map(async (b) => {
          try {
            const res = await productApi.getAll({ brandId: b.id, pageSize: 1, isActive: true });
            return { ...b, productCount: res.totalCount ?? 0 };
          } catch {
            return { ...b, productCount: 0 };
          }
        }),
      );
      setBrands(withCounts.sort((a, b) => b.productCount - a.productCount));
      setLoading(false);
    };
    void load();
  }, []);

  const totalProducts = brands.reduce((s, b) => s + b.productCount, 0);

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-12 md:px-8">
      {/* ── Hero ── */}
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-outfit text-3xl font-bold tracking-tight text-gray-900 dark:text-white md:text-4xl">
          Thương hiệu chính hãng
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
          LaptopShop phân phối trực tiếp từ các nhà sản xuất laptop hàng đầu thế giới,
          bảo hành chính hãng và đầy đủ hoá đơn VAT.
        </p>
        {!loading && brands.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-8">
            <Stat value={brands.length} label="Thương hiệu" />
            <span className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
            <Stat value={totalProducts} label="Sản phẩm chính hãng" />
          </div>
        )}
      </header>

      {/* ── Grid ── */}
      <div className="mt-12 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <BrandCardSkeleton key={i} />)
          : brands.map((b) => <BrandCard key={b.id} brand={b} />)}
      </div>

      {/* ── Why trust ── */}
      <section className="mt-20">
        <h2 className="text-center font-outfit text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Tại sao mua tại LaptopShop?
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-brand-200 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/30"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  {f.icon.split("|").map((d, i) => <path key={i} d={d} />)}
                </svg>
              </div>
              <h3 className="mt-4 text-theme-sm font-bold text-gray-900 dark:text-white">{f.title}</h3>
              <p className="mt-1 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="font-outfit text-2xl font-bold text-gray-900 dark:text-white">
        {value.toLocaleString("vi-VN")}
      </p>
      <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

// ── Brand logo: Simple Icons (màu thương hiệu thật) trên ô trắng, fallback monogram ──
function BrandLogo({ brand }: { brand: Brand }) {
  const [failed, setFailed] = useState(false);
  const key = (brand.slug ?? "").toLowerCase();
  const siSlug = SI_SLUG[key] ?? key;

  if (failed || !siSlug) {
    return (
      <span className="font-outfit text-3xl font-extrabold text-gray-300 dark:text-gray-600">
        {brand.name.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={`https://cdn.simpleicons.org/${siSlug}`}
      alt={brand.name}
      loading="lazy"
      className="h-full w-full object-contain"
      onError={() => setFailed(true)}
    />
  );
}

function BrandCard({ brand: b }: { brand: BrandWithCount }) {
  return (
    <Link
      to={`/products?brand=${b.slug}`}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Logo chip — luôn nền trắng để logo hiển thị nhất quán ở cả 2 theme */}
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm dark:border-gray-700">
          <BrandLogo brand={b} />
        </div>
        {b.productCount > 0 && (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-theme-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {b.productCount} sản phẩm
          </span>
        )}
      </div>

      <h3 className="mt-5 font-outfit text-lg font-bold text-gray-900 transition-colors group-hover:text-brand-500 dark:text-white">
        {b.name}
      </h3>
      {b.description ? (
        <p className="mt-1 line-clamp-2 flex-1 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {b.description}
        </p>
      ) : (
        <div className="flex-1" />
      )}

      <span className="mt-5 inline-flex items-center gap-1 text-theme-sm font-semibold text-brand-500 dark:text-brand-400">
        {b.productCount > 0 ? "Xem sản phẩm" : "Sắp có hàng"}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className="transition-transform duration-200 group-hover:translate-x-1">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  );
}

function BrandCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="h-16 w-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      <div className="mt-5 h-5 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      <div className="mt-2 h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      <div className="mt-1.5 h-3 w-4/5 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      <div className="mt-5 h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

const FEATURES = [
  {
    title: "Chính hãng 100%",
    desc: "Nhập khẩu trực tiếp, đầy đủ hoá đơn VAT và chứng nhận xuất xứ.",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M9 12l2 2 4-4",
  },
  {
    title: "Bảo hành tận nơi",
    desc: "Kỹ thuật viên đến nhà, không cần mang máy ra cửa hàng.",
    icon: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  },
  {
    title: "Đổi mới 30 ngày",
    desc: "Lỗi phần cứng trong 30 ngày được đổi máy mới hoàn toàn.",
    icon: "M23 4v6h-6|M1 20v-6h6|M3.51 9a9 9 0 0 1 14.85-3.36L23 10|M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  },
  {
    title: "Trả góp 0%",
    desc: "Hỗ trợ trả góp 0% qua thẻ tín dụng từ 6 đến 24 tháng.",
    icon: "M2 5h20v14H2z|M2 10h20",
  },
];
