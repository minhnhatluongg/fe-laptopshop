import { useCallback, useEffect, useRef, useState } from "react";
import { bannerApi, type BannerDto, type CreateBannerDto } from "@/api/banner.api";
import { fileApi } from "@/api/file.api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Switch, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { BannerBuilderModal, BannerRenderer, DEFAULT_CONFIG, parseBannerConfig, type BannerConfig } from "@/components/ui/BannerBuilder";
import { BannerImagePicker } from "@/components/ui/BannerImagePicker";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { formatDateTime } from "@/utils/format";

type FormState = Omit<CreateBannerDto, "isActive"> & { id?: number; isActive: boolean };

const empty: FormState = {
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  position: "HOMEPAGE_TOP",
  displayOrder: 0,
  startsAt: null,
  endsAt: null,
  isActive: true,
};

export default function BannersPage() {
  const [banners, setBanners] = useState<BannerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BannerDto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [builderTarget, setBuilderTarget] = useState<BannerDto | null>(null);
  const [aiLoading, setAiLoading]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setBanners(await bannerApi.getAll()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    // Auto displayOrder = max + 1 (banner mới hiển thị cuối, admin chỉnh sau nếu cần)
    const nextOrder = banners.length === 0
      ? 0
      : Math.max(...banners.map((b) => b.displayOrder)) + 1;
    setForm({ ...empty, displayOrder: nextOrder });
    setFormOpen(true);
  };
  const openEdit = (b: BannerDto) => {
    setForm({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle ?? "",
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl ?? "",
      position: b.position,
      displayOrder: b.displayOrder,
      startsAt: b.startsAt ?? null,
      endsAt: b.endsAt ?? null,
      isActive: b.isActive,
    });
    setFormOpen(true);
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const res = await fileApi.upload(file, setUploadProgress, "banners");
      set("imageUrl", res.fileUrl);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload thất bại");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) return alert("Nhập tiêu đề");
    if (!form.imageUrl.trim()) return alert("Chọn ảnh cho banner");
    setSaving(true);
    try {
      if (form.id) {
        await bannerApi.update({ id: form.id, ...form });
      } else {
        await bannerApi.create(form);
      }
      setFormOpen(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await bannerApi.delete(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };

  const moveOrder = async (b: BannerDto, dir: -1 | 1) => {
    await bannerApi.setOrder(b.id, b.displayOrder + dir);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-sm font-bold text-gray-900 dark:text-white">Quản lý Banner</h1>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {banners.length} banner — kéo lên/xuống để sắp xếp thứ tự hiển thị.
          </p>
        </div>
        <Button onClick={openCreate} startIcon={<PlusIcon />}>Thêm banner</Button>
      </div>

      {/* Banner grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-theme-sm text-gray-500">Chưa có banner. Thêm banner đầu tiên!</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {banners.map((b, idx) => (
            <div
              key={b.id}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
            >
              {/* Preview image */}
              <div className="relative aspect-[16/7] overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={getImageUrl(b.imageUrl)}
                  onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                  alt={b.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Status badge */}
                <div className="absolute left-3 top-3">
                  <Badge color={b.isActive ? "success" : "light"}>
                    {b.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Order controls */}
                <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => void moveOrder(b, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-gray-700 shadow hover:bg-white disabled:opacity-40"
                    title="Lên"
                  >▲</button>
                  <button
                    type="button"
                    disabled={idx === banners.length - 1}
                    onClick={() => void moveOrder(b, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-gray-700 shadow hover:bg-white disabled:opacity-40"
                    title="Xuống"
                  >▼</button>
                </div>

                {/* Title overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="line-clamp-1 text-theme-sm font-bold text-white">{b.title}</p>
                  {b.subtitle && (
                    <p className="mt-0.5 line-clamp-1 text-theme-xs text-white/70">{b.subtitle}</p>
                  )}
                </div>
              </div>

              {/* Meta + Actions */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-theme-xs text-gray-500 dark:text-gray-400">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">{b.position}</span>
                  <span className="ml-2">#{b.displayOrder}</span>
                  {b.endsAt && (
                    <span className="ml-2">→ {formatDateTime(b.endsAt)}</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBuilderTarget(b)}
                    className="rounded-lg px-2.5 py-1.5 text-theme-xs font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-500/10"
                    title="Thiết kế style banner"
                  >
                    🎨 Thiết kế
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/5"
                    title="Sửa"
                  >
                    <EditIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(b)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-500"
                    title="Xoá"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={form.id ? "Chỉnh sửa banner" : "Thêm banner mới"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Huỷ</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu banner"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Image upload + preview */}
          <div>
            <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              Ảnh banner <span className="text-error-500">*</span>
            </label>
            <BannerImagePicker
              imageUrl={form.imageUrl}
              onChange={(url) => set("imageUrl", url)}
            />
            {/* Hoặc nhập URL trực tiếp */}
            <div className="mt-2">
              <Input
                placeholder="Hoặc nhập URL ảnh trực tiếp..."
                value={form.imageUrl}
                onChange={(e) => set("imageUrl", e.target.value)}
              />
            </div>
          </div>

          {/* AI suggest — hiện khi đã có ảnh */}
          {form.imageUrl && (
            <button
              type="button"
              disabled={aiLoading}
              onClick={async () => {
                setAiLoading(true);
                try {
                  const s = await bannerApi.aiSuggest(form.imageUrl);
                  set("title",    s.title);
                  set("subtitle", s.subtitle);
                } catch { /* silent */ }
                finally { setAiLoading(false); }
              }}
              className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-theme-sm font-medium text-purple-600 hover:bg-purple-100 disabled:opacity-50 transition-colors dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-400"
            >
              {aiLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Đang phân tích ảnh...
                </>
              ) : (
                <>✨ AI gợi ý tiêu đề từ ảnh</>
              )}
            </button>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tiêu đề" required>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Khuyến mãi mùa hè" />
            </Field>
            <Field label="Subtitle">
              <Input value={form.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} placeholder="Giảm đến 30%" />
            </Field>
            <Field label="Link URL (khi click)">
              <Input value={form.linkUrl ?? ""} onChange={(e) => set("linkUrl", e.target.value)} placeholder="/sale" />
            </Field>
            <Field label="Vị trí">
              <select
                value={form.position}
                onChange={(e) => set("position", e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none"
              >
                <option value="HOMEPAGE_TOP">Homepage Top (Hero)</option>
                <option value="HOMEPAGE_MID">Homepage Middle</option>
                <option value="SIDEBAR">Sidebar</option>
              </select>
            </Field>
            <Field label="Thứ tự hiển thị" hint="Số nhỏ hơn = hiển thị trước">
              <Input type="number" min={0} value={form.displayOrder} onChange={(e) => set("displayOrder", Number(e.target.value))} />
            </Field>
            <div className="flex flex-col justify-end pb-1">
              <Switch
                checked={form.isActive}
                onChange={(v) => set("isActive", v)}
                label="Đang hiển thị"
                hint="Tắt để ẩn banner mà không xoá"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hiển thị từ">
              <Input type="datetime-local" value={form.startsAt?.slice(0, 16) ?? ""} onChange={(e) => set("startsAt", e.target.value || null)} />
            </Field>
            <Field label="Kết thúc lúc">
              <Input type="datetime-local" value={form.endsAt?.slice(0, 16) ?? ""} onChange={(e) => set("endsAt", e.target.value || null)} />
            </Field>
          </div>
        </div>
      </Modal>

      {/* Banner Builder */}
      {builderTarget && (
        <BannerBuilderModal
          initial={parseBannerConfig(builderTarget.styleConfig) ?? DEFAULT_CONFIG}
          onClose={() => setBuilderTarget(null)}
          onSave={async (cfg: BannerConfig) => {
            await bannerApi.update({ id: builderTarget.id, styleConfig: JSON.stringify(cfg) });
            setBuilderTarget(null);
            void load();
          }}
        />
      )}

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xoá banner?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Huỷ</Button>
            <Button variant="danger" onClick={() => void handleDelete()}>Xoá</Button>
          </>
        }
      >
        <p className="text-theme-sm text-gray-600 dark:text-gray-400">
          Banner "<strong>{deleteTarget?.title}</strong>" sẽ bị xoá vĩnh viễn.
        </p>
      </Modal>
    </div>
  );
}

function PlusIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function EditIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function TrashIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
}
