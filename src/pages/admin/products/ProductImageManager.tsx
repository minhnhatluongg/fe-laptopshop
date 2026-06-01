import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { fileApi } from "@/api/file.api";
import { productImageApi } from "@/api/productImage.api";
import type { ProductImage } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { cn } from "@/utils/cn";

interface Props { productId: number; className?: string; }
interface UploadItem { id: string; fileName: string; progress: number; error?: string; }

const ACCEPT    = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;

export function ProductImageManager({ productId, className }: Props) {
  const confirm = useConfirm();
  const [images, setImages]   = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await productImageApi.getByProductId(productId);
      setImages([...list].sort((a, b) => {
        if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
        return a.displayOrder - b.displayOrder;
      }));
    } catch { /* empty */ } finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  /* ── Upload ── */
  const uploadOne = async (file: File) => {
    const tmpId = crypto.randomUUID();
    setUploads((u) => [...u, { id: tmpId, fileName: file.name, progress: 0 }]);
    const upd = (pct: number) => setUploads((u) => u.map((it) => it.id === tmpId ? { ...it, progress: pct } : it));

    try {
      const uploaded = await fileApi.upload(file, upd, `products/${productId}`);
      const isFirst  = images.length === 0 && uploads.filter((u) => !u.error).length === 0;
      await productImageApi.linkSysFile(productId, {
        sysFileId: uploaded.sysFileId,
        isMain: isFirst,
        altText: file.name,
      });
      setUploads((u) => u.filter((it) => it.id !== tmpId));
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload thất bại";
      setUploads((u) => u.map((it) => it.id === tmpId ? { ...it, error: msg } : it));
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      if (!ACCEPT.split(",").includes(f.type)) { alert(`"${f.name}" không hợp lệ`); continue; }
      if (f.size > MAX_BYTES) { alert(`"${f.name}" > 10MB`); continue; }
      await uploadOne(f);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
  };

  const handleSetMain = async (img: ProductImage) => {
    if (img.isMain) return;
    try { await productImageApi.setMain(img.id); await load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Lỗi"); }
  };

  const handleDelete = async (img: ProductImage) => {
    if (!await confirm({ title: "Xoá ảnh này?", message: "Ảnh sẽ bị xoá vĩnh viễn.", variant: "danger", confirmLabel: "Xoá ảnh", cancelLabel: "Huỷ" })) return;
    try { await productImageApi.delete(img.id); await load(); }
    catch (e) { alert(e instanceof Error ? e.message : "Lỗi"); }
  };

  const mainImage = images.find((i) => i.isMain);
  const gallery   = images.filter((i) => !i.isMain);

  return (
    <div className={cn("space-y-6", className)}>
      {/* ── Dropzone ── */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition",
          dragOver
            ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10"
            : "border-gray-200 bg-gray-50 hover:border-brand-300 dark:border-gray-700 dark:bg-white/[0.02]",
        )}
      >
        <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden"
          onChange={(e) => e.target.files && void handleFiles(e.target.files)} />
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <p className="text-theme-sm font-semibold text-gray-800 dark:text-white">
          Kéo thả ảnh vào đây, hoặc <span className="text-brand-500">chọn file</span>
        </p>
        <p className="mt-1 text-theme-xs text-gray-500">PNG, JPG, WEBP, GIF — tối đa 10MB / file. Có thể upload nhiều ảnh.</p>
      </label>

      {/* ── Progress chips ── */}
      {uploads.length > 0 && (
        <ul className="space-y-2">
          {uploads.map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <span className="truncate text-theme-sm text-gray-700 dark:text-gray-300">{u.fileName}</span>
                  <span className={cn("shrink-0 text-theme-xs font-medium", u.error ? "text-error-500" : "text-gray-500")}>
                    {u.error ? "Lỗi" : `${u.progress}%`}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className={cn("h-full transition-all", u.error ? "bg-error-500" : "bg-brand-500")}
                    style={{ width: `${u.progress}%` }} />
                </div>
                {u.error && <p className="mt-1 text-theme-xs text-error-500">{u.error}</p>}
              </div>
              {u.error && (
                <button type="button" onClick={() => setUploads((s) => s.filter((it) => it.id !== u.id))}
                  className="text-gray-400 hover:text-gray-700">×</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center text-theme-sm text-gray-500 dark:border-gray-800">
          Chưa có ảnh nào — upload ở trên để thêm.
        </p>
      ) : (
        <div className="space-y-5">
          {/* ── Ảnh chính ── */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-theme-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Ảnh chính</span>
              <Badge color="primary" size="sm">hiển thị trong danh sách & thumbnail</Badge>
            </div>
            {mainImage ? (
              <div className="group relative flex items-start gap-4 rounded-2xl border-2 border-brand-300 bg-brand-50/30 p-3 dark:border-brand-500/40 dark:bg-brand-500/5">
                {/* Preview lớn */}
                <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                  <img
                    src={getImageUrl(mainImage.imageUrl)}
                    onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                    alt={mainImage.altText ?? "main"}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-1.5 top-1.5">
                    <Badge color="primary" variant="solid" size="sm">★ Chính</Badge>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-theme-sm font-semibold text-gray-800 dark:text-white">
                    {mainImage.altText ?? `Image #${mainImage.id}`}
                  </p>
                  <p className="mt-1 text-theme-xs text-gray-500">
                    {mainImage.fileType?.toUpperCase()} ·{" "}
                    {mainImage.fileSize ? `${(mainImage.fileSize / 1024).toFixed(1)} KB` : ""}
                  </p>
                  <div className="mt-3">
                    <Button size="sm" variant="danger"
                      onClick={() => void handleDelete(mainImage)}
                      className="!h-8 !px-3 !text-theme-xs">
                      Xoá ảnh chính
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/20 px-5 py-6 text-center dark:border-brand-500/20">
                <p className="text-theme-sm text-brand-500">Chưa có ảnh chính.</p>
                <p className="mt-1 text-theme-xs text-gray-500">Ảnh upload đầu tiên hoặc bấm "Đặt làm chính" sẽ là ảnh chính.</p>
              </div>
            )}
          </div>

          {/* ── Ảnh phụ (gallery) ── */}
          {gallery.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-theme-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Ảnh phụ (gallery)</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {gallery.length} ảnh
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {gallery.map((img) => (
                  <div key={img.id}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
                    <img
                      src={getImageUrl(img.imageUrl)}
                      onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                      alt={img.altText ?? ""}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 opacity-0 transition group-hover:opacity-100 p-1.5">
                      <button type="button" onClick={() => void handleSetMain(img)}
                        className="w-full rounded-lg bg-brand-500 py-1 text-[10px] font-semibold text-white hover:bg-brand-600">
                        Đặt làm chính
                      </button>
                      <button type="button" onClick={() => void handleDelete(img)}
                        className="w-full rounded-lg bg-error-500 py-1 text-[10px] font-semibold text-white hover:bg-error-600">
                        Xoá
                      </button>
                    </div>
                    {/* Order badge */}
                    <span className="absolute right-1 bottom-1 rounded bg-black/50 px-1 py-0.5 text-[9px] text-white">
                      #{img.displayOrder}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
