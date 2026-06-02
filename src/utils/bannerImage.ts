/** Banner image utilities — resize / crop / detect ratio issues */

export const BANNER_W = 1920;
export const BANNER_H = 720;
export const BANNER_RATIO = BANNER_W / BANNER_H; // 2.67 (~8:3)
export const MIN_W = 800;
export const MIN_H = 300;

export interface ImageMeta {
  w: number;
  h: number;
  ratio: number;
  sizeKb: number;
  tooSmall: boolean;
  wrongRatio: boolean; // ratio differs > 25%
  warning: string | null;
}

/** Read image dimensions from a File */
export function getImageMeta(file: File): Promise<ImageMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const ratio = w / h;
      const sizeKb = Math.round(file.size / 1024);
      const tooSmall = w < MIN_W || h < MIN_H;
      const wrongRatio = Math.abs(ratio - BANNER_RATIO) / BANNER_RATIO > 0.25;
      let warning: string | null = null;
      if (tooSmall)    warning = `Ảnh nhỏ (${w}×${h}px) — khuyến nghị ≥ ${MIN_W}×${MIN_H}`;
      else if (wrongRatio) warning = `Tỉ lệ ${ratio.toFixed(1)}:1 khác xa 8:3 — chữ có thể bị cắt`;
      resolve({ w, h, ratio, sizeKb, tooSmall, wrongRatio, warning });
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Smart crop + resize to BANNER_W × BANNER_H (8:3).
 * focalX/Y: 0–1 (default 0.5/0.5 = center).
 */
export function resizeBannerImage(
  file: File,
  focalX = 0.5,
  focalY = 0.5,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      const srcRatio = srcW / srcH;

      // Determine crop rect
      let cropW: number, cropH: number, cropX: number, cropY: number;
      if (srcRatio > BANNER_RATIO) {
        // Image wider than banner → crop sides
        cropH = srcH;
        cropW = srcH * BANNER_RATIO;
        cropX = (srcW - cropW) * focalX;
        cropY = 0;
      } else {
        // Image taller than banner → crop top/bottom
        cropW = srcW;
        cropH = srcW / BANNER_RATIO;
        cropX = 0;
        cropY = (srcH - cropH) * focalY;
      }

      // ── Progressive downscale (tránh mờ khi crop quá lớn → nhỏ) ──────────
      // Nếu crop > 2× target: scale dần về target, mỗi bước tối đa ÷2
      // Cách này giữ sắc nét tốt hơn resize 1 bước.
      let curCanvas = document.createElement("canvas");
      let curCtx = curCanvas.getContext("2d")!;
      curCtx.imageSmoothingEnabled  = true;
      curCtx.imageSmoothingQuality  = "high";
      curCanvas.width  = cropW;
      curCanvas.height = cropH;
      curCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      let w = cropW, h = cropH;
      while (w > BANNER_W * 2 || h > BANNER_H * 2) {
        const nextW = Math.max(Math.round(w / 2), BANNER_W);
        const nextH = Math.max(Math.round(h / 2), BANNER_H);
        const tmp = document.createElement("canvas");
        const tmpCtx = tmp.getContext("2d")!;
        tmpCtx.imageSmoothingEnabled = true;
        tmpCtx.imageSmoothingQuality = "high";
        tmp.width  = nextW;
        tmp.height = nextH;
        tmpCtx.drawImage(curCanvas, 0, 0, w, h, 0, 0, nextW, nextH);
        curCanvas = tmp; curCtx = tmpCtx; w = nextW; h = nextH;
      }

      // Final step → exact BANNER_W × BANNER_H
      const canvas = document.createElement("canvas");
      canvas.width  = BANNER_W;
      canvas.height = BANNER_H;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(curCanvas, 0, 0, w, h, 0, 0, BANNER_W, BANNER_H);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Resize failed")); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
        },
        "image/webp",
        0.95,  // quality cao hơn để giữ sắc nét
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}
