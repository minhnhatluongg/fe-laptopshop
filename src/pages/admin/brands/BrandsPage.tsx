import { useCallback, useEffect, useState } from "react";
import { brandApi } from "@/api/brand.api";
import type { Brand, BrandQuery } from "@/api/types";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Switch, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/utils/cn";

// ── Helpers ─────────────────────────────────────────────────────────────────
const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {d.split("|").map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const ICON_EDIT = "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7|M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z";
const ICON_TRASH = "M3 6h18|M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6|M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2";
const ICON_PLUS = "M12 5v14|M5 12h14";
const ICON_SEARCH = "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M21 21l-4.3-4.3";

const PAGE_SIZES = [10, 20, 50];

// Tên → slug: bỏ dấu tiếng Việt, gạch nối, chữ thường.
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface FormState {
  id?: number;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  slugTouched: boolean;
}
const emptyForm: FormState = {
  name: "", slug: "", description: "", isActive: true, slugTouched: false,
};

// ── Inline active toggle ──────────────────────────────────────────────────────
function ActiveToggle({ brand, busy, onToggle }: {
  brand: Brand; busy: boolean; onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} disabled={busy}
      title={brand.isActive ? "Đang hiển thị · nhấn để ẩn" : "Đang ẩn · nhấn để hiển thị"}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50",
        brand.isActive ? "bg-success-500" : "bg-gray-300 dark:bg-gray-600",
      )}>
      <span className={cn(
        "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
        brand.isActive ? "translate-x-6" : "translate-x-1",
      )} />
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BrandsPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [items, setItems]       = useState<Brand[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Modal
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm]         = useState<FormState>(emptyForm);
  const [saving, setSaving]     = useState(false);

  // Per-row busy state for the active toggle
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: BrandQuery = {
        pageNumber: page,
        pageSize,
        name: search.trim() || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
        sortBy: "name",
        isAscending: true,
      };
      const res = await brandApi.getAll(query);
      setItems(res.items);
      setTotal(res.totalCount);
    } catch (e) {
      toast.error("Không tải được danh sách thương hiệu", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, toast]);

  useEffect(() => { void load(); }, [load]);

  // Debounce search input → search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Modal handlers ──
  const openCreate = () => { setForm({ ...emptyForm }); setFormOpen(true); };
  const openEdit = (b: Brand) => {
    setForm({
      id: b.id, name: b.name, slug: b.slug ?? "",
      description: b.description ?? "", isActive: b.isActive, slugTouched: true,
    });
    setFormOpen(true);
  };

  const onNameChange = (name: string) =>
    setForm(f => ({ ...f, name, slug: f.slugTouched ? f.slug : slugify(name) }));

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) { toast.warning("Tên thương hiệu là bắt buộc"); return; }
    setSaving(true);
    try {
      const payload = {
        name,
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || undefined,
        isActive: form.isActive,
      };
      if (form.id) {
        await brandApi.update({ id: form.id, ...payload });
        toast.success("Đã cập nhật thương hiệu", name);
      } else {
        await brandApi.create(payload);
        toast.success("Đã tạo thương hiệu", name);
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      toast.error("Lưu thất bại", (e as Error).message);
    } finally { setSaving(false); }
  };

  const toggleActive = async (b: Brand) => {
    const next = !b.isActive;
    // Nếu đang lọc theo trạng thái và row không còn khớp → ẩn khỏi danh sách.
    const stillMatches = statusFilter === "all"
      || (statusFilter === "active" ? next : !next);

    // Snapshot để revert nếu API lỗi.
    const prevItems = items;
    const prevTotal = total;

    setTogglingId(b.id);
    // Optimistic: cập nhật tại chỗ, không reload bảng (tránh nhấp nháy skeleton).
    if (stillMatches) {
      setItems(prev => prev.map(x => (x.id === b.id ? { ...x, isActive: next } : x)));
    } else {
      setItems(prev => prev.filter(x => x.id !== b.id));
      setTotal(t => Math.max(0, t - 1));
    }

    try {
      await brandApi.update({ id: b.id, name: b.name, slug: b.slug ?? undefined,
        description: b.description ?? undefined, isActive: next });
      toast.success(next ? "Đã hiển thị thương hiệu" : "Đã ẩn thương hiệu", b.name);
      // Row vừa bị lọc khỏi trang & trang giờ trống → lùi 1 trang (chỉ khi không còn ở trang đầu).
      if (!stillMatches && prevItems.length === 1 && page > 1) setPage(p => p - 1);
    } catch (e) {
      setItems(prevItems);
      setTotal(prevTotal);
      toast.error("Đổi trạng thái thất bại", (e as Error).message);
    } finally { setTogglingId(null); }
  };

  const handleDelete = async (b: Brand) => {
    const ok = await confirm({
      title: "Xóa thương hiệu",
      message: `Thương hiệu "${b.name}" sẽ bị xóa vĩnh viễn. Sản phẩm đang gắn với thương hiệu này có thể bị ảnh hưởng. Hành động không thể hoàn tác.`,
      confirmLabel: "Xóa",
      cancelLabel: "Hủy",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await brandApi.delete(b.id);
      toast.success("Đã xóa thương hiệu", b.name);
      // Nếu xóa item cuối của trang → lùi 1 trang
      if (items.length === 1 && page > 1) setPage(p => p - 1);
      else await load();
    } catch (e) {
      toast.error("Xóa thất bại", (e as Error).message);
    }
  };

  const activeCount = items.filter(i => i.isActive).length;
  const hasFilter = !!search.trim() || statusFilter !== "all";

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý thương hiệu</h1>
          <p className="mt-0.5 text-theme-sm text-gray-500">
            {total} thương hiệu · {activeCount}/{items.length} đang hiển thị ở trang này
          </p>
        </div>
        <Button onClick={openCreate} size="sm" startIcon={<Icon d={ICON_PLUS} />}>
          Thêm thương hiệu
        </Button>
      </div>

      {/* Toolbar: search + status filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56 max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon d={ICON_SEARCH} />
          </span>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên thương hiệu..."
            className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-theme-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          />
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
          {([
            { v: "all", label: "Tất cả" },
            { v: "active", label: "Đang hiện" },
            { v: "inactive", label: "Đã ẩn" },
          ] as const).map(s => (
            <button key={s.v} type="button"
              onClick={() => { setStatusFilter(s.v); setPage(1); }}
              className={cn(
                "h-9 rounded-md px-3 text-theme-sm font-medium transition-colors",
                statusFilter === s.v
                  ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:text-brand-500 dark:text-gray-400",
              )}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-gray-700 dark:text-gray-300">
              {hasFilter ? "Không tìm thấy thương hiệu phù hợp" : "Chưa có thương hiệu nào"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-theme-sm text-gray-400">
              {hasFilter
                ? "Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái."
                : "Thêm thương hiệu đầu tiên để gắn vào sản phẩm và hiển thị trên trang Thương hiệu."}
            </p>
            {hasFilter ? (
              <Button variant="outline" size="sm" className="mt-4"
                onClick={() => { setSearchInput(""); setSearch(""); setStatusFilter("all"); setPage(1); }}>
                Xóa bộ lọc
              </Button>
            ) : (
              <Button size="sm" className="mt-4" onClick={openCreate}
                startIcon={<Icon d={ICON_PLUS} />}>
                Thêm thương hiệu
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-theme-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left dark:border-gray-800">
                    {["#", "Thương hiệu", "Slug", "Mô tả", "Hiển thị", ""].map(h => (
                      <th key={h} className="px-4 py-3.5 text-theme-xs font-semibold uppercase tracking-wider text-gray-400 first:pl-5 last:pr-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                  {items.map(b => (
                    <tr key={b.id} className={cn(
                      "transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]",
                      !b.isActive && "opacity-60",
                    )}>
                      {/* ID */}
                      <td className="py-3.5 pl-5 pr-4 text-gray-400">{b.id}</td>

                      {/* Tên + avatar chữ cái */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-theme-sm font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                            {b.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">{b.name}</span>
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="px-4 py-3.5">
                        {b.slug
                          ? <code className="rounded bg-gray-100 px-2 py-0.5 text-theme-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">{b.slug}</code>
                          : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>

                      {/* Mô tả */}
                      <td className="px-4 py-3.5">
                        <p className="max-w-xs truncate text-gray-500 dark:text-gray-400">
                          {b.description || <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </p>
                      </td>

                      {/* Toggle */}
                      <td className="px-4 py-3.5">
                        <ActiveToggle brand={b} busy={togglingId === b.id}
                          onToggle={() => void toggleActive(b)} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-4 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => openEdit(b)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-theme-xs font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">
                            <Icon d={ICON_EDIT} /> Sửa
                          </button>
                          <button type="button" onClick={() => void handleDelete(b)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-theme-xs font-medium text-error-600 transition hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10">
                            <Icon d={ICON_TRASH} /> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                  {`${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} / ${total}`}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-theme-xs text-gray-400">Hiện</span>
                  {PAGE_SIZES.map(s => (
                    <button key={s} type="button"
                      onClick={() => { setPageSize(s); setPage(1); }}
                      className={cn(
                        "h-7 rounded-md px-2.5 text-theme-xs font-medium transition-colors",
                        pageSize === s
                          ? "bg-brand-500 text-white"
                          : "border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400",
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}>Trước</Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button key={p} type="button" onClick={() => setPage(p)}
                      className={cn(
                        "h-8 min-w-[32px] rounded-lg px-2 text-theme-sm font-medium transition-colors",
                        p === page
                          ? "bg-brand-500 text-white"
                          : "border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400",
                      )}>
                      {p}
                    </button>
                  );
                })}
                <Button variant="outline" size="sm" disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}>Sau</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── Create / Edit modal ── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)}
        title={form.id ? "Chỉnh sửa thương hiệu" : "Thêm thương hiệu mới"} size="lg">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên thương hiệu" required>
              <Input value={form.name} autoFocus maxLength={100}
                onChange={e => onNameChange(e.target.value)}
                placeholder="Dell, Apple, Asus..." />
            </Field>
            <Field label="Slug" hint="Tự sinh từ tên · dùng cho URL">
              <Input value={form.slug} maxLength={200}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value, slugTouched: true }))}
                placeholder="dell" />
            </Field>
          </div>

          <Field label="Mô tả" hint={`${form.description.length}/500`}>
            <Textarea value={form.description} rows={3} maxLength={500}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả ngắn về thương hiệu (tùy chọn)" />
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
            <div>
              <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">Hiển thị trên cửa hàng</p>
              <p className="text-theme-xs text-gray-400">Tắt để tạm ẩn thương hiệu khỏi bộ lọc & trang Thương hiệu</p>
            </div>
            <Switch checked={form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Hủy</Button>
            <Button onClick={() => void handleSave()} disabled={saving || !form.name.trim()}>
              {saving ? (form.id ? "Đang lưu..." : "Đang tạo...") : (form.id ? "Lưu thay đổi" : "Tạo thương hiệu")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
