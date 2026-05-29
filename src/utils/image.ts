// Backend returns relative URLs like "/image/photo" or "/uploads/image/photo".
// Frontend builds full URL by prepending VITE_API_BASE_URL.
// Absolute URLs are returned as-is.

const API_BASE = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");

export function getImageUrl(path?: string | null): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Lightweight fallback placeholder (inline SVG, no network).
export const IMAGE_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'>
      <rect width='100%' height='100%' fill='#f2f4f7'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
            fill='#98a2b3' font-family='sans-serif' font-size='14'>No image</text>
    </svg>`,
  );
