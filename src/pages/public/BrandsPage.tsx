import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { brandApi } from "@/api/brand.api";
import { productApi } from "@/api/product.api";
import type { Brand } from "@/api/types";

interface BrandWithCount extends Brand {
  productCount: number;
}

const BRAND_EMOJIS: Record<string, string> = {
  apple: "🍎", microsoft: "🪟", dell: "💻", hp: "🖨️",
  lenovo: "🔵", asus: "🔲", acer: "🔷", msi: "🎮",
  razer: "🐍", samsung: "📱", lg: "🎯", huawei: "🌸",
  xiaomi: "⚡", google: "🔍", fujitsu: "🇯🇵",
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const raw = await brandApi.getActive();
      // Fetch product count per brand in parallel (top 6)
      const withCounts = await Promise.all(
        raw.map(async (b) => {
          try {
            const res = await productApi.getAll({
              brandId: b.id,
              pageSize: 1,
              isActive: true,
            });
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

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-10 md:px-8">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="font-outfit text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
          Thương hiệu uy tín
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-theme-sm text-gray-500 dark:text-gray-400">
          LaptopShop phân phối chính hãng từ các thương hiệu laptop hàng đầu thế giới. Bảo hành
          trực tiếp từ nhà sản xuất, đầy đủ hoá đơn VAT.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {brands.map((b) => (
            <BrandCard key={b.id} brand={b} />
          ))}
        </div>
      )}

      {/* Why trust */}
      <section className="mt-16 rounded-3xl bg-gradient-to-br from-brand-50 to-purple-50 p-8 dark:from-brand-500/[0.08] dark:to-purple-500/[0.08]">
        <h2 className="mb-6 text-center font-outfit text-xl font-bold text-gray-900 dark:text-white">
          Tại sao mua tại LaptopShop?
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "✅", title: "Chính hãng 100%", desc: "Nhập khẩu trực tiếp, đầy đủ hoá đơn VAT và chứng nhận xuất xứ." },
            { icon: "🔧", title: "Bảo hành tận nơi", desc: "Kỹ thuật viên đến nhà, không cần mang máy ra cửa hàng." },
            { icon: "🔄", title: "Đổi mới 30 ngày", desc: "Lỗi phần cứng trong 30 ngày đổi máy mới hoàn toàn." },
            { icon: "💳", title: "Trả góp 0%", desc: "Hỗ trợ trả góp 0% qua thẻ tín dụng 6–24 tháng." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-white p-5 dark:bg-white/[0.05]">
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 text-theme-sm font-bold text-gray-900 dark:text-white">{f.title}</h3>
              <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function BrandCard({ brand: b }: { brand: BrandWithCount }) {
  const emoji = BRAND_EMOJIS[b.slug?.toLowerCase() ?? ""] ?? "💻";

  return (
    <Link
      to={`/products?brand=${b.slug}`}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03]"
    >
      {/* Emoji/logo placeholder */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-3xl transition-colors group-hover:bg-brand-50 dark:bg-gray-800 dark:group-hover:bg-brand-500/[0.12]">
        {emoji}
      </div>

      <div className="mt-4 flex-1">
        <h3 className="font-outfit text-lg font-bold text-gray-900 group-hover:text-brand-500 dark:text-white">
          {b.name}
        </h3>
        {b.description && (
          <p className="mt-1 line-clamp-2 text-theme-xs text-gray-500 dark:text-gray-400">
            {b.description}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-theme-xs font-medium text-brand-500">
          {b.productCount > 0 ? `${b.productCount} sản phẩm` : "Sắp có hàng"}
        </span>
        <span className="text-theme-xs text-gray-400 transition-colors group-hover:text-brand-500">
          Xem ngay →
        </span>
      </div>
    </Link>
  );
}
