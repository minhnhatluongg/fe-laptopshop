import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/context/ToastContext";
import { productApi } from "@/api/product.api";
import { brandApi } from "@/api/brand.api";
import { categoryApi } from "@/api/category.api";
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

const PAGE_SIZES = [10, 20, 50] as const;

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
                <TableCell colSpan={8} className="py-10 text-center text-gray-500">
                  Không có sản phẩm phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => {
                // mainImageUrl từ backend (ProductDto) — flat, không cần nested productImages
                const mainImg = p.mainImageUrl ?? null;
                const finalPrice = computeDiscountPrice(p.price, p.discount);
                return (
                  <TableRow key={p.id}>
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
                    <TableCell>{p.inStock ?? 0}</TableCell>
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
    </div>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="h-12 w-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      </TableCell>
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
