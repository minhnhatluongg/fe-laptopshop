import { useCallback, useEffect, useState } from "react";
import {
  variantApi,
  type AttributeValueDto,
  type ProductAttributeDto,
  type ProductVariantDto,
  type VariantPreviewDto,
} from "@/api/variant.api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { formatVND } from "@/utils/format";
import { cn } from "@/utils/cn";

// ── Brand-specific attribute presets ─────────────────────────────────────────
// Keys match attribute names from API; values match AttributeValueDto.value strings.
const BRAND_PRESETS: Record<string, Record<string, string[]>> = {
  Apple: {
    CPU:      ["M3", "M3 Pro", "M3 Max", "M4", "M4 Pro", "M4 Max"],
    GPU:      ["Integrated"],
    RAM:      ["8GB", "16GB", "24GB", "36GB", "48GB"],
    SSD:      ["256GB", "512GB", "1TB", "2TB"],
    "Màu sắc": ["Space Black", "Space Gray", "Silver", "Midnight", "Starlight",
                "Sky Blue", "Natural Titanium", "Black Titanium", "White Titanium"],
  },
  Dell: {
    CPU:      ["Core Ultra 5", "Core Ultra 7", "Core Ultra 9"],
    GPU:      ["RTX 4050", "RTX 4060", "RTX 4070", "RTX 4080", "Integrated"],
    RAM:      ["16GB", "32GB", "64GB"],
    SSD:      ["512GB", "1TB", "2TB"],
    "Màu sắc": ["Platinum", "Silver", "Cosmic Black"],
  },
  HP: {
    CPU:      ["Core Ultra 5", "Core Ultra 7"],
    GPU:      ["RTX 4050", "RTX 4060", "Integrated"],
    RAM:      ["8GB", "16GB", "32GB"],
    SSD:      ["256GB", "512GB", "1TB"],
    "Màu sắc": ["Silver", "Cosmic Black", "Midnight"],
  },
  Lenovo: {
    CPU:      ["Core Ultra 5", "Core Ultra 7", "Ryzen 5", "Ryzen 7"],
    GPU:      ["RTX 4050", "RTX 4060", "RTX 4070", "Integrated"],
    RAM:      ["16GB", "32GB"],
    SSD:      ["512GB", "1TB"],
    "Màu sắc": ["Cosmic Black", "Silver", "Platinum"],
  },
  ASUS: {
    CPU:      ["Core Ultra 5", "Core Ultra 7", "Core Ultra 9", "Ryzen 5", "Ryzen 7", "Ryzen 9"],
    GPU:      ["RTX 4060", "RTX 4070", "RTX 4080", "RTX 4090", "Integrated"],
    RAM:      ["16GB", "32GB", "64GB"],
    SSD:      ["512GB", "1TB", "2TB"],
    "Màu sắc": ["Cosmic Black", "Silver", "Midnight"],
  },
  Acer: {
    CPU:      ["Core Ultra 5", "Core Ultra 7", "Ryzen 5", "Ryzen 7"],
    GPU:      ["RTX 4050", "RTX 4060", "RTX 4070", "Integrated"],
    RAM:      ["16GB", "32GB"],
    SSD:      ["512GB", "1TB"],
    "Màu sắc": ["Cosmic Black", "Silver", "Platinum"],
  },
  MSI: {
    CPU:      ["Core Ultra 7", "Core Ultra 9"],
    GPU:      ["RTX 4060", "RTX 4070", "RTX 4080", "RTX 4090", "RTX 5080", "RTX 5090"],
    RAM:      ["16GB", "32GB", "64GB"],
    SSD:      ["512GB", "1TB", "2TB"],
    "Màu sắc": ["Cosmic Black", "Silver"],
  },
  Samsung: {
    CPU:      ["Core Ultra 5", "Core Ultra 7", "Snapdragon X Plus", "Snapdragon X Elite"],
    GPU:      ["Integrated", "Arc"],
    RAM:      ["8GB", "16GB", "32GB"],
    SSD:      ["256GB", "512GB", "1TB"],
    "Màu sắc": ["Platinum", "Silver", "Cosmic Black", "Sky Blue"],
  },
  Razer: {
    CPU:      ["Core Ultra 7", "Core Ultra 9"],
    GPU:      ["RTX 4070", "RTX 4080", "RTX 4090"],
    RAM:      ["16GB", "32GB", "64GB"],
    SSD:      ["1TB", "2TB"],
    "Màu sắc": ["Cosmic Black", "Silver"],
  },
  LG: {
    CPU:      ["Core Ultra 5", "Core Ultra 7"],
    GPU:      ["Integrated"],
    RAM:      ["16GB", "32GB"],
    SSD:      ["256GB", "512GB", "1TB"],
    "Màu sắc": ["Silver", "Cosmic Black", "Platinum"],
  },
};

