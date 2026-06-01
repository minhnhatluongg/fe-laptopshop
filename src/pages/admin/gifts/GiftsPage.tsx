import { useCallback, useEffect, useRef, useState } from "react";
import { Gift, TrendingUp, Package, AlertTriangle, BarChart2, Edit2, Trash2, Plus, X } from "lucide-react";
import { giftApi, type GiftDto, type GiftStatsDto, type UpsertGiftDto } from "@/api/gift.api";
import { fileApi } from "@/api/file.api";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { cn } from "@/utils/cn";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  color: "brand" | "success" | "warning" | "purple";
}) {
  const cls = {
    brand:   "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
    success: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
    warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
    purple:  "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  }[color];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className={cn("mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl", cls)}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-theme-sm text-gray-500">{label}</p>
      {sub && <p className="mt-1 text-theme-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────────────
function MiniBarChart({ data, title }: { data: { label: string; quantity: number }[]; title: string }) {
  const max = Math.max(...data.map(d => d.quantity), 1);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="mb-4 text-theme-sm font-semibold text-gray-900 dark:text-white">{title}</p>
      <div className="flex items-end gap-1.5 h-28">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t-md bg-purple-400 dark:bg-purple-500 transition-all"
              style={{ height: `${(d.quantity / max) * 100}%`, minHeight: d.quantity > 0 ? 4 : 0 }}
              title={`${d.label}: ${d.quantity}`} />
            <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.label.split(" ")[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Gift form modal ────────────────────────────────────────────────────────────
function GiftFormModal({ gift, onClose, onSaved }: {
  gift: GiftDto | null; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<UpsertGiftDto>({
    name: gift?.name ?? "",
    description: gift?.description ?? "",
    thumbnailUrl: gift?.thumbnailUrl ?? "",
    stock: gift?.stock ?? 0,
    isActive: gift?.isActive ?? true,
  });
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const set = (k: keyof UpsertGiftDto, v: string | number | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await fileApi.upload(file, setUploadProgress, "gifts");
      set("thumbnailUrl", res.fileUrl);
    } catch (e) { toast.error("Upload thất bại", (e as Error).message); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.warning("Vui lòng nhập tên quà tặng");
    setSaving(true);
    try {
      if (gift) { await giftApi.update(gift.id, form); toast.success("Đã cập nhật"); }
      else       { await giftApi.create(form);          toast.success("Đã tạo quà tặng mới"); }
      onSaved();
    } catch (e) { toast.error("Lưu thất bại", (e as Error).message); }
    finally { setSaving(false); }
  };

  const inputCls = "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {gift ? "Chỉnh sửa quà tặng" : "Thêm quà tặng mới"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Thumbnail */}
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 cursor-pointer"
              onClick={() => fileRef.current?.click()}>
              {uploading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-theme-xs text-gray-400">{uploadProgress}%</p>
                </div>
              ) : form.thumbnailUrl ? (
                <img src={getImageUrl(form.thumbnailUrl)}
                  onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                  alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Gift size={24} className="text-gray-300" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                <span className="text-xs text-white font-medium">Thay ảnh</span>
              </div>
            </div>
            <div className="flex-1">
              <input
                value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="Tên quà tặng *"
                className={inputCls} />
              <p className="mt-1.5 text-theme-xs text-gray-400">Click ảnh để tải lên thumbnail</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ""; }} />
          </div>

          <div>
            <label className="mb-1 block text-theme-xs font-medium text-gray-500">Mô tả</label>
            <textarea value={form.description ?? ""} onChange={e => set("description", e.target.value)}
              rows={2} placeholder="Mô tả ngắn về quà tặng..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-theme-xs font-medium text-gray-500">Số lượng tồn kho</label>
              <input type="number" min="0" value={form.stock} onChange={e => set("stock", Number(e.target.value))}
                className={inputCls} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-theme-sm text-gray-600 dark:text-gray-400">
                <input type="checkbox" checked={form.isActive} onChange={e => set("isActive", e.target.checked)}
                  className="h-4 w-4 rounded accent-brand-500" />
                Đang kích hoạt
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
          <button onClick={onClose}
            className="h-10 rounded-lg border border-gray-200 px-4 text-theme-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700">
            Huỷ
          </button>
          <button onClick={() => void handleSave()} disabled={saving || uploading}
            className="h-10 rounded-lg bg-brand-500 px-5 text-theme-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
            {saving ? "Đang lưu..." : gift ? "Cập nhật" : "Tạo mới"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GiftsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [gifts, setGifts]     = useState<GiftDto[]>([]);
  const [stats, setStats]     = useState<GiftStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [editGift, setEditGift] = useState<GiftDto | null | undefined>(undefined); // undefined = closed, null = new
  const [tab, setTab]         = useState<"catalog" | "stats">("catalog");
  const [year, setYear]       = useState(new Date().getFullYear());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, s] = await Promise.allSettled([
        giftApi.getAll(),
        giftApi.getStats(year),
      ]);
      if (g.status === "fulfilled") setGifts(g.value);
      if (s.status === "fulfilled") setStats(s.value);
    } finally { setLoading(false); }
  }, [year]);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = async (g: GiftDto) => {
    if (!await confirm({ title: `Xoá quà tặng "${g.name}"?`, message: "Quà tặng sẽ bị xoá vĩnh viễn.", variant: "danger", confirmLabel: "Xoá", cancelLabel: "Huỷ" })) return;
    try {
      await giftApi.delete(g.id);
      toast.success("Đã xoá", g.name);
      await load();
    } catch (e) { toast.error("Xoá thất bại", (e as Error).message); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-title-sm font-bold text-gray-900 dark:text-white">
            <Gift size={22} className="text-purple-500" />
            Quản lý quà tặng
          </h1>
          <p className="text-theme-sm text-gray-500">Catalog quà tặng kèm sản phẩm</p>
        </div>
        <button onClick={() => setEditGift(null)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-purple-500 px-4 text-theme-sm font-medium text-white hover:bg-purple-600 transition-colors">
          <Plus size={16} />
          Thêm quà mới
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit dark:border-gray-800 dark:bg-white/[0.03]">
        {[
          { key: "catalog", label: "Catalog", icon: <Package size={14} /> },
          { key: "stats",   label: "Thống kê", icon: <BarChart2 size={14} /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as "catalog" | "stats")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-4 py-2 text-theme-sm font-medium transition-colors",
              tab === t.key
                ? "bg-purple-500 text-white"
                : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5",
            )}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Catalog tab ── */}
      {tab === "catalog" && (
        <>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1,2,3,4].map(i => <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
            </div>
          ) : gifts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
              <Gift size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-theme-sm font-medium text-gray-700 dark:text-white">Chưa có quà tặng nào</p>
              <p className="mt-1 text-theme-xs text-gray-400">Nhấn "+ Thêm quà mới" để bắt đầu</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {gifts.map(g => (
                <div key={g.id}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                  {/* Thumbnail */}
                  <div className="aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={g.thumbnailUrl ? getImageUrl(g.thumbnailUrl) : IMAGE_PLACEHOLDER}
                      onError={e => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                      alt={g.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  </div>

                  {/* Status badge */}
                  <span className={cn(
                    "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    g.isActive
                      ? "bg-success-500/90 text-white"
                      : "bg-gray-500/80 text-white",
                  )}>
                    {g.isActive ? "Active" : "Inactive"}
                  </span>

                  <div className="p-3">
                    <p className="truncate text-theme-sm font-semibold text-gray-900 dark:text-white">{g.name}</p>
                    {g.description && (
                      <p className="mt-0.5 line-clamp-1 text-theme-xs text-gray-400">{g.description}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-theme-xs">
                      <span className={cn(
                        "font-medium",
                        g.stock === 0
                          ? "text-error-500"
                          : g.stock < 5
                          ? "text-warning-500"
                          : "text-gray-500",
                      )}>
                        {g.stock === 0 ? "⚠ Hết hàng" : `Kho: ${g.stock}`}
                      </span>
                      <span className="text-purple-500">
                        Đã phát: {g.totalDistributed}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-1 border-t border-gray-100 pt-3 dark:border-gray-800">
                      <button onClick={() => setEditGift(g)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 py-1.5 text-theme-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700">
                        <Edit2 size={12} /> Sửa
                      </button>
                      <button onClick={() => void handleDelete(g)}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-error-200 py-1.5 text-theme-xs text-error-500 hover:bg-error-50 dark:border-error-500/30 dark:hover:bg-error-500/10">
                        <Trash2 size={12} /> Xoá
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Stats tab ── */}
      {tab === "stats" && (
        <div className="space-y-5">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <label className="text-theme-sm text-gray-500">Năm:</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Stat cards */}
          {stats && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<Gift size={20} />}      label="Tổng quà tặng"    value={stats.totalGifts}       color="purple" />
                <StatCard icon={<Package size={20} />}   label="Đang kích hoạt"   value={stats.activeGifts}      color="success" />
                <StatCard icon={<TrendingUp size={20} />} label="Đã phát tặng"    value={stats.totalDistributed} color="brand" />
                <StatCard icon={<AlertTriangle size={20} />} label="Sắp hết kho"  value={stats.lowStock} sub="< 5 items" color="warning" />
              </div>

              {/* Charts */}
              <div className="grid gap-4 lg:grid-cols-2">
                <MiniBarChart data={stats.byMonth} title="📅 Phân phối theo tháng (12 tháng gần nhất)" />
                <MiniBarChart data={stats.byQuarter} title={`📊 Phân phối theo quý (${year})`} />
              </div>

              {/* Top gifts */}
              {stats.topGifts.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <p className="mb-4 text-theme-sm font-semibold text-gray-900 dark:text-white">
                    🏆 Top quà tặng được phân phối nhiều nhất ({year})
                  </p>
                  <div className="space-y-3">
                    {stats.topGifts.map((g, i) => (
                      <div key={g.giftId} className="flex items-center gap-3">
                        <span className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-theme-xs font-bold",
                          i === 0 ? "bg-yellow-100 text-yellow-600" :
                          i === 1 ? "bg-gray-100 text-gray-500" :
                          i === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-400",
                        )}>
                          {i + 1}
                        </span>
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                          <img src={g.imageUrl ? getImageUrl(g.imageUrl) : IMAGE_PLACEHOLDER}
                            onError={e => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                            alt="" className="h-full w-full object-cover" />
                        </div>
                        <p className="flex-1 text-theme-sm font-medium text-gray-800 dark:text-white">{g.name}</p>
                        <span className="text-theme-sm font-semibold text-purple-600 dark:text-purple-400">
                          {g.distributed} lần
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Gift form modal */}
      {editGift !== undefined && (
        <GiftFormModal
          gift={editGift}
          onClose={() => setEditGift(undefined)}
          onSaved={() => { setEditGift(undefined); void load(); }}
        />
      )}
    </div>
  );
}
