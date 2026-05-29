import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { fileApi } from "@/api/file.api";
import { productImageApi } from "@/api/productImage.api";
import type { ProductImage } from "@/api/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { cn } from "@/utils/cn";

interface Props {
  productId: number;
  className?: string;
}

interface UploadItem {
  id: string;
  fileName: string;
  progress: number;
  error?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB per file

export function ProductImageManager({ productId, className }: Props) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await productImageApi.getByProductId(productId);
      setImages(
        [...list].sort((a, b) => {
          if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
          return a.displayOrder - b.displayOrder;
        }),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ---------- Upload pipeline ---------- */
  const uploadOne = async (file: File) => {
    const tmpId = crypto.randomUUID();
    setUploads((u) => [...u, { id: tmpId, fileName: file.name, progress: 0 }]);

    const updateProgress = (pct: number) =>
      setUploads((u) =>
        u.map((it) => (it.id === tmpId ? { ...it, progress: pct } : it)),
      );

    try {
      // 1. Upload binary to server → SysFile, tổ chức theo products/{id}
      const uploaded = await fileApi.upload(file, updateProgress, `products/${productId}`);

      // 2. Link SysFile to product as a ProductImage
      const isFirst = images.length === 0;
      await productImageApi.linkSysFile(productId, {
        sysFileId: uploaded.sysFileId,
        isMain: isFirst,
        altText: file.name,
      });

      // 3. Drop progress chip and refresh
      setUploads((u) => u.filter((it) => it.id !== tmpId));
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload thất bại";
      setUploads((u) =>
        u.map((it) => (it.id === tmpId ? { ...it, error: msg } : it)),
      );
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const f of arr) {
      if (!ACCEPT.split(",").includes(f.type)) {
        alert(`File "${f.name}" không phải định dạng ảnh hợp lệ.`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        alert(`File "${f.name}" lớn hơn 10MB.`);
        continue;
      }
      await uploadOne(f);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
  };

  /* ---------- Image actions ---------- */
  const handleSetMain = async (img: ProductImage) => {
    if (img.isMain) return;
    try {
      await productImageApi.setMain(img.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Không thể đặt ảnh chính");
    }
  };

  const handleDelete = async (img: ProductImage) => {
    if (!confirm(`Xoá ảnh "${img.altText ?? img.id}"?`)) return;
    try {
      await productImageApi.delete(img.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Không thể xoá ảnh");
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className={cn("space-y-4", className)}>
      {/* Dropzone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
          dragOver
            ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10"
            : "border-gray-300 bg-gray-50 hover:border-brand-300 dark:border-gray-700 dark:bg-white/[0.02]",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && void handleFiles(e.target.files)}
        />
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className="text-theme-sm font-semibold text-gray-800 dark:text-white">
          Kéo thả ảnh vào đây, hoặc{" "}
          <span className="text-brand-500">chọn file</span>
        </p>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          PNG, JPG, WEBP, GIF — tối đa 10MB / file. Có thể upload nhiều ảnh.
        </p>
      </label>

      {/* Upload progress chips */}
      {uploads.length > 0 && (
        <ul className="space-y-2">
          {uploads.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-theme-sm text-gray-700 dark:text-gray-300">
                    {u.fileName}
                  </span>
                  <span className={cn(
                    "text-theme-xs font-medium shrink-0",
                    u.error ? "text-error-500" : "text-gray-500",
                  )}>
                    {u.error ? "Lỗi" : `${u.progress}%`}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={cn(
                      "h-full transition-all",
                      u.error ? "bg-error-500" : "bg-brand-500",
                    )}
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
                {u.error && (
                  <p className="mt-1 text-theme-xs text-error-500">{u.error}</p>
                )}
              </div>
              {u.error && (
                <button
                  type="button"
                  onClick={() => setUploads((s) => s.filter((it) => it.id !== u.id))}
                  className="text-gray-400 hover:text-gray-700"
                  aria-label="Bỏ qua"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Existing images grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : images.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 px-6 py-10 text-center text-theme-sm text-gray-500 dark:border-gray-800">
          Chưa có ảnh nào — upload ở trên để thêm.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-xl border bg-gray-100 dark:bg-gray-800",
                img.isMain
                  ? "border-brand-400 ring-2 ring-brand-200 dark:ring-brand-500/30"
                  : "border-gray-200 dark:border-gray-800",
              )}
            >
              <img
                src={getImageUrl(img.imageUrl)}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER;
                }}
                alt={img.altText ?? ""}
                className="h-full w-full object-cover"
                loading="lazy"
              />

              {img.isMain && (
                <div className="absolute left-2 top-2">
                  <Badge color="primary" variant="solid">
                    Ảnh chính
                  </Badge>
                </div>
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 via-black/0 to-transparent opacity-0 transition group-hover:opacity-100">
                <div className="flex w-full justify-center gap-1 p-2">
                  {!img.isMain && (
                    <Button
                      size="sm"
                      onClick={() => void handleSetMain(img)}
                      className="!h-8 !px-2 !text-theme-xs"
                    >
                      Đặt làm chính
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => void handleDelete(img)}
                    className="!h-8 !px-2 !text-theme-xs"
                  >
                    Xoá
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