interface Props { productId: number; brandName?: string; }

type Step = "select" | "preview" | "manage";

export function VariantManager({ productId, brandName }: Props) {
  const confirm = useConfirm();
  const [attributes, setAttributes]   = useState<ProductAttributeDto[]>([]);
  const [variants, setVariants]       = useState<ProductVariantDto[]>([]);
  const [loading, setLoading]         = useState(true);
  const [step, setStep]               = useState<Step>("manage");

  // Step 1 — Selection state
  const [selected, setSelected]       = useState<Record<number, Set<number>>>({});
  const [skuPrefix, setSkuPrefix]     = useState("");
  const [defaultPrice, setDefaultPrice] = useState(0);
  const [defaultStock, setDefaultStock] = useState(10);

  // Step 2 — Preview state
  const [previews, setPreviews]       = useState<VariantPreviewDto[]>([]);
  const [editedPreviews, setEditedPreviews] = useState<VariantPreviewDto[]>([]);
  const [previewing, setPreviewing]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [clearExisting, setClearExisting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [attrs, vars] = await Promise.allSettled([
      variantApi.getAttributes(),
      variantApi.getByProduct(productId),
    ]);
    if (attrs.status === "fulfilled") setAttributes(attrs.value);
    if (vars.status === "fulfilled")  setVariants(vars.value);
    setLoading(false);
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  // Toggle attribute value selection
  const toggleValue = (attrId: number, valId: number) => {
    setSelected((prev) => {
      const next = { ...prev };
      const set  = new Set(next[attrId] ?? []);
      set.has(valId) ? set.delete(valId) : set.add(valId);
      if (set.size === 0) delete next[attrId];
      else next[attrId] = set;
      return next;
    });
  };

  // Apply brand preset — match by attr.name and val.value strings
  const applyBrandPreset = () => {
    const preset = brandName ? BRAND_PRESETS[brandName] : null;
    if (!preset || attributes.length === 0) return;
    const next: Record<number, Set<number>> = {};
    for (const attr of attributes) {
      const presetValues = preset[attr.name];
      if (!presetValues) continue;
      const matched = attr.values.filter((v) => presetValues.includes(v.value));
      if (matched.length > 0) next[attr.id] = new Set(matched.map((v) => v.id));
    }
    setSelected(next);
  };

  const hasPreset = brandName ? !!BRAND_PRESETS[brandName] : false;

  const selectedGroupCount = Object.values(selected).filter((s) => s.size > 0).length;
  const cartesianSize      = Object.values(selected).reduce((acc, s) => acc * (s.size || 1), selectedGroupCount > 0 ? 1 : 0);

  // Generate preview
  const handlePreview = async () => {
    const groups = Object.values(selected).map((s) => Array.from(s)).filter((g) => g.length > 0);
    if (groups.length === 0) return;
    setPreviewing(true);
    try {
      const result = await variantApi.previewMatrix(productId, {
        attributeGroups: groups,
        skuPrefix: skuPrefix.trim() || undefined,
        defaultPrice,
        defaultStock,
      });
      setPreviews(result);
      setEditedPreviews(result.map((p) => ({ ...p })));
      setStep("preview");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi tạo preview");
    } finally {
      setPreviewing(false);
    }
  };

  // Bulk save
  const handleSave = async () => {
    setSaving(true);
    try {
      await variantApi.bulkSave(productId, {
        variants: editedPreviews.map((p) => ({
          sku: p.sku, price: p.price, stockQuantity: p.stockQuantity,
          isActive: true, attributeValueIds: p.attributeValueIds,
        })),
        clearExisting,
      });
      await load();
      setStep("manage");
      setSelected({});
      setPreviews([]);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = async (id: number) => {
    if (!await confirm({ title: "Xoá biến thể?", message: "Biến thể này sẽ bị xoá vĩnh viễn.", variant: "danger", confirmLabel: "Xoá", cancelLabel: "Huỷ" })) return;
    try {
      await variantApi.deleteVariant(id);
      setVariants((v) => v.filter((x) => x.id !== id));
    } catch (e) { alert(e instanceof Error ? e.message : "Lỗi"); }
  };

  if (loading) return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header tabs ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-white/[0.03]">
          {(["manage", "select", "preview"] as Step[]).map((s) => (
            <button key={s} type="button" onClick={() => setStep(s)}
              disabled={s === "preview" && previews.length === 0}
              className={cn(
                "rounded-lg px-4 py-2 text-theme-sm font-medium transition-colors disabled:opacity-40",
                step === s
                  ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5",
              )}>
              {s === "manage" ? `Biến thể (${variants.length})` : s === "select" ? "Tạo mới" : "Preview"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Manage: list existing variants ── */}
      {step === "manage" && (
        <>
          {variants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-12 text-center dark:border-gray-700">
              <p className="text-theme-sm font-semibold text-gray-700 dark:text-white">Chưa có biến thể</p>
              <p className="mt-1 text-theme-xs text-gray-500">Bấm "Tạo mới" để dùng Matrix Generator tự động sinh tổ hợp.</p>
              <button type="button" onClick={() => setStep("select")}
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand-500 px-5 text-theme-sm font-medium text-white hover:bg-brand-600">
                Tạo biến thể ngay
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead>
                  <tr>
                    {["SKU", "Cấu hình", "Giá bán", "Giá gốc", "Kho", "Trạng thái", ""].map((h) => (
                      <th key={h} className="pb-3 pr-4 text-left text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 first:pl-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {variants.map((v) => (
                    <VariantRow key={v.id} variant={v}
                      onUpdate={(id, dto) => variantApi.updateVariant(id, dto).then(() => load())}
                      onDelete={() => void handleDeleteVariant(v.id)} />
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => setStep("select")}
                  className="inline-flex h-9 items-center rounded-lg border border-gray-200 px-4 text-theme-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400">
                  + Thêm biến thể
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Select: attribute value picker ── */}
      {step === "select" && (
        <div className="space-y-5">
          {/* Brand preset banner */}
          {hasPreset && (
            <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 dark:border-indigo-500/20 dark:bg-indigo-500/10">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🎯</span>
                <div>
                  <p className="text-theme-sm font-semibold text-indigo-700 dark:text-indigo-300">
                    Có preset cho <strong>{brandName}</strong>
                  </p>
                  <p className="text-theme-xs text-indigo-500 dark:text-indigo-400">
                    Tự động chọn các thông số phổ biến của dòng {brandName}
                  </p>
                </div>
              </div>
              <button type="button" onClick={applyBrandPreset}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-500 px-4 text-theme-xs font-semibold text-white hover:bg-indigo-600 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Áp preset {brandName}
              </button>
            </div>
          )}

          {attributes.length === 0 ? (
            <p className="text-theme-sm text-gray-500">Chưa có attribute nào. Chạy file <code>13_seed_attributes.sql</code> trước.</p>
          ) : (
            attributes.map((attr) => {
              const presetVals = brandName ? (BRAND_PRESETS[brandName]?.[attr.name] ?? []) : [];
              return (
                <div key={attr.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="text-theme-sm font-semibold text-gray-800 dark:text-white">{attr.name}</h4>
                    {presetVals.length > 0 && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        {brandName} preset
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attr.values.map((val) => {
                      const active    = selected[attr.id]?.has(val.id) ?? false;
                      const inPreset  = presetVals.includes(val.value);
                      return (
                        <button key={val.id} type="button"
                          onClick={() => toggleValue(attr.id, val.id)}
                          title={inPreset ? `Phổ biến với ${brandName}` : undefined}
                          className={cn(
                            "relative rounded-lg border px-3 py-1.5 text-theme-sm font-medium transition-colors",
                            active
                              ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                              : inPreset
                              ? "border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:border-indigo-400 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                              : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400",
                          )}>
                          {val.value}
                          {inPreset && !active && (
                            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-indigo-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }))
          }

          {/* Config */}
          <div className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3 dark:border-gray-700 dark:bg-white/[0.02]">
            <div>
              <label className="mb-1.5 block text-theme-xs font-medium text-gray-600 dark:text-gray-400">Prefix SKU</label>
              <input value={skuPrefix} onChange={(e) => setSkuPrefix(e.target.value)}
                placeholder="LAP-MAC-M4"
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-theme-xs font-medium text-gray-600 dark:text-gray-400">Giá mặc định (VND)</label>
              <input type="number" min="0" value={defaultPrice} onChange={(e) => setDefaultPrice(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-theme-xs font-medium text-gray-600 dark:text-gray-400">Kho mặc định</label>
              <input type="number" min="0" value={defaultStock} onChange={(e) => setDefaultStock(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
            </div>
          </div>

          {selectedGroupCount > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3 dark:bg-brand-500/10">
              <span className="text-theme-sm text-brand-700 dark:text-brand-300">
                {selectedGroupCount} trục × → <strong>{cartesianSize} biến thể</strong> sẽ được tạo
              </span>
              <Button onClick={() => void handlePreview()} disabled={previewing}>
                {previewing ? "Đang tạo..." : "Preview →"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Preview: editable table ── */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-theme-sm font-semibold text-gray-900 dark:text-white">
                {editedPreviews.length} biến thể sẽ được tạo
              </p>
              <label className="flex items-center gap-2 text-theme-xs text-gray-500">
                <input type="checkbox" checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                  className="rounded" />
                Xoá biến thể cũ trước khi tạo
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("select")}
                className="h-9 rounded-lg border border-gray-200 px-4 text-theme-sm text-gray-600 dark:border-gray-700">
                ← Quay lại
              </button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Đang lưu..." : `Xác nhận tạo ${editedPreviews.length} biến thể`}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-white/[0.03]">
                <tr>
                  {["Cấu hình", "SKU", "Giá bán", "Giá gốc", "Kho"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-theme-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {editedPreviews.map((p, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.attributes.map((a) => (
                          <span key={a.id} className="rounded-md bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {a.attributeName}: <strong>{a.value}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input value={p.sku}
                        onChange={(e) => setEditedPreviews((prev) => prev.map((x, j) => j === i ? { ...x, sku: e.target.value } : x))}
                        className="h-8 w-36 rounded-lg border border-gray-200 px-2 text-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" value={p.price}
                        onChange={(e) => setEditedPreviews((prev) => prev.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))}
                        className="h-8 w-28 rounded-lg border border-gray-200 px-2 text-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-theme-xs text-gray-400">—</span>
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" value={p.stockQuantity}
                        onChange={(e) => setEditedPreviews((prev) => prev.map((x, j) => j === i ? { ...x, stockQuantity: Number(e.target.value) } : x))}
                        className="h-8 w-20 rounded-lg border border-gray-200 px-2 text-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline editable variant row ──────────────────────────────────────────────
function VariantRow({
  variant: v, onUpdate, onDelete,
}: {
  variant: ProductVariantDto;
  onUpdate: (id: number, dto: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice]     = useState(v.price);
  const [stock, setStock]     = useState(v.stockQuantity);

  const save = () => {
    onUpdate(v.id, { price, stockQuantity: stock });
    setEditing(false);
  };

  return (
    <tr className={cn("group", !v.isActive && "opacity-50")}>
      <td className="py-3 pr-4 text-theme-xs font-mono text-gray-600 dark:text-gray-400">{v.sku}</td>
      <td className="py-3 pr-4">
        <div className="flex flex-wrap gap-1">
          {v.attributes.map((a) => (
            <Badge key={a.id} color="light" size="sm">
              {a.attributeName}: {a.value}
            </Badge>
          ))}
        </div>
      </td>
      <td className="py-3 pr-4">
        {editing
          ? <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))}
              className="h-8 w-28 rounded-lg border border-gray-200 px-2 text-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
          : <span className="text-theme-sm font-semibold text-brand-600 dark:text-brand-400">{formatVND(v.price)}</span>
        }
      </td>
      <td className="py-3 pr-4 text-theme-xs text-gray-400">{v.compareAtPrice ? formatVND(v.compareAtPrice) : "—"}</td>
      <td className="py-3 pr-4">
        {editing
          ? <input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))}
              className="h-8 w-20 rounded-lg border border-gray-200 px-2 text-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
          : <span className={cn("text-theme-sm", stock === 0 && "text-error-500")}>{stock}</span>
        }
      </td>
      <td className="py-3 pr-4">
        <Badge color={v.isActive ? "success" : "light"} size="sm">
          {v.isActive ? "Active" : "Ẩn"}
        </Badge>
      </td>
      <td className="py-3">
        {editing ? (
          <div className="flex gap-1">
            <button type="button" onClick={save}
              className="h-7 rounded-lg bg-brand-500 px-2 text-[10px] font-semibold text-white hover:bg-brand-600">Lưu</button>
            <button type="button" onClick={() => { setEditing(false); setPrice(v.price); setStock(v.stockQuantity); }}
              className="h-7 rounded-lg border border-gray-200 px-2 text-[10px] text-gray-600 dark:border-gray-700">Huỷ</button>
          </div>
        ) : (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <button type="button" onClick={() => setEditing(true)}
              className="h-7 rounded-lg border border-gray-200 px-2 text-[10px] text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700">
              Sửa
            </button>
            <button type="button" onClick={onDelete}
              className="h-7 rounded-lg border border-error-200 px-2 text-[10px] text-error-500 hover:bg-error-50 dark:border-error-500/30">
              Xoá
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
