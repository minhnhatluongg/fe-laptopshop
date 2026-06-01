import { useEffect, useMemo, useState } from "react";
import { productApi } from "@/api/product.api";
import { productGiftApi, type ProductGiftDto } from "@/api/productGift.api";
import { useToast } from "@/context/ToastContext";
import type { Product } from "@/api/types";
import { formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";

/* ──────────────────────────────────────────────────────────────────────────
 * GiftsTab — tab "Quà tặng" trong ProductForm.
 *
 *  UX: hiển thị TẤT CẢ sản phẩm dạng grid + checkbox.
 *      - Đã gán = checked + viền xanh.
 *      - Click checkbox = thêm/xóa ngay (auto save).
 *      - Search box lọc nhanh.
 *      - Mỗi item có nút "⚙ Sửa" để chỉnh số lượng / giá kèm / note.
 * ────────────────────────────────────────────────────────────────────────── */
export default function GiftsTab({ productId }: { productId: number }) {
  const toast = useToast();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [gifts, setGifts]             = useState<ProductGiftDto[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [busyId, setBusyId]           = useState<number | null>(null);
  const [editing, setEditing]         = useState<ProductGiftDto | null>(null);

  const giftMap = useMemo(() => {
    const m = new Map<number, ProductGiftDto>();
    for (const g of gifts) m.set(g.giftProductId, g);
    return m;
  }, [gifts]);

  const reload = async () => {
    setLoading(true);
    try {
      const [list, all] = await Promise.all([
        productGiftApi.getByProduct(productId),
        productApi.getAll({ pageSize: 100, isActive: true }),
      ]);
      setGifts(list);
      setAllProducts(all.items ?? []);
    } catch (e) {
      toast.error("Không tải được", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void reload(); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lọc + loại bỏ chính SP đang edit
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return allProducts.filter((p) => p.id !== productId && (
      !s ||
      p.name.toLowerCase().includes(s) ||
      (p.brandName ?? "").toLowerCase().includes(s)
    ));
  }, [allProducts, search, productId]);

  /** Toggle 1 product làm gift — tự gán hoặc xóa */
  const toggle = async (p: Product) => {
    const existing = giftMap.get(p.id);
    setBusyId(p.id);
    try {
      if (existing) {
        await productGiftApi.delete(existing.id);
        toast.info("Đã bỏ quà tặng", p.name);
      } else {
        await productGiftApi.add({
          productId,
          giftProductId: p.id,
          quantity: 1,
          giftPrice: 0,    // mặc định miễn phí
          isActive: true,
        });
        toast.success("Đã thêm quà tặng", p.name);
      }
      void reload();
    } catch (e) {
      toast.error("Thao tác thất bại", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  /** Lưu chỉnh sửa quantity/giftPrice/note */
  const saveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.giftProductId);
    try {
      // Cách đơn giản: delete + add lại với value mới
      await productGiftApi.delete(editing.id);
      await productGiftApi.add({
        productId,
        giftProductId: editing.giftProductId,
        quantity: editing.quantity,
        giftPrice: editing.giftPrice,
        note: editing.note ?? undefined,
        isActive: editing.isActive,
      });
      toast.success("Đã cập nhật");
      setEditing(null);
      void reload();
    } catch (e) {
      toast.error("Cập nhật thất bại", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Quà tặng kèm sản phẩm
          </h3>
          <p className="text-theme-xs text-gray-500">
            Click vào sản phẩm để thêm/bỏ. Mặc định miễn phí — click "⚙" để chỉnh số lượng/giá kèm.
            Đã chọn: <strong className="text-brand-500">{gifts.length}</strong>
          </p>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm sản phẩm..."
          className="h-10 w-64 rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) =>
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          )}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-gray-400">Không có sản phẩm phù hợp.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => {
            const g = giftMap.get(p.id);
            const isGift = !!g;
            return (
              <div key={p.id}
                className={`group relative rounded-xl border-2 p-3 transition-all
                  ${isGift
                    ? "border-brand-500 bg-brand-50/40 dark:bg-brand-500/10"
                    : "border-gray-200 bg-white hover:border-brand-300 dark:border-gray-700 dark:bg-gray-900"
                  } ${busyId === p.id ? "opacity-50" : ""}`}>
                {/* Checkbox top-right */}
                <button type="button" onClick={() => void toggle(p)} disabled={busyId === p.id}
                  className={`absolute right-2 top-2 z-10 h-6 w-6 rounded-md border-2 flex items-center justify-center transition
                    ${isGift
                      ? "bg-brand-500 border-brand-500 text-white"
                      : "bg-white border-gray-300 hover:border-brand-400 dark:bg-gray-800"}`}>
                  {isGift && "✓"}
                </button>
                {/* Edit btn — chỉ hiện khi đã là gift */}
                {isGift && (
                  <button type="button" onClick={() => setEditing(g!)}
                    title="Sửa số lượng / giá"
                    className="absolute right-10 top-2 z-10 h-6 w-6 rounded-md bg-white border border-gray-300 text-xs hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                    ⚙
                  </button>
                )}

                <div onClick={() => void toggle(p)} className="cursor-pointer">
                  <div className="aspect-square overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-800">
                    <img src={p.mainImageUrl ? getImageUrl(p.mainImageUrl) : IMAGE_PLACEHOLDER}
                      onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                      alt={p.name}
                      className="h-full w-full object-contain" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-theme-sm font-medium text-gray-900 dark:text-white">
                    {p.name}
                  </p>
                  <p className="text-theme-xs text-gray-500">{formatVND(p.price)}</p>
                  {isGift && (
                    <p className="mt-1 text-theme-xs font-semibold text-brand-600">
                      SL: {g.quantity} ·
                      {g.giftPrice === 0
                        ? <span className="text-error-500"> Miễn phí</span>
                        : <> Giá kèm: {formatVND(g.giftPrice)}</>}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditGiftModal
          gift={editing}
          onChange={setEditing}
          onSave={() => void saveEdit()}
          onClose={() => setEditing(null)}
          saving={busyId === editing.giftProductId}
        />
      )}
    </div>
  );
}

function EditGiftModal({
  gift, onChange, onSave, onClose, saving,
}: {
  gift: ProductGiftDto;
  onChange: (g: ProductGiftDto) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Chỉnh sửa quà tặng</h3>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-700">×</button>
        </div>
        <p className="mt-1 text-theme-sm text-gray-500">{gift.giftProductName}</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-theme-xs font-medium text-gray-500">Số lượng</label>
            <input type="number" min="1" value={gift.quantity}
              onChange={(e) => onChange({ ...gift, quantity: Number(e.target.value) || 1 })}
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <div>
            <label className="text-theme-xs font-medium text-gray-500">Giá kèm (0 = miễn phí)</label>
            <input type="number" min="0" value={gift.giftPrice}
              onChange={(e) => onChange({ ...gift, giftPrice: Number(e.target.value) || 0 })}
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <div>
            <label className="text-theme-xs font-medium text-gray-500">Ghi chú</label>
            <input value={gift.note ?? ""}
              onChange={(e) => onChange({ ...gift, note: e.target.value })}
              placeholder="VD: Chuột Logitech, balo chống sốc..."
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 dark:border-gray-700 dark:bg-gray-800" />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-theme-sm dark:border-gray-700">Huỷ</button>
          <button onClick={onSave} disabled={saving}
            className="rounded-lg bg-brand-500 px-4 py-2 text-theme-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
