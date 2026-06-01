import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/context/ToastContext";
import { productApi } from "@/api/product.api";
import { productSpecApi } from "@/api/productSpec.api";
import { brandApi } from "@/api/brand.api";
import { categoryApi } from "@/api/category.api";
import type { Brand, Category, Product, ProductSpecification } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/Input";
import { formatVND } from "@/utils/format";
import { ProductImageManager } from "./ProductImageManager";
import { VariantManager } from "./VariantManager";
import GiftsTab from "./GiftsTab";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormState {
  name: string; slug: string; description: string;
  price: string; discount: string; inStock: string;
  brandId: string; categoryId: string; isActive: boolean;
}

interface SpecState {
  id?: number;
  cpu: string; ram: string; storage: string; gpu: string;
  screen: string; os: string; ports: string; weight: string; battery: string;
}

const emptyForm: FormState = {
  name: "", slug: "", description: "",
  price: "0", discount: "0", inStock: "0",
  brandId: "", categoryId: "", isActive: true,
};

const emptySpec: SpecState = {
  cpu: "", ram: "", storage: "", gpu: "",
  screen: "", os: "", ports: "", weight: "", battery: "",
};

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d")
   .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProductFormPage() {
  const { id: paramId } = useParams<{ id: string }>();
  const isNew     = !paramId || paramId === "new";
  const productId = isNew ? null : Number(paramId);
  const navigate  = useNavigate();
  const toast     = useToast();

  const [form, setForm]             = useState<FormState>(emptyForm);
  const [spec, setSpec]             = useState<SpecState>(emptySpec);
  const [brands, setBrands]         = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(!isNew);
  const [saving, setSaving]         = useState(false);
  const [savingSpec, setSavingSpec] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [activeTab, setActiveTab]   = useState<"info" | "spec" | "images" | "variants" | "gifts">("info");

  const setF = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));
  const setS = <K extends keyof SpecState>(k: K, v: string) =>
    setSpec((s) => ({ ...s, [k]: v }));

  // Load brands + categories
  useEffect(() => {
    void Promise.allSettled([
      brandApi.getActive(),
      categoryApi.getAll({ pageSize: 100 }),
    ]).then(([b, c]) => {
      if (b.status === "fulfilled") setBrands(b.value);
      if (c.status === "fulfilled") setCategories(c.value.items ?? []);
    });
  }, []);

  // Load product + spec when editing
  const loadProduct = useCallback(async () => {
    if (isNew || !productId) return;
    setLoading(true);
    try {
      const [p, s] = await Promise.allSettled([
        productApi.getById(productId),
        productSpecApi.getByProductId(productId).catch(() => null),
      ]);

      if (p.status === "fulfilled") {
        const prod = p.value;
        setForm({
          name: prod.name, slug: prod.slug,
          description: prod.description ?? "",
          price: String(prod.price ?? 0),
          discount: String(prod.discount ?? 0),
          inStock: String(prod.inStock ?? 0),
          brandId: prod.brandId ? String(prod.brandId) : "",
          categoryId: prod.categoryId ? String(prod.categoryId) : "",
          isActive: prod.isActive,
        });
        setSlugTouched(true);
      }

      if (s.status === "fulfilled" && s.value) {
        const sp = s.value as ProductSpecification;
        setSpec({
          id: sp.id,
          cpu: sp.cpu ?? "", ram: sp.ram ?? "", storage: sp.storage ?? "",
          gpu: sp.gpu ?? "", screen: sp.screen ?? "", os: sp.os ?? "",
          ports: sp.ports ?? "", weight: sp.weight ?? "", battery: sp.battery ?? "",
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được sản phẩm");
    } finally {
      setLoading(false);
    }
  }, [isNew, productId]);

  useEffect(() => { void loadProduct(); }, [loadProduct]);

  // Submit product info
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("Vui lòng nhập tên sản phẩm");
    if (!form.slug.trim()) return setError("Vui lòng nhập slug");
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return setError("Giá không hợp lệ");

    const payload = {
      name: form.name.trim(), slug: form.slug.trim(),
      description: form.description.trim() || null,
      price, discount: Number(form.discount) || 0,
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

  // Save specs (create or update)
  const onSaveSpec = async () => {
    if (!productId) return;
    setSavingSpec(true);
    try {
      if (spec.id) {
        // Update existing spec
        await productSpecApi.update(spec.id, {
          productId,
          cpu: spec.cpu || null, ram: spec.ram || null,
          storage: spec.storage || null, gpu: spec.gpu || null,
          screen: spec.screen || null, os: spec.os || null,
          ports: spec.ports || null, weight: spec.weight || null,
          battery: spec.battery || null,
        });
      } else {
        // Create new spec
        const created = await productSpecApi.create({
          productId,
          cpu: spec.cpu || null, ram: spec.ram || null,
          storage: spec.storage || null, gpu: spec.gpu || null,
          screen: spec.screen || null, os: spec.os || null,
          ports: spec.ports || null, weight: spec.weight || null,
          battery: spec.battery || null,
        });
        setSpec((s) => ({ ...s, id: created.id }));
      }
      toast.success("Lưu thông số thành công!");
    } catch (e) {
      toast.error("Lưu thông số thất bại", e instanceof Error ? e.message : undefined);
    } finally {
      setSavingSpec(false);
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
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="font-outfit text-title-sm font-bold text-gray-900 dark:text-white">
            {isNew ? "Thêm sản phẩm mới" : "Chỉnh sửa sản phẩm"}
          </h1>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {isNew ? "Tạo xong rồi upload ảnh và nhập thông số." : `Mã sản phẩm: #${productId}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/products"><Button variant="outline" type="button">Huỷ</Button></Link>
          {activeTab === "info" && (
            <Button type="submit" form="product-form" disabled={saving}>
              {saving ? "Đang lưu..." : isNew ? "Tạo sản phẩm" : "Lưu thay đổi"}
            </Button>
          )}
          {activeTab === "spec" && !isNew && (
            <Button type="button" onClick={() => void onSaveSpec()} disabled={savingSpec}>
              {savingSpec ? "Đang lưu..." : "Lưu thông số"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-white/[0.03]">
        {[
          { key: "info",     label: "Thông tin chung" },
          { key: "spec",     label: "Thông số kỹ thuật" },
          { key: "images",   label: "Hình ảnh" },
          { key: "variants", label: "Biến thể & SKU" },
          { key: "gifts",    label: "🎁 Quà tặng" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            disabled={tab.key !== "info" && isNew}
            className={`flex-1 rounded-lg py-2.5 text-theme-sm font-medium transition-colors disabled:opacity-40 ${
              activeTab === tab.key
                ? "bg-brand-500 text-white shadow-theme-xs"
                : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
            }`}
          >
            {tab.label}
            {tab.key === "spec" && isNew && " (lưu SP trước)"}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-error-50 px-4 py-3 text-theme-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}

      {/* ── Tab: Thông tin chung ─────────────────────────────────────────── */}
      {activeTab === "info" && (
        <form id="product-form" onSubmit={(e) => void onSubmit(e)}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left */}
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader title="Thông tin chung" />
                <div className="space-y-4">
                  <Field label="Tên sản phẩm" required>
                    <Input
                      value={form.name}
                      onChange={(e) => {
                        setF("name", e.target.value);
                        if (!slugTouched) setF("slug", slugify(e.target.value));
                      }}
                      placeholder="Apple MacBook Pro 14 M4 Pro"
                    />
                  </Field>
                  <Field label="Slug (URL)" required
                    hint={`/products/${form.slug || "slug-san-pham"}`}>
                    <Input
                      value={form.slug}
                      onChange={(e) => { setSlugTouched(true); setF("slug", e.target.value.toLowerCase()); }}
                      placeholder="apple-macbook-pro-14-m4-pro"
                    />
                  </Field>
                  <Field label="Mô tả">
                    <Textarea rows={5} value={form.description}
                      onChange={(e) => setF("description", e.target.value)}
                      placeholder="Mô tả chi tiết sản phẩm..." />
                  </Field>
                </div>
              </Card>

              <Card>
                <CardHeader title="Giá & Tồn kho" />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Giá bán (VND)" required
                    hint={form.price ? formatVND(Number(form.price)) : undefined}>
                    <Input type="number" min="0" value={form.price}
                      onChange={(e) => setF("price", e.target.value)} />
                  </Field>
                  <Field label="Giảm giá (%)" hint="0–100">
                    <Input type="number" min="0" max="100" step="0.01"
                      value={form.discount}
                      onChange={(e) => setF("discount", e.target.value)} />
                  </Field>
                  <Field label="Tồn kho">
                    <Input type="number" min="0" value={form.inStock}
                      onChange={(e) => setF("inStock", e.target.value)} />
                  </Field>
                </div>
              </Card>
            </div>

            {/* Right sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader title="Phân loại" />
                <div className="space-y-4">
                  <Field label="Thương hiệu">
                    <Select value={form.brandId} onChange={(e) => setF("brandId", e.target.value)}>
                      <option value="">— Chọn thương hiệu —</option>
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Danh mục">
                    <Select value={form.categoryId} onChange={(e) => setF("categoryId", e.target.value)}>
                      <option value="">— Chọn danh mục —</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </Field>
                </div>
              </Card>
              <Card>
                <CardHeader title="Trạng thái" />
                <Switch checked={form.isActive} onChange={(v) => setF("isActive", v)}
                  label="Đang bán"
                  hint="Tắt để ẩn khỏi storefront." />
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* ── Tab: Thông số kỹ thuật ───────────────────────────────────────── */}
      {activeTab === "spec" && !isNew && (
        <Card>
          <CardHeader
            title="Thông số kỹ thuật"
            subtitle={spec.id ? `Spec ID: #${spec.id}` : "Chưa có thông số — nhập và lưu lần đầu."}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              { key: "cpu",     label: "CPU",              placeholder: "Intel Core i9-14900HX (24-nhân, 5.8GHz)" },
              { key: "ram",     label: "RAM",              placeholder: "32GB DDR5 5600MHz" },
              { key: "storage", label: "Bộ nhớ (Storage)", placeholder: "SSD 1TB NVMe PCIe 4.0" },
              { key: "gpu",     label: "GPU",              placeholder: "NVIDIA RTX 4070 8GB GDDR6" },
              { key: "screen",  label: "Màn hình",         placeholder: "16\" QHD+ 2560x1600 165Hz 100% sRGB" },
              { key: "os",      label: "Hệ điều hành",     placeholder: "Windows 11 Home" },
              { key: "weight",  label: "Trọng lượng",      placeholder: "2.1 kg" },
              { key: "battery", label: "Pin",              placeholder: "90Wh, lên đến 10 giờ" },
            ] as { key: keyof SpecState; label: string; placeholder: string }[]).map((f) => (
              <Field key={f.key} label={f.label}>
                <Input
                  value={(spec[f.key] as string) ?? ""}
                  onChange={(e) => setS(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              </Field>
            ))}
            {/* Ports spans full width */}
            <Field label="Cổng kết nối (Ports)" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={spec.ports ?? ""}
                onChange={(e) => setS("ports", e.target.value)}
                placeholder="2x Thunderbolt 4, 2x USB-A 3.2, HDMI 2.1, SD reader, 3.5mm"
              />
            </Field>
          </div>

          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={() => void onSaveSpec()} disabled={savingSpec}>
              {savingSpec ? "Đang lưu..." : spec.id ? "Cập nhật thông số" : "Tạo thông số mới"}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Tab: Hình ảnh ────────────────────────────────────────────────── */}
      {activeTab === "images" && !isNew && (
        <Card>
          <CardHeader
            title="Hình ảnh sản phẩm"
            subtitle="Kéo thả hoặc chọn file. Ảnh đầu tiên upload sẽ là ảnh chính."
          />
          <ProductImageManager productId={productId!} />
        </Card>
      )}

      {/* ── Tab: Biến thể & SKU ──────────────────────────────────────────── */}
      {activeTab === "variants" && !isNew && (
        <Card>
          <CardHeader
            title="Biến thể & SKU"
            subtitle="Tự động sinh tổ hợp biến thể từ RAM × SSD × Màu sắc. Mỗi tổ hợp = 1 SKU riêng."
          />
          <VariantManager productId={productId!} />
        </Card>
      )}

      {/* ── Tab: Quà tặng ─────────────────────────────────────────────────── */}
      {activeTab === "gifts" && !isNew && (
        <Card>
          <CardHeader
            title="🎁 Quà tặng kèm sản phẩm"
            subtitle="Click vào sản phẩm để thêm/bỏ làm quà tặng. Khi khách mua sản phẩm này, các quà tặng sẽ tự động được thêm vào đơn hàng."
          />
          <GiftsTab productId={productId!} />
        </Card>
      )}
    </div>
  );
}
