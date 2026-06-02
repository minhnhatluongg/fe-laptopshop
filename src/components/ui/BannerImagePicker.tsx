/**
 * BannerImagePicker
 * - Cho phép upload ảnh, hiển thị preview + cảnh báo tỉ lệ
 * - Nút "Tự crop 8:3" resize về chuẩn banner
 * - Focal point: click để chọn điểm focus trước khi crop
 */
import { useRef, useState } from "react";
import { fileApi } from "@/api/file.api";
import { getImageMeta, resizeBannerImage, type ImageMeta } from "@/utils/bannerImage";
import { getImageUrl } from "@/utils/image";

interface Props {
  imageUrl: string;
  onChange: (url: string) => void;
}

export function BannerImagePicker({ imageUrl, onChange }: Props) {
  const fileRef            = useRef<HTMLInputElement>(null);
  const imgRef             = useRef<HTMLImageElement>(null);

  const [preview, setPreview]     = useState<string | null>(null);
  const [pendingFile, setPending] = useState<File | null>(null);
  const [meta, setMeta]           = useState<ImageMeta | null>(null);
  const [focal, setFocal]         = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const [showFocal, setShowFocal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);

  // Step 1: file selected → show preview + meta
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objUrl = URL.createObjectURL(file);
    setPreview(objUrl);
    setPending(file);
    setFocal({ x: 0.5, y: 0.5 });
    const m = await getImageMeta(file);
    setMeta(m);
    e.target.value = "";
  };

  // Step 2: click on preview to set focal point
  const onFocalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;
    setFocal({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
  };

  // Step 3a: upload original
  const uploadOriginal = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const res = await fileApi.upload(pendingFile, setProgress, "banners");
      onChange(res.fileUrl);
      reset();
    } catch (e) { alert((e as Error).message); }
    finally { setUploading(false); }
  };

  // Step 3b: auto crop → upload
  const cropAndUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const cropped = await resizeBannerImage(pendingFile, focal.x, focal.y);
      const res = await fileApi.upload(cropped, setProgress, "banners");
      onChange(res.fileUrl);
      reset();
    } catch (e) { alert((e as Error).message); }
    finally { setUploading(false); }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPending(null);
    setMeta(null);
    setShowFocal(false);
    setProgress(0);
  };

  const currentSrc = preview ?? (imageUrl ? getImageUrl(imageUrl) : null);

  return (
    <div className="space-y-3">
      {/* ── Preview area ── */}
      <div
        className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50"
        style={{ aspectRatio: "8/3", cursor: showFocal ? "crosshair" : "default" }}
        onClick={showFocal ? onFocalClick : undefined}
      >
        {currentSrc ? (
          <>
            <img
              ref={imgRef}
              src={currentSrc}
              alt="Banner preview"
              className="h-full w-full object-cover"
              style={{ objectPosition: `${focal.x * 100}% ${focal.y * 100}%` }}
            />
            {/* Focal point dot */}
            {showFocal && (
              <>
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/30" />
                {/* Crosshair */}
                <div className="pointer-events-none absolute inset-0"
                  style={{ backgroundImage: `radial-gradient(circle at ${focal.x*100}% ${focal.y*100}%, transparent 20px, rgba(0,0,0,0.4) 21px)` }} />
                <div className="pointer-events-none absolute"
                  style={{ left: `${focal.x*100}%`, top: `${focal.y*100}%`, transform: "translate(-50%,-50%)" }}>
                  <div className="h-6 w-6 rounded-full border-2 border-white shadow-lg ring-2 ring-brand-500" />
                </div>
                <p className="absolute bottom-2 left-0 right-0 text-center text-xs font-medium text-white">
                  Click để chọn điểm focus
                </p>
              </>
            )}
            {/* Uploading overlay */}
            {uploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                <p className="text-sm font-semibold text-white mb-2">Đang upload... {progress}%</p>
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-brand-400 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span className="text-theme-sm">Click để chọn ảnh banner</span>
            <span className="text-theme-xs">Khuyến nghị 1600×600px · tỉ lệ 8:3</span>
          </button>
        )}
      </div>

      {/* ── Meta warning ── */}
      {meta && (
        <div className={`rounded-xl p-3 text-theme-xs ${
          meta.tooSmall ? "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-300"
          : meta.wrongRatio ? "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-300"
          : "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300"
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold">
                {meta.tooSmall ? "⚠️ Ảnh quá nhỏ" : meta.wrongRatio ? "⚠️ Tỉ lệ không chuẩn" : "✅ Kích thước OK"}
              </span>
              <span className="ml-2 opacity-70">{meta.w}×{meta.h}px · {meta.sizeKb}KB</span>
              {meta.warning && <p className="mt-0.5 opacity-80">{meta.warning}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      {pendingFile && !uploading && (
        <div className="flex flex-wrap gap-2">
          {/* Focal point toggle */}
          <button type="button" onClick={() => setShowFocal(v => !v)}
            className={`rounded-lg border px-3 py-1.5 text-theme-xs font-medium transition-colors ${
              showFocal
                ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15"
                : "border-gray-200 text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400"
            }`}>
            🎯 {showFocal ? "Đang chọn focus..." : "Chọn điểm focus"}
          </button>

          {/* Auto crop */}
          <button type="button" onClick={() => void cropAndUpload()}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-theme-xs font-semibold text-white hover:bg-brand-600 transition-colors">
            ✂️ Tự crop 8:3 & Upload
          </button>

          {/* Upload original */}
          <button type="button" onClick={() => void uploadOriginal()}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-theme-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 transition-colors">
            Upload gốc
          </button>

          {/* Cancel */}
          <button type="button" onClick={reset}
            className="rounded-lg px-3 py-1.5 text-theme-xs text-error-500 hover:bg-error-50 transition-colors">
            Huỷ
          </button>
        </div>
      )}

      {/* ── Change / upload button ── */}
      {!pendingFile && (
        <button type="button" onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-dashed border-gray-300 px-4 py-2 text-theme-xs text-gray-500 hover:border-brand-400 hover:text-brand-500 transition-colors dark:border-gray-700 dark:text-gray-400">
          📁 {imageUrl ? "Đổi ảnh" : "Chọn ảnh"}
        </button>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
    </div>
  );
}
