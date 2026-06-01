import { useCallback, useEffect, useState } from "react";
import { Gift, Plus, Trash2, Settings, Search } from "lucide-react";
import { giftApi, type GiftDto, type ProductGiftItemDto } from "@/api/gift.api";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { cn } from "@/utils/cn";

/* ──────────────────────────────────────────────────────────────────────────
 * GiftsTab — chọn quà từ Gifts Catalog.
 * Flow: Load catalog → chọn → save (gán cho SP).
 * ────────────────────────────────────────────────────────────────────────── */
export default function GiftsTab({ productId }: { productId: number }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [catalog, setCatalog]       = useState<GiftDto[]>([]);
  const [attached, setAttached]     = useState<ProductGiftItemDto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [busyId, setBusyId]         = useState<number | null>(null);
  const [editing, setEditing]       = useState<ProductGiftItemDto | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, att] = await Promise.allSettled([
        giftApi.getAll(true),          // active only
        giftApi.getByProduct(productId),
      ]);
      if (cat.status === "fulfilled") setCatalog(cat.value);
      if (att.status === "fulfilled") setAttached(att.value);
    } catch (e) { toast.error("Lỗi tải dữ liệu", (e as Error).message); }
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { void reload(); }, [reload]);

  const attachedIds = new Set(attached.map(a => a.giftId));
  const filtered = catalog.filter(g =>
    !attachedIds.has(g.id) &&
    (search.trim() === "" || g.name.toLowerCase().includes(search.toLowerCase()))
  );

  const addGift = async (g: GiftDto) => {
    setBusyId(g.id);
    try {
      await giftApi.addToProduct(productId, { giftId: g.id, quantity: 1, giftPrice: 0 });
      toast.success("Đã thêm quà tặng", g.name);
      await reload();
    } catch (e) { toast.error("Thêm thất bại", (e as Error).message); }
    finally { setBusyId(null); }
  };

  const removeGift = async (item: ProductGiftItemDto) => {
    if (!await confirm({ title: `Xoá "${item.giftName}" khỏi quà tặng?`, message: "Quà tặng sẽ bị gỡ khỏi sản phẩm này.", variant: "danger", confirmLabel: "Xoá", cancelLabel: "Huỷ" })) return;
    setBusyId(item.giftId);
    try {
      await giftApi.removeFromProduct(item.id);
      toast.info("Đã xoá", item.giftName);
      await reload();
    } catch (e) { toast.error("Xoá thất bại", (e as Error).message); }
    finally { setBusyId(null); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusyId(editing.giftId);
    try {
      await giftApi.removeFromProduct(editing.id);
      await giftApi.addToProduct(productId, {
        giftId: editing.giftId,
        quantity: editing.quantity,
        giftPrice: editing.giftPrice,
        note: editing.note ?? undefined,
      });
      toast.success("Đã cập nhật");
      setEditing(null);
      await reload();
    } catch (e) { toast.error("Lưu thất bại", (e as Error).message); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          <Gift size={18} className="text-purple-500" />
          Quà tặng kèm sản phẩm
          {attached.length > 0 && (
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-theme-xs font-bold text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
              {attached.length}
            </span>
          )}
        </h3>
        <p className="mt-0.5 text-theme-xs text-gray-500">
          Chọn quà tặng từ catalog để gán cho sản phẩm này.
        </p>
      </div>

      {/* ── Đã gán ── */}
      {attached.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
            <p className="text-theme-xs font-semibold text-gray-500">Quà đã gán ({attached.length})</p>
          </div>
          {attached.map((item, idx) => (
            <div key={item.id} className={cn(
              "flex items-center gap-3 px-4 py-3",
              idx > 0 && "border-t border-gray-50 dark:border-gray-800/50",
              busyId === item.giftId && "opacity-50",
            )}>
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                <img src={item.giftImageUrl ? getImageUrl(item.giftImageUrl) : IMAGE_PLACEHOLDER}
                  onError={e => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                  alt={item.giftName} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-theme-sm font-semibold text-gray-900 dark:text-white">{item.giftName}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-theme-xs">
                  <span className="text-gray-500">×{item.quantity}</span>
                  {item.giftPrice === 0 ? (
                    <span className="rounded-full bg-success-50 px-2 py-0.5 font-semibold text-success-600 dark:bg-success-500/10 dark:text-success-400">Miễn phí</span>
                  ) : (
                    <span className="text-gray-500">Giá: {formatVND(item.giftPrice)}</span>
                  )}
                  <span className="text-gray-400">Kho: {item.stock}</span>
                  {item.note && <span className="italic text-gray-400">"{item.note}"</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => setEditing(item)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5">
                  <Settings size={14} />
                </button>
                <button type="button" onClick={() => void removeGift(item)} disabled={busyId === item.giftId}
                  className="rounded-lg p-2 text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Catalog picker ── */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <p className="text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
            Chọn từ catalog
          </p>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm quà..."
              className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center dark:border-gray-700">
            <Gift size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-theme-xs text-gray-400">
              {catalog.length === 0
                ? "Catalog trống. Vào Admin → Quà tặng để tạo."
                : attachedIds.size >= catalog.filter(g=>g.isActive).length
                ? "Đã gán tất cả quà tặng có sẵn."
                : "Không tìm thấy quà tặng nào."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(g => (
              <div key={g.id}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                  <img src={g.thumbnailUrl ? getImageUrl(g.thumbnailUrl) : IMAGE_PLACEHOLDER}
                    onError={e => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                    alt={g.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-theme-xs font-semibold text-gray-800 dark:text-white">{g.name}</p>
                  <p className={cn("text-[11px]", g.stock === 0 ? "text-error-400" : "text-gray-400")}>
                    Kho: {g.stock === 0 ? "Hết hàng" : g.stock}
                  </p>
                </div>
                <button type="button" disabled={busyId === g.id || g.stock === 0}
                  onClick={() => void addGift(g)}
                  className="shrink-0 flex items-center gap-1 rounded-lg bg-purple-500 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-purple-600 disabled:opacity-50">
                  <Plus size={11} />
                  {busyId === g.id ? "..." : "Thêm"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <EditModal item={editing} onChange={setEditing}
          onSave={() => void saveEdit()} onClose={() => setEditing(null)}
          saving={busyId === editing.giftId} />
      )}
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
function EditModal({ item, onChange, onSave, onClose, saving }: {
  item: ProductGiftItemDto; onChange: (v: ProductGiftItemDto) => void;
  onSave: () => void; onClose: () => void; saving: boolean;
}) {
  const inputCls = "mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-theme-sm focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              <img src={item.giftImageUrl ? getImageUrl(item.giftImageUrl) : IMAGE_PLACEHOLDER}
                onError={e => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                alt="" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-theme-sm font-semibold text-gray-900 dark:text-white">Chỉnh sửa</p>
              <p className="text-theme-xs text-gray-400 line-clamp-1">{item.giftName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-theme-xs font-medium text-gray-500">Số lượng</label>
            <input type="number" min="1" value={item.quantity}
              onChange={e => onChange({ ...item, quantity: Number(e.target.value) || 1 })}
              className={inputCls} />
          </div>
          <div>
            <label className="text-theme-xs font-medium text-gray-500">
              Giá kèm (đ) — <span className="text-success-500 font-semibold">0 = Miễn phí</span>
            </label>
            <input type="number" min="0" value={item.giftPrice}
              onChange={e => onChange({ ...item, giftPrice: Number(e.target.value) || 0 })}
              className={inputCls} />
          </div>
          <div>
            <label className="text-theme-xs font-medium text-gray-500">Ghi chú</label>
            <input value={item.note ?? ""} onChange={e => onChange({ ...item, note: e.target.value })}
              placeholder="VD: Bao gồm cáp USB-C, hướng dẫn sử dụng..."
              className={inputCls} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="h-10 rounded-lg border border-gray-200 px-4 text-theme-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700">Huỷ</button>
          <button onClick={onSave} disabled={saving}
            className="h-10 rounded-lg bg-brand-500 px-5 text-theme-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

// X icon (local, avoid re-importing)
function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
