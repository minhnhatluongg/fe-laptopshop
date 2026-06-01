import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/context/ToastContext";
import { productApi } from "@/api/product.api";
import { brandApi } from "@/api/brand.api";
import { categoryApi } from "@/api/category.api";
import { bulkApi, type BulkJobType } from "@/api/bulk.api";
import { productGiftApi } from "@/api/productGift.api";
import type { Brand, Category, Product, ProductFilter } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { computeDiscountPrice, formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { useInventoryHub } from "@/hooks/useInventoryHub";
import { cn } from "@/utils/cn";

const PAGE_SIZES = [10, 20, 50] as const;

// ─── Bulk action config ───────────────────────────────────────────────────────
const BULK_ACTIONS: { type: BulkJobType; label: string; color: string }[] = [
  { type: "ApplyDiscount", label: "Áp dụng giảm giá %", color: "brand" },
  { type: "ApplyPrice",    label: "Thay đổi giá",        color: "brand" },
  { type: "ToggleStatus",  label: "Đổi trạng thái",      color: "warning" },
  { type: "Delete",        label: "Ẩn hàng loạt",        color: "error" },
];

export default function ProductsListPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [brandId, setBrandId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [jumpInput, setJumpInput] = useState("");

  // Delete modal state
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Bulk action state ────────────────────────────────────────────────────
  const [selected, setSelected]         = useState<Set<number>>(new Set());
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [activeBulkType, setActiveBulkType] = useState<BulkJobType>("ApplyDiscount");
  const [discountInput, setDiscountInput]   = useState("10");
  const [priceChangeInput, setPriceChangeInput] = useState("-5");
  const [isActiveInput, setIsActiveInput]   = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [runningJobs, setRunningJobs]       = useState<Array<{ jobId: string; message: string; progress: number }>>([]);

  // Gift bulk modal
  const [giftBulkOpen, setGiftBulkOpen] = useState(false);
  const [pickedGifts, setPickedGifts]   = useState<Set<number>>(new Set());
  const [giftBulkBusy, setGiftBulkBusy] = useState(false);

  // SignalR — nhận BulkJobCompleted notification
  useInventoryHub({
    enabled: true,
    group: "admin",
    onBulkJobCompleted: (e) => {
      setRunningJobs((prev) => prev.filter((j) => j.jobId !== e.jobId));
      toast.success("Tác vụ hoàn thành", e.message);
      void load(); // Refresh product list
    },
    onBulkJobProgress: (e) => {
      setRunningJobs((prev) =>
        prev.map((j) => j.jobId === e.jobId
          ? { ...j, progress: e.progressPercent }
          : j));
    },
  });

  const allSelected = products.length > 0 && products.every((p) => selected.has(p.id));
  const someSelected = selected.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(products.map((p) => p.id)));
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openBulkModal = (type: BulkJobType) => {
    setActiveBulkType(type);
    setBulkModalOpen(true);
  };

  const submitBulk = async () => {
    if (selected.size === 0) return;
    setBulkSubmitting(true);
    try {
      const body: Parameters<typeof bulkApi.execute>[0] = {
        productIds: Array.from(selected),
        type: activeBulkType,
        ...(activeBulkType === "ApplyDiscount" && { discountValue: parseFloat(discountInput) }),
        ...(activeBulkType === "ApplyPrice"    && { priceChangePercent: parseFloat(priceChangeInput) }),
        ...(activeBulkType === "ToggleStatus"  && { isActive: isActiveInput }),
      };
      const result = await bulkApi.execute(body);
      setRunningJobs((prev) => [...prev, { jobId: result.jobId, message: result.message, progress: 0 }]);
      toast.info(`Job #${result.jobId} đang chạy`, result.message);
      setBulkModalOpen(false);
      setSelected(new Set());
    } catch (e) {
      toast.error("Gửi tác vụ thất bại", e instanceof Error ? e.message : undefined);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const filter = useMemo<ProductFilter>(
    () => ({
      pageNumber: page,
      pageSize,
      search: search.trim() || undefined,
      brandId: brandId ? Number(brandId) : undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [page, pageSize, search, brandId, categoryId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productApi.getAll(filter);
      setProducts(res.items ?? []);
      setTotal(res.totalCount ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void Promise.allSettled([
      brandApi.getActive(),
      categoryApi.getAll({ pageSize: 100 }),
    ]).then(([b, c]) => {
      if (b.status === "fulfilled") setBrands(b.value);
      if (c.status === "fulfilled") setCategories(c.value.items ?? []);
    });
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const jumpToPage = (input: string) => {
    const n = parseInt(input, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) setPage(n);
    setJumpInput("");
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await productApi.delete(toDelete.id);
      toast.success("Đã xoá sản phẩm", toDelete.name);
      setToDelete(null);
      await load();
    } catch (e) {
      toast.error("Xoá thất bại", e instanceof Error ? e.message : undefined);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-title-sm font-bold text-gray-900 dark:text-white">
            Quản lý sản phẩm
          </h1>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Danh sách sản phẩm — {total} bản ghi.
          </p>
        </div>
        <Link to="/admin/products/new">
          <Button startIcon={<PlusIcon />}>Thêm sản phẩm</Button>
        </Link>
      </div>

      {/* ── Running jobs strip ─────────────────────────────────────────── */}
      {runningJobs.length > 0 && (
        <div className="space-y-2">
          {runningJobs.map((job) => (
            <div key={job.jobId}
              className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 dark:border-brand-500/30 dark:bg-brand-500/10">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-500" />
              <span className="text-theme-sm font-medium text-brand-700 dark:text-brand-300">
                Job #{job.jobId} đang xử lý... {job.progress > 0 ? `${job.progress.toFixed(0)}%` : ""}
              </span>
              <div className="flex-1 overflow-hidden rounded-full bg-brand-200 dark:bg-brand-500/20">
                <div className="h-1.5 rounded-full bg-brand-500 transition-all duration-300"
                  style={{ width: `${Math.max(5, job.progress)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Bulk toolbar (hiện khi có ô được chọn) ───────────────────────── */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-500/30 dark:bg-brand-500/10">
          <span className="text-theme-sm font-semibold text-brand-700 dark:text-brand-300">
            Đã chọn {selected.size} sản phẩm
          </span>
          <div className="flex flex-wrap gap-1.5">
            {BULK_ACTIONS.map((action) => (
              <button key={action.type} type="button"
                onClick={() => openBulkModal(action.type)}
                className={cn(
                  "h-8 rounded-lg px-3 text-theme-xs font-medium transition-colors",
                  action.color === "brand"   && "bg-brand-500 text-white hover:bg-brand-600",
                  action.color === "warning" && "bg-warning-500 text-white hover:bg-warning-600",
                  action.color === "error"   && "bg-error-500 text-white hover:bg-error-600",
                )}>
                {action.label}
              </button>
            ))}
            <button type="button"
              onClick={() => { setPickedGifts(new Set()); setGiftBulkOpen(true); }}
              className="h-8 rounded-lg bg-purple-500 px-3 text-theme-xs font-medium text-white hover:bg-purple-600">
              🎁 Gán quà tặng
            </button>
          </div>
          <button type="button" onClick={() => setSelected(new Set())}
            className="ml-auto text-theme-xs text-brand-500 hover:text-brand-700">
            Bỏ chọn ×
          </button>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 md:p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
          <Input
            placeholder="Tìm theo tên hoặc slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả thương hiệu</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input type="checkbox" checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 accent-brand-500 cursor-pointer"
                  title="Chọn tất cả" />
              </TableHead>
              <TableHead className="w-[80px]">Ảnh</TableHead>
              <TableHead>Sản phẩm</TableHead>
              <TableHead className="w-[140px]">Thương hiệu</TableHead>
              <TableHead className="w-[140px]">Danh mục</TableHead>
              <TableHead className="w-[150px] text-right">Giá</TableHead>
              <TableHead className="w-[100px]">Kho</TableHead>
              <TableHead className="w-[120px]">Trạng thái</TableHead>
              <TableHead className="w-[140px] text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-gray-500">
                  Không có sản phẩm phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => {
                // mainImageUrl từ backend (ProductDto) — flat, không cần nested productImages
                const mainImg = p.mainImageUrl ?? null;
                const finalPrice = computeDiscountPrice(p.price, p.discount);
                return (
                  <TableRow key={p.id}
                    className={cn(selected.has(p.id) && "bg-brand-50/40 dark:bg-brand-500/5")}>
                    {/* Checkbox */}
                    <TableCell>
                      <input type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="h-4 w-4 rounded border-gray-300 accent-brand-500 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                        <img
                          src={mainImg ? getImageUrl(mainImg) : IMAGE_PLACEHOLDER}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER;
                          }}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/products/${p.id}`}
                        className="text-theme-sm font-semibold text-gray-900 hover:text-brand-500 dark:text-white"
                      >
                        {p.name}
                      </Link>
                      <div className="mt-0.5 truncate text-theme-xs text-gray-400">
                        {p.slug}
                      </div>
                    </TableCell>
                    <TableCell>{p.brandName ?? p.brand?.name ?? "—"}</TableCell>
                    <TableCell>{p.categoryName ?? p.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatVND(finalPrice)}
                      </div>
                      {(p.discount ?? 0) > 0 && (
                        <div className="text-theme-xs text-gray-400 line-through">
                          {formatVND(p.price)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1 font-medium",
                        (p.inStock ?? 0) === 0
                          ? "text-error-600 dark:text-error-400"
                          : (p.inStock ?? 0) < 5
                          ? "text-warning-600 dark:text-warning-400"
                          : "text-gray-700 dark:text-gray-300",
                      )}>
                        {(p.inStock ?? 0) === 0 && <span title="Hết hàng">⚠</span>}
                        {(p.inStock ?? 0) > 0 && (p.inStock ?? 0) < 5 && <span title="Sắp hết">!</span>}
                        {p.inStock ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={p.isActive ? "success" : "light"}
                        className="whitespace-nowrap"
                      >
                        {p.isActive ? "Đang bán" : "Tạm ẩn"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/admin/products/${p.id}`}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5"
                          title="Sửa"
                        >
                          <EditIcon />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setToDelete(p)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                          title="Xoá"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
          {/* Left: record count + page size selector */}
          <div className="flex items-center gap-3">
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              {total === 0 ? "Không có kết quả" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} / ${total} sản phẩm`}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-theme-xs text-gray-400">Hiện</span>
              {PAGE_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setPageSize(s); setPage(1); }}
                  className={`h-7 rounded-md px-2.5 text-theme-xs font-medium transition-colors ${
                    pageSize === s
                      ? "bg-brand-500 text-white"
                      : "border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Right: prev / page numbers / next + jump */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              title="Trang đầu"
            >«</Button>
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >Trước</Button>

            {/* Page number buttons — hiện tối đa 5 */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`h-8 min-w-[32px] rounded-lg px-2 text-theme-sm font-medium transition-colors ${
                    p === page
                      ? "bg-brand-500 text-white"
                      : "border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >Sau</Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              title="Trang cuối"
            >»</Button>

            {/* Jump to page */}
            {totalPages > 5 && (
              <div className="ml-2 flex items-center gap-1">
                <span className="text-theme-xs text-gray-400">Đến trang</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") jumpToPage(jumpInput); }}
                  onBlur={() => { if (jumpInput) jumpToPage(jumpInput); }}
                  placeholder={String(page)}
                  className="h-8 w-14 rounded-lg border border-gray-200 px-2 text-center text-theme-xs text-gray-700 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Delete confirmation */}
      <Modal
        open={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        title="Xoá sản phẩm?"
        description={
          toDelete
            ? `Bạn có chắc muốn xoá "${toDelete.name}"? Hành động này không thể hoàn tác.`
            : ""
        }
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setToDelete(null)}
              disabled={deleting}
            >
              Huỷ
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Đang xoá..." : "Xoá sản phẩm"}
            </Button>
          </>
        }
      >
        <p className="text-theme-sm text-gray-600 dark:text-gray-400">
          Tất cả ảnh, thông số và lịch sử tồn kho gắn với sản phẩm này sẽ bị ảnh
          hưởng. Cân nhắc tắt trạng thái "Đang bán" thay vì xoá nếu sản phẩm đã
          từng được đặt hàng.
        </p>
      </Modal>

      {/* ── Bulk Action Modal ─────────────────────────────────────────── */}
      <Modal
        open={bulkModalOpen}
        onClose={() => !bulkSubmitting && setBulkModalOpen(false)}
        title={BULK_ACTIONS.find((a) => a.type === activeBulkType)?.label ?? "Hành động hàng loạt"}
        description={`Áp dụng cho ${selected.size} sản phẩm đã chọn. Tác vụ chạy nền — bạn có thể tiếp tục làm việc.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setBulkModalOpen(false)} disabled={bulkSubmitting}>
              Huỷ
            </Button>
            <Button onClick={() => void submitBulk()} disabled={bulkSubmitting}>
              {bulkSubmitting ? "Đang gửi..." : `Xác nhận — ${selected.size} SP`}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {activeBulkType === "ApplyDiscount" && (
            <div>
              <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                Mức giảm giá (%)
              </label>
              <input type="number" min="0" max="100" value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none"
                placeholder="10" />
              <p className="mt-1 text-theme-xs text-gray-500">
                Ví dụ: 10 → tất cả {selected.size} sản phẩm sẽ có Discount = 10%
              </p>
            </div>
          )}

          {activeBulkType === "ApplyPrice" && (
            <div>
              <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                Thay đổi giá (%)
              </label>
              <input type="number" value={priceChangeInput}
                onChange={(e) => setPriceChangeInput(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none"
                placeholder="-5" />
              <p className="mt-1 text-theme-xs text-gray-500">
                -5 = giảm 5% · +10 = tăng 10% · Ví dụ giá 20tr → -5% → 19tr
              </p>
            </div>
          )}

          {activeBulkType === "ToggleStatus" && (
            <div>
              <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                Đặt trạng thái
              </label>
              <select value={isActiveInput ? "1" : "0"}
                onChange={(e) => setIsActiveInput(e.target.value === "1")}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none">
                <option value="1">Đang bán (Active)</option>
                <option value="0">Tạm ẩn (Inactive)</option>
              </select>
            </div>
          )}

          {activeBulkType === "Delete" && (
            <div className="rounded-xl bg-error-50 p-4 dark:bg-error-500/10">
              <p className="text-theme-sm font-medium text-error-600 dark:text-error-400">
                ⚠️ {selected.size} sản phẩm sẽ bị ẩn khỏi storefront (soft delete — không xoá DB).
              </p>
              <p className="mt-1 text-theme-xs text-error-500">
                Bạn có thể khôi phục bằng cách đổi trạng thái về "Đang bán".
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Bulk gán quà tặng modal ────────────────────────────────────────── */}
      <BulkGiftsModal
        open={giftBulkOpen}
        onClose={() => setGiftBulkOpen(false)}
        targetProductIds={Array.from(selected)}
        candidateProducts={products}
        pickedGifts={pickedGifts}
        setPickedGifts={setPickedGifts}
        busy={giftBulkBusy}
        onSubmit={async () => {
          if (pickedGifts.size === 0) {
            toast.warning("Chọn ít nhất 1 sản phẩm làm quà");
            return;
          }
          setGiftBulkBusy(true);
          try {
            const res = await productGiftApi.bulkAdd({
              productIds: Array.from(selected),
              gifts: Array.from(pickedGifts).map((id) => ({
                giftProductId: id,
                quantity: 1,
                giftPrice: 0,
              })),
            });
            toast.success("Đã gán quà tặng",
              `Tạo ${res.created} · Bỏ qua ${res.skipped}` +
              (res.errors.length ? ` · Lỗi ${res.errors.length}` : ""));
            setGiftBulkOpen(false);
            setSelected(new Set());
          } catch (e) {
            toast.error("Gán thất bại", (e as Error).message);
          } finally {
            setGiftBulkBusy(false);
          }
        }}
      />
    </div>
  );
}

/* BulkGiftsModal — chọn N sản phẩm làm quà tặng cho M product đã chọn ở list */
function BulkGiftsModal({
  open, onClose, targetProductIds, candidateProducts,
  pickedGifts, setPickedGifts, busy, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  targetProductIds: number[];
  candidateProducts: Product[];
  pickedGifts: Set<number>;
  setPickedGifts: (s: Set<number>) => void;
  busy: boolean;
  onSubmit: () => Promise<void> | void;
}) {
  const [search, setSearch] = useState("");
  if (!open) return null;

  const targetSet = new Set(targetProductIds);
  const filtered = candidateProducts.filter((p) =>
    !targetSet.has(p.id) &&
    (search.trim() === "" || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (id: number) => {
    const n = new Set(pickedGifts);
    if (n.has(id)) n.delete(id); else n.add(id);
    setPickedGifts(n);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold">🎁 Gán quà tặng hàng loạt</h3>
            <p className="text-theme-sm text-gray-500">
              Gán cho <strong>{targetProductIds.length}</strong> sản phẩm đã chọn.
              Cặp đã tồn tại sẽ tự bỏ qua.
            </p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-700">×</button>
        </div>

        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm sản phẩm làm quà..."
          className="mt-3 h-10 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />

        <div className="mt-3 max-h-[50vh] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-theme-sm text-gray-400">Không có sản phẩm phù hợp</p>
          ) : (
            <ul>
              {filtered.map((p) => {
                const checked = pickedGifts.has(p.id);
                return (
                  <li key={p.id} onClick={() => toggle(p.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 border-b border-gray-100 p-2.5 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50",
                      checked && "bg-brand-50 dark:bg-brand-500/10",
                    )}>
                    <input type="checkbox" checked={checked} readOnly className="h-4 w-4" />
                    <img src={p.mainImageUrl ? getImageUrl(p.mainImageUrl) : IMAGE_PLACEHOLDER}
                      alt="" className="h-10 w-10 rounded object-contain bg-gray-50" />
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-1 text-theme-sm font-medium">{p.name}</p>
                      <p className="text-theme-xs text-gray-500">{formatVND(p.price)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-theme-sm text-gray-500">
            Đã chọn <strong className="text-brand-500">{pickedGifts.size}</strong> sản phẩm làm quà
          </p>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-theme-sm dark:border-gray-700">
              Huỷ
            </button>
            <button onClick={() => void onSubmit()} disabled={busy || pickedGifts.size === 0}
              className="rounded-lg bg-purple-500 px-4 py-2 text-theme-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-50">
              {busy ? "Đang gán..." : `Gán ${pickedGifts.size} quà × ${targetProductIds.length} SP`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><div className="h-4 w-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" /></TableCell>
      <TableCell><div className="h-12 w-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" /></TableCell>
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
