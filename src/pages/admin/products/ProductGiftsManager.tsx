import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { productApi } from "@/api/product.api";
import { productGiftApi, type ProductGiftDto } from "@/api/productGift.api";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmModal";
import type { Product } from "@/api/types";
import { formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin / Product / Gifts — quản lý quà tặng kèm cho 1 sản phẩm
 *
 *  - Route: /admin/products/:id/gifts
 *  - List gifts hiện tại
 *  - Search & thêm sản phẩm khác làm quà (UnitPrice = 0 hoặc giá ưu đãi)
 *  - Khi mua sản phẩm chính, BE tự tạo OrderItem cho mỗi gift
 * ────────────────────────────────────────────────────────────────────────── */
export default function ProductGiftsManager() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const toast = useToast();
  const confirm = useConfirm();

  const [product, setProduct] = useState<Product | null>(null);
  const [gifts, setGifts]     = useState<ProductGiftDto[]>([]);
  const [loading, setLoading] = useState(true);

  // search to add
  const [search, setSearch]         = useState("");
  const [candidates, setCandidates] = useState<Product[]>([]);
  const [adding, setAdding]         = useState(false);

  // form add
  const [pickedId, setPickedId]   = useState<number | null>(null);
  const [qty, setQty]             = useState("1");
  const [price, setPrice]         = useState("0");
  const [note, setNote]           = useState("");

  const reload = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [p, list] = await Promise.all([
        productApi.getById(productId),
        productGiftApi.getByProduct(productId),
      ]);
      setProduct(p);
      setGifts(list);
    } catch (e) {
      toast.error("Không tải được", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search candidates
  useEffect(() => {
    if (!search.trim()) { setCandidates([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await productApi.getAll({ search: search.trim(), pageSize: 10, isActive: true });
        // Loại bỏ chính SP đang quản lý + các SP đã là gift
        const giftIds = new Set(gifts.map((g) => g.giftProductId));
        setCandidates((r.items ?? []).filter((p) => p.id !== productId && !giftIds.has(p.id)));
      } catch { setCandidates([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [search, productId, gifts]);

  const onAdd = async () => {
    if (!pickedId) { toast.warning("Chọn sản phẩm làm quà"); return; }
    setAdding(true);
    try {
      await productGiftApi.add({
        productId,
        giftProductId: pickedId,
        quantity: Number(qty) || 1,
        giftPrice: Number(price) || 0,
        note: note.trim() || undefined,
        isActive: true,
      });
      toast.success("Đã thêm quà tặng");
      setPickedId(null); setSearch(""); setQty("1"); setPrice("0"); setNote("");
      void reload();
    } catch (e) {
      toast.error("Thêm thất bại", (e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const onRemove = async (giftId: number) => {
    if (!await confirm({ title: "Xóa quà tặng này?", message: "Quà tặng sẽ bị gỡ khỏi sản phẩm.", variant: "danger", confirmLabel: "Xoá", cancelLabel: "Huỷ" })) return;
    try {
      await productGiftApi.delete(giftId);
      toast.success("Đã xóa");
      void reload();
    } catch (e) {
      toast.error("Xóa thất bại", (e as Error).message);
    }
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quà tặng kèm</h1>
          <p className="text-theme-sm text-gray-500">
            Sản phẩm: <strong>{product?.name ?? `#${productId}`}</strong>
          </p>
        </div>
        <Link to={`/admin/products/${productId}`}
          className="text-theme-sm text-brand-500 hover:underline">← Quay lại sản phẩm</Link>
      </div>

      {/* Form add */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold">Thêm quà tặng</h2>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-theme-xs font-medium text-gray-500">Tìm sản phẩm làm quà</label>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPickedId(null); }}
              placeholder="Gõ tên sản phẩm (VD: chuột, balo, túi đựng...)"
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
            {candidates.length > 0 && !pickedId && (
              <ul className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                {candidates.map((c) => (
                  <li key={c.id}
                    onClick={() => { setPickedId(c.id); setSearch(c.name); }}
                    className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50">
                    <img src={c.mainImageUrl ? getImageUrl(c.mainImageUrl) : IMAGE_PLACEHOLDER}
                      alt="" className="h-10 w-10 rounded object-contain bg-gray-50" />
                    <div className="flex-1">
                      <p className="text-theme-sm font-medium">{c.name}</p>
                      <p className="text-theme-xs text-gray-500">{formatVND(c.price)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {pickedId && (
              <p className="mt-1 text-theme-xs text-success-600">
                ✓ Đã chọn sản phẩm #{pickedId}
              </p>
            )}
          </div>

          <div>
            <label className="text-theme-xs font-medium text-gray-500">Số lượng</label>
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <div>
            <label className="text-theme-xs font-medium text-gray-500">Giá kèm (0 = miễn phí)</label>
            <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <div className="md:col-span-2">
            <label className="text-theme-xs font-medium text-gray-500">Ghi chú (hiển thị cho khách)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Chuột Logitech, balo chống sốc..."
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
          </div>
        </div>

        <button onClick={() => void onAdd()} disabled={!pickedId || adding}
          className="mt-4 h-10 rounded-lg bg-brand-500 px-5 text-theme-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
          {adding ? "Đang thêm..." : "+ Thêm quà tặng"}
        </button>
      </div>

      {/* List gifts */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h2 className="font-semibold">Quà tặng hiện tại ({gifts.length})</h2>
        </div>
        {loading ? (
          <p className="p-8 text-center text-gray-400">Đang tải...</p>
        ) : gifts.length === 0 ? (
          <p className="p-8 text-center text-gray-400">Sản phẩm này chưa có quà tặng.</p>
        ) : (
          <ul>
            {gifts.map((g) => (
              <li key={g.id}
                className="flex items-center gap-4 border-b border-gray-100 p-4 last:border-0 dark:border-gray-800">
                <img src={g.giftImageUrl ? getImageUrl(g.giftImageUrl) : IMAGE_PLACEHOLDER}
                  alt="" className="h-14 w-14 rounded-lg object-contain bg-gray-50 dark:bg-gray-800" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{g.giftProductName}</p>
                  <p className="text-theme-xs text-gray-500">
                    SL: <strong>{g.quantity}</strong> ·
                    Giá kèm: {g.giftPrice === 0
                      ? <span className="text-error-500 font-semibold"> MIỄN PHÍ</span>
                      : <strong> {formatVND(g.giftPrice)}</strong>}
                    {g.giftOriginalPrice > 0 && (
                      <> · Giá gốc: <span className="line-through">{formatVND(g.giftOriginalPrice)}</span></>
                    )}
                  </p>
                  {g.note && <p className="text-theme-xs text-gray-400 mt-0.5">{g.note}</p>}
                </div>
                <button onClick={() => void onRemove(g.id)}
                  className="rounded-lg bg-error-500 px-3 py-1 text-theme-xs text-white hover:bg-error-600">
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
