import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/context/ToastContext";
import { productApi } from "@/api/product.api";
import { brandApi } from "@/api/brand.api";
import { categoryApi } from "@/api/category.api";
import type { Brand, Category, Product } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Input";
import { formatVND } from "@/utils/format";
import { ProductImageManager } from "./ProductImageManager";

interface FormState {
  name: string;
  slug: string;
  description: string;
  price: string;
  discount: string;
  inStock: string;
  brandId: string;
  categoryId: string;
  isActive: boolean;
}

const empty: FormState = {
  name: "",
  slug: "",
  description: "",
  price: "0",
  discount: "0",
  inStock: "0",
  brandId: "",
  categoryId: "",
  isActive: true,
};

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function ProductFormPage() {
  const { id: paramId } = useParams<{ id: string }>();
  const isNew = !paramId || paramId === "new";
  const toast = useToast();
  const productId = isNew ? null : Number(paramId);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(empty);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  /* ---------- Load options ---------- */
  useEffect(() => {
    void Promise.allSettled([
      brandApi.getActive(),
      categoryApi.getAll({ pageSize: 100 }),
    ]).then(([b, c]) => {
      if (b.status === "fulfilled") setBrands(b.value);
      if (c.status === "fulfilled") setCategories(c.value.items ?? []);
    });
  }, []);

  /* ---------- Load product when editing ---------- */
  const loadProduct = useCallback(async () => {
    if (isNew || !productId) return;
    setLoading(true);
    try {
      const p = await productApi.getById(productId);
      hydrate(p);
      setSlugTouched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được sản phẩm");
    } finally {
      setLoading(false);
    }
  }, [isNew, productId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const hydrate = (p: Product) => {
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      price: String(p.price ?? 0),
      discount: String(p.discount ?? 0),
      inStock: String(p.inStock ?? 0),
      brandId: p.brandId ? String(p.brandId) : "",
      categoryId: p.categoryId ? String(p.categoryId) : "",
      isActive: p.isActive,
    });
  };

  /* ---------- Auto-slug while typing name (only when slug untouched) ---------- */
  const onNameChange = (v: string) => {
    set("name", v);
    if (!slugTouched) set("slug", slugify(v));
  };

  /* ---------- Submit ---------- */
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Vui lòng nhập tên sản phẩm");
    if (!form.slug.trim()) return setError("Vui lòng nhập slug");
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return setError("Giá không hợp lệ");

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      price,
      discount: Number(form.discount) || 0,
      inStock: Number(form.inStock) || 0,
      brandId: form.brandId ? Number(form.brandId) : null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (isNew) {
        const created = await productApi.create(payload);
        toast.success("Tạo sản phẩm thành công!", created.name);
        navigate(`/admin/products/${created.id}`, { replace: true });
      } else {
        await productApi.update({ id: productId!, ...payload });
        toast.success("Lưu thành công!", form.name);
        await loadProduct();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lưu thất bại";
      setError(msg);
      toast.error("Lưu thất bại", msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-72 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-title-sm font-bold text-gray-900 dark:text-white">
            {isNew ? "Thêm sản phẩm mới" : "Chỉnh sửa sản phẩm"}
          </h1>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {isNew
              ? "Tạo sản phẩm xong rồi mới upload ảnh ở tab bên dưới."
              : `Mã sản phẩm: #${productId}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/products">
            <Button variant="outline" type="button">
              Huỷ
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Đang lưu..." : isNew ? "Tạo sản phẩm" : "Lưu thay đổi"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-error-50 px-4 py-3 text-theme-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Main fields */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Thông tin chung" />
            <div className="space-y-4">
              <Field label="Tên sản phẩm" required>
                <Input
                  value={form.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="VD: Apple MacBook Pro 14 inch M3 Pro"
                />
              </Field>

              <Field
                label="Slug (URL)"
                required
                hint={`Đường dẫn sản phẩm: /products/${form.slug || "slug-cua-san-pham"}`}
              >
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase());
                  }}
                  placeholder="apple-macbook-pro-14-m3-pro"
                />
              </Field>

              <Field label="Mô tả">
                <Textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Mô tả chi tiết về sản phẩm..."
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Giá & Tồn kho" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Giá bán (VND)"
                required
                hint={form.price ? formatVND(Number(form.price)) : undefined}
              >
                <Input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                />
              </Field>
              <Field label="Giảm giá (%)" hint="0-100">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.discount}
                  onChange={(e) => set("discount", e.target.value)}
                />
              </Field>
              <Field label="Tồn kho">
                <Input
                  type="number"
                  min="0"
                  value={form.inStock}
                  onChange={(e) => set("inStock", e.target.value)}
                />
              </Field>
            </div>
          </Card>

          {/* Image manager — only after product exists */}
          <Card>
            <CardHeader
              title="Ảnh sản phẩm"
              subtitle={
                isNew
                  ? "Bạn cần lưu sản phẩm trước khi upload ảnh."
                  : "Upload nhiều ảnh, đặt 1 ảnh làm ảnh chính (Main)."
              }
            />
            {isNew ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center text-theme-sm text-gray-500 dark:border-gray-700">
                Lưu sản phẩm trước, sau đó upload ảnh ở đây.
              </div>
            ) : (
              <ProductImageManager productId={productId!} />
            )}
          </Card>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Phân loại" />
            <div className="space-y-4">
              <Field label="Thương hiệu">
                <Select
                  value={form.brandId}
                  onChange={(e) => set("brandId", e.target.value)}
                >
                  <option value="">— Chọn thương hiệu —</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Danh mục">
                <Select
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                >
                  <option value="">— Chọn danh mục —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Trạng thái" />
            <Switch
              checked={form.isActive}
              onChange={(v) => set("isActive", v)}
              label="Đang bán"
              hint="Tắt nếu muốn ẩn sản phẩm khỏi storefront mà không xoá hẳn."
            />
          </Card>
        </div>
      </div>
    </form>
  );
}
