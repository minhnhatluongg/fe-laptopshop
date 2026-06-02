/**
 * BannerBuilder — visual editor + renderer for styled banners.
 *
 * Config JSON is stored in BannerDto.styleConfig (serialized BannerConfig).
 * If styleConfig is null/empty, banner falls back to plain imageUrl display.
 */

// ── Config types ──────────────────────────────────────────────────────────────
export interface BannerConfig {
  layout:  "left" | "center" | "right";
  bg: {
    type:    "gradient" | "image" | "solid";
    from:    string;   // hex — gradient start or solid color
    to:      string;   // hex — gradient end
    dir:     "to-r" | "to-br" | "to-b" | "135deg";
    imageUrl?: string | null;
    overlayColor?: string;   // rgba e.g. "rgba(0,0,0,0.4)"
  };
  badge?: { text: string; color: string; bgColor: string } | null;
  title: {
    text:       string;
    color:      string;
    fontSize:   "xl" | "2xl" | "3xl" | "4xl";
    fontWeight: "normal" | "semibold" | "bold" | "extrabold";
    shadow:     boolean;
  };
  subtitle?: {
    text:     string;
    color:    string;
    fontSize: "xs" | "sm" | "base";
  } | null;
  cta?: {
    primary:   { text: string; textColor: string; bgColor: string };
    secondary?: { text: string; textColor: string; bgColor: string } | null;
  } | null;
  decoration?: "none" | "circuit" | "dots" | "lines";
}

export const DEFAULT_CONFIG: BannerConfig = {
  layout: "left",
  bg: { type: "gradient", from: "#1e3a8a", to: "#3b82f6", dir: "to-br" },
  badge: { text: "🔥 KHUYẾN MÃI ĐẶC BIỆT", color: "#fff", bgColor: "rgba(255,255,255,0.2)" },
  title: { text: "Tiêu đề banner", color: "#ffffff", fontSize: "3xl", fontWeight: "bold", shadow: true },
  subtitle: { text: "Mô tả ngắn về chương trình khuyến mãi", color: "rgba(255,255,255,0.85)", fontSize: "sm" },
  cta: {
    primary:   { text: "Mua ngay", textColor: "#1e3a8a", bgColor: "#ffffff" },
    secondary: { text: "Xem khuyến mãi 🛒", textColor: "#ffffff", bgColor: "transparent" },
  },
  decoration: "circuit",
};

export function parseBannerConfig(json?: string | null): BannerConfig | null {
  if (!json) return null;
  try { return JSON.parse(json) as BannerConfig; }
  catch { return null; }
}

// ── Decoration SVGs ───────────────────────────────────────────────────────────
function CircuitDecoration() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-10" viewBox="0 0 800 300" fill="none" preserveAspectRatio="xMidYMid slice">
      <circle cx="650" cy="80"  r="120" stroke="white" strokeWidth="1"/>
      <circle cx="650" cy="80"  r="80"  stroke="white" strokeWidth="0.5"/>
      <circle cx="150" cy="230" r="80"  stroke="white" strokeWidth="0.5"/>
      <rect x="580" y="30"  width="12" height="12" rx="2" fill="white" opacity="0.6"/>
      <rect x="620" y="160" width="8"  height="8"  rx="2" fill="white" opacity="0.4"/>
      <rect x="700" y="60"  width="10" height="10" rx="2" fill="white" opacity="0.5"/>
      <path d="M0 200 Q200 160 400 200 T800 180" stroke="white" strokeWidth="0.5" fill="none" opacity="0.3"/>
      <path d="M0 250 Q300 220 600 250 T800 230" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2"/>
      <line x1="500" y1="0" x2="500" y2="300" stroke="white" strokeWidth="0.3" opacity="0.2"/>
      <line x1="600" y1="0" x2="600" y2="300" stroke="white" strokeWidth="0.3" opacity="0.2"/>
      <circle cx="500" cy="80"  r="4" fill="white" opacity="0.4"/>
      <circle cx="600" cy="160" r="4" fill="white" opacity="0.4"/>
      <circle cx="700" cy="100" r="3" fill="white" opacity="0.3"/>
    </svg>
  );
}
function DotsDecoration() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-10"
      style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
  );
}
function LinesDecoration() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-10"
      style={{ backgroundImage: "repeating-linear-gradient(45deg, white, white 1px, transparent 1px, transparent 12px)" }} />
  );
}

// ── Banner renderer (public display) ────────────────────────────────────────
interface RendererProps {
  cfg: BannerConfig;
  linkUrl?: string | null;
  className?: string;
  preview?: boolean;
}

export function BannerRenderer({ cfg, linkUrl, className = "", preview = false }: RendererProps) {
  // Background style
  const bgStyle: React.CSSProperties = {};
  if (cfg.bg.type === "solid") {
    bgStyle.backgroundColor = cfg.bg.from;
  } else if (cfg.bg.type === "gradient") {
    const dir = cfg.bg.dir === "135deg" ? "135deg" : cfg.bg.dir === "to-br" ? "135deg" : cfg.bg.dir === "to-r" ? "90deg" : "180deg";
    bgStyle.background = `linear-gradient(${dir}, ${cfg.bg.from}, ${cfg.bg.to})`;
  } else if (cfg.bg.type === "image" && cfg.bg.imageUrl) {
    bgStyle.backgroundImage = `url(${cfg.bg.imageUrl})`;
    bgStyle.backgroundSize = "cover";
    bgStyle.backgroundPosition = "center";
  }

  const align = cfg.layout === "center" ? "items-center text-center" : cfg.layout === "right" ? "items-end text-right" : "items-start text-left";
  const titleSize = { xl: "text-xl", "2xl": "text-2xl", "3xl": "text-3xl", "4xl": "text-4xl md:text-5xl" }[cfg.title.fontSize] ?? "text-3xl";
  const titleWeight = { normal: "font-normal", semibold: "font-semibold", bold: "font-bold", extrabold: "font-extrabold" }[cfg.title.fontWeight] ?? "font-bold";
  const subtitleSize = { xs: "text-xs", sm: "text-sm", base: "text-base" }[cfg.subtitle?.fontSize ?? "sm"] ?? "text-sm";

  const inner = (
    <div className={`relative overflow-hidden ${preview ? "rounded-2xl" : ""} ${className}`}
      style={{ ...bgStyle, minHeight: preview ? 160 : 280 }}>
      {/* BG overlay (for image type) */}
      {cfg.bg.type === "image" && cfg.bg.overlayColor && (
        <div className="absolute inset-0" style={{ backgroundColor: cfg.bg.overlayColor }} />
      )}
      {/* Decorations */}
      {cfg.decoration === "circuit" && <CircuitDecoration />}
      {cfg.decoration === "dots"    && <DotsDecoration />}
      {cfg.decoration === "lines"   && <LinesDecoration />}

      {/* Content */}
      <div className={`relative z-10 flex h-full flex-col justify-center px-8 py-8 md:px-16 ${align}`}
        style={{ minHeight: "inherit" }}>
        {cfg.badge?.text && (
          <span className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold"
            style={{ color: cfg.badge.color, backgroundColor: cfg.badge.bgColor }}>
            {cfg.badge.text}
          </span>
        )}
        <h2 className={`${titleSize} ${titleWeight} leading-tight`}
          style={{ color: cfg.title.color, textShadow: cfg.title.shadow ? "0 2px 8px rgba(0,0,0,0.3)" : undefined }}>
          {cfg.title.text}
        </h2>
        {cfg.subtitle?.text && (
          <p className={`mt-2 max-w-lg ${subtitleSize}`} style={{ color: cfg.subtitle.color }}>
            {cfg.subtitle.text}
          </p>
        )}
        {cfg.cta && (
          <div className={`mt-5 flex flex-wrap gap-3 ${cfg.layout === "center" ? "justify-center" : cfg.layout === "right" ? "justify-end" : ""}`}>
            <button type="button" className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: cfg.cta.primary.bgColor, color: cfg.cta.primary.textColor }}>
              {cfg.cta.primary.text}
            </button>
            {cfg.cta.secondary?.text && (
              <button type="button" className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: cfg.cta.secondary.bgColor === "transparent" ? "transparent" : cfg.cta.secondary.bgColor,
                         color: cfg.cta.secondary.textColor }}>
                {cfg.cta.secondary.text}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return linkUrl ? <a href={linkUrl} className="block">{inner}</a> : inner;
}

// ── Banner Builder Modal (admin editor) ───────────────────────────────────────
import { useState } from "react";
import { fileApi } from "@/api/file.api";
import { bannerApi } from "@/api/banner.api";
import { useToast } from "@/context/ToastContext";

interface BuilderProps {
  initial: BannerConfig;
  onSave: (cfg: BannerConfig) => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { label: "Tech Blue",   from: "#0f2c6b", to: "#1a7fe8" },
  { label: "Ocean",       from: "#064e3b", to: "#06b6d4" },
  { label: "Purple Pro",  from: "#4c1d95", to: "#7c3aed" },
  { label: "Gaming Fire", from: "#7c2d12", to: "#ea580c" },
  { label: "Gaming Dark", from: "#18181b", to: "#6d28d9" },
  { label: "Student",     from: "#0369a1", to: "#38bdf8" },
  { label: "Rose Gold",   from: "#9f1239", to: "#f43f5e" },
  { label: "Dark Pro",    from: "#111827", to: "#374151" },
];

const FONT_SIZES = ["xl","2xl","3xl","4xl"] as const;
const FONT_WEIGHTS = ["normal","semibold","bold","extrabold"] as const;

export function BannerBuilderModal({ initial, onSave, onClose }: BuilderProps) {
  const [cfg, setCfg] = useState<BannerConfig>(structuredClone(initial));
  const toast = useToast();
  const [uploading, setUploading]   = useState(false);
  const [aiLoading, setAiLoading]   = useState(false);

  const set = <K extends keyof BannerConfig>(k: K, v: BannerConfig[K]) =>
    setCfg(c => ({ ...c, [k]: v }));

  const setBg  = (p: Partial<BannerConfig["bg"]>)      => setCfg(c => ({ ...c, bg: { ...c.bg, ...p } }));
  const setTitle = (p: Partial<BannerConfig["title"]>)  => setCfg(c => ({ ...c, title: { ...c.title, ...p } }));
  const setSub   = (p: Partial<NonNullable<BannerConfig["subtitle"]>>) =>
    setCfg(c => ({ ...c, subtitle: { text: "", color: "rgba(255,255,255,0.85)", fontSize: "sm", ...(c.subtitle ?? {}), ...p } }));
  const setBadge = (p: Partial<NonNullable<BannerConfig["badge"]>>) =>
    setCfg(c => ({ ...c, badge: { text: "", color: "#fff", bgColor: "rgba(255,255,255,0.2)", ...(c.badge ?? {}), ...p } }));
  const setCta = (primary: BannerConfig["cta"], secondary?: BannerConfig["cta"]) =>
    setCfg(c => ({ ...c, cta: { primary: { text: "Mua ngay", textColor: "#1e3a8a", bgColor: "#fff", ...(c.cta?.primary ?? {}), ...primary }, secondary: c.cta?.secondary } }));

  const aiSuggest = async () => {
    const imgUrl = cfg.bg.imageUrl ?? "";
    if (!imgUrl) { toast.warning("Cần chọn ảnh trước để AI gợi ý"); return; }
    setAiLoading(true);
    try {
      const s = await bannerApi.aiSuggest(imgUrl);
      setTitle({ text: s.title });
      setSub({ text: s.subtitle });
      toast.success(`✨ AI gợi ý (${s.source})`, "Đã điền tiêu đề và mô tả");
    } catch (e) { toast.error("AI thất bại", (e as Error).message); }
    finally { setAiLoading(false); }
  };

  const uploadBg = async (f: File) => {
    setUploading(true);
    try {
      const res = await fileApi.upload(f, () => {}, "banners");
      setBg({ type: "image", imageUrl: res.fileUrl });
    } catch (e) { toast.error("Upload thất bại", (e as Error).message); }
    finally { setUploading(false); }
  };

  const inputCls = "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:border-brand-400 focus:outline-none";
  const colorCls = "h-9 w-full rounded-lg border border-gray-200 cursor-pointer";

  return (
    <div className="fixed inset-0 z-[150] flex items-start overflow-y-auto bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="mx-auto my-4 w-full max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">🎨 Banner Builder</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-0">
          {/* ── Controls (left) ── */}
          <div className="space-y-5 overflow-y-auto p-5" style={{ maxHeight: "75vh" }}>

            {/* Background */}
            <Section label="🖼 Nền banner">
              <div className="flex gap-2 mb-3">
                {(["gradient","solid","image"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setBg({ type: t })}
                    className={`flex-1 rounded-lg border py-1.5 text-theme-xs font-medium transition-colors ${cfg.bg.type === t ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15" : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700"}`}>
                    {t === "gradient" ? "Gradient" : t === "solid" ? "Màu đặc" : "Ảnh"}
                  </button>
                ))}
              </div>

              {cfg.bg.type !== "image" && (
                <>
                  {/* Color presets */}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {COLOR_PRESETS.map(p => (
                      <button key={p.label} type="button" onClick={() => setBg({ from: p.from, to: p.to })}
                        title={p.label}
                        className="h-7 w-7 rounded-full border-2 border-white shadow-sm transition-transform hover:scale-110"
                        style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-theme-xs text-gray-500">
                      Màu bắt đầu
                      <input type="color" value={cfg.bg.from} onChange={e => setBg({ from: e.target.value })}
                        className={colorCls + " mt-1"} />
                    </label>
                    {cfg.bg.type === "gradient" && (
                      <label className="block text-theme-xs text-gray-500">
                        Màu kết thúc
                        <input type="color" value={cfg.bg.to} onChange={e => setBg({ to: e.target.value })}
                          className={colorCls + " mt-1"} />
                      </label>
                    )}
                  </div>
                  {cfg.bg.type === "gradient" && (
                    <div className="mt-2">
                      <label className="text-theme-xs text-gray-500">Hướng gradient</label>
                      <select value={cfg.bg.dir} onChange={e => setBg({ dir: e.target.value as BannerConfig["bg"]["dir"] })}
                        className={inputCls + " mt-1"}>
                        <option value="to-r">Ngang →</option>
                        <option value="to-br">Chéo ↘</option>
                        <option value="to-b">Dọc ↓</option>
                        <option value="135deg">Chéo 135°</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {cfg.bg.type === "image" && (
                <div className="space-y-2">
                  <label className="text-theme-xs text-gray-500">
                    URL ảnh (Unsplash, Pexels...)
                    <input value={cfg.bg.imageUrl ?? ""} onChange={e => setBg({ imageUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className={inputCls + " mt-1"} />
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-theme-xs text-gray-400">hoặc</span>
                    <label className="cursor-pointer rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-theme-xs text-gray-500 hover:border-brand-400 hover:text-brand-500 transition-colors">
                      {uploading ? "Đang upload..." : "📁 Upload ảnh"}
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) void uploadBg(f); }} />
                    </label>
                  </div>
                  <label className="text-theme-xs text-gray-500">
                    Overlay tối (để đọc chữ)
                    <input type="color" defaultValue="#000000"
                      onChange={e => { const hex = e.target.value; const opacity = 0.45; setBg({ overlayColor: hex + Math.round(opacity*255).toString(16).padStart(2,"0") }); }}
                      className={colorCls + " mt-1"} />
                  </label>
                </div>
              )}
            </Section>

            {/* Layout & Decoration */}
            <Section label="📐 Layout & Decoration">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-theme-xs text-gray-500">Căn chỉnh nội dung</label>
                  <select value={cfg.layout} onChange={e => set("layout", e.target.value as BannerConfig["layout"])}
                    className={inputCls + " mt-1"}>
                    <option value="left">Trái</option>
                    <option value="center">Giữa</option>
                    <option value="right">Phải</option>
                  </select>
                </div>
                <div>
                  <label className="text-theme-xs text-gray-500">Họa tiết nền</label>
                  <select value={cfg.decoration ?? "none"} onChange={e => set("decoration", e.target.value as BannerConfig["decoration"])}
                    className={inputCls + " mt-1"}>
                    <option value="none">Không có</option>
                    <option value="circuit">Circuit (Tech)</option>
                    <option value="dots">Dots</option>
                    <option value="lines">Lines</option>
                  </select>
                </div>
              </div>
            </Section>

            {/* Badge */}
            <Section label="🏷 Badge nhỏ (trên tiêu đề)">
              <input value={cfg.badge?.text ?? ""} onChange={e => setBadge({ text: e.target.value })}
                placeholder="🎓 ĐỒNG HÀNH CÙNG SINH VIÊN"
                className={inputCls} />
              {cfg.badge?.text && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-theme-xs text-gray-500">Màu chữ badge
                    <input type="color" value={cfg.badge.color} onChange={e => setBadge({ color: e.target.value })}
                      className={colorCls + " mt-1"} />
                  </label>
                </div>
              )}
            </Section>

            {/* Title */}
            <Section label="📝 Tiêu đề chính">
              {/* AI suggest — chỉ hoạt động khi có ảnh nền */}
              {cfg.bg.type === "image" && cfg.bg.imageUrl && (
                <button type="button" onClick={() => void aiSuggest()} disabled={aiLoading}
                  className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-theme-xs font-medium text-purple-600 hover:bg-purple-100 disabled:opacity-50 transition-colors dark:bg-purple-500/10 dark:text-purple-400">
                  {aiLoading
                    ? <><svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Đang phân tích...</>
                    : <>✨ AI gợi ý tiêu đề từ ảnh</>
                  }
                </button>
              )}
              <textarea value={cfg.title.text} onChange={e => setTitle({ text: e.target.value })}
                rows={2} placeholder="Tiêu đề banner của bạn"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-theme-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="text-theme-xs text-gray-500">Màu chữ
                    <input type="color" value={cfg.title.color} onChange={e => setTitle({ color: e.target.value })}
                      className={colorCls + " mt-1"} />
                  </label>
                </div>
                <div>
                  <label className="text-theme-xs text-gray-500">Cỡ chữ
                    <select value={cfg.title.fontSize} onChange={e => setTitle({ fontSize: e.target.value as typeof FONT_SIZES[number] })}
                      className={inputCls + " mt-1"}>
                      {FONT_SIZES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                  </label>
                </div>
                <div>
                  <label className="text-theme-xs text-gray-500">Độ đậm
                    <select value={cfg.title.fontWeight} onChange={e => setTitle({ fontWeight: e.target.value as typeof FONT_WEIGHTS[number] })}
                      className={inputCls + " mt-1"}>
                      {FONT_WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              <label className="mt-2 flex items-center gap-2 text-theme-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={cfg.title.shadow} onChange={e => setTitle({ shadow: e.target.checked })}
                  className="h-4 w-4 rounded accent-brand-500" />
                Text shadow
              </label>
            </Section>

            {/* Subtitle */}
            <Section label="💬 Mô tả phụ">
              <textarea value={cfg.subtitle?.text ?? ""} onChange={e => setSub({ text: e.target.value })}
                rows={2} placeholder="Mô tả ngắn, ưu đãi, thông tin sản phẩm..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-theme-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-theme-xs text-gray-500">Màu chữ phụ
                  <input type="color" value={cfg.subtitle?.color?.replace(/rgba?\([^)]+\)/,"#ffffff") ?? "#ffffff"} onChange={e => setSub({ color: e.target.value })}
                    className={colorCls + " mt-1"} />
                </label>
                <label className="text-theme-xs text-gray-500">Cỡ chữ phụ
                  <select value={cfg.subtitle?.fontSize ?? "sm"} onChange={e => setSub({ fontSize: e.target.value as "xs"|"sm"|"base" })}
                    className={inputCls + " mt-1"}>
                    <option value="xs">XS</option><option value="sm">SM</option><option value="base">Base</option>
                  </select>
                </label>
              </div>
            </Section>

            {/* CTA */}
            <Section label="🔘 Nút CTA">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-theme-xs font-medium text-gray-500">Nút chính</label>
                  <div className="flex gap-2">
                    <input value={cfg.cta?.primary.text ?? "Mua ngay"} onChange={e => setCfg(c => ({ ...c, cta: { ...c.cta!, primary: { ...c.cta!.primary, text: e.target.value } } }))}
                      placeholder="Mua ngay" className={inputCls + " flex-1"} />
                    <input type="color" value={cfg.cta?.primary.bgColor ?? "#ffffff"} onChange={e => setCfg(c => ({ ...c, cta: { ...c.cta!, primary: { ...c.cta!.primary, bgColor: e.target.value } } }))}
                      className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer" title="Màu nền nút" />
                    <input type="color" value={cfg.cta?.primary.textColor ?? "#000000"} onChange={e => setCfg(c => ({ ...c, cta: { ...c.cta!, primary: { ...c.cta!.primary, textColor: e.target.value } } }))}
                      className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer" title="Màu chữ nút" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-theme-xs font-medium text-gray-500">Nút phụ (tuỳ chọn)</label>
                  <input value={cfg.cta?.secondary?.text ?? ""} onChange={e => setCfg(c => ({ ...c, cta: { ...c.cta!, secondary: { text: e.target.value, textColor: c.cta?.secondary?.textColor ?? "#ffffff", bgColor: c.cta?.secondary?.bgColor ?? "transparent" } } }))}
                    placeholder="Xem khuyến mãi 🛒" className={inputCls} />
                </div>
              </div>
            </Section>
          </div>

          {/* ── Preview (right) ── */}
          <div className="border-l border-gray-100 p-5 dark:border-gray-800">
            <p className="mb-3 text-theme-xs font-semibold uppercase tracking-wider text-gray-400">Preview</p>
            <div className="overflow-hidden rounded-2xl shadow-lg">
              <BannerRenderer cfg={cfg} preview />
            </div>
            <p className="mt-3 text-center text-theme-xs text-gray-400">
              Preview 1:1 — banner thực tế hiển thị đầy đủ chiều rộng
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button onClick={onClose} type="button"
            className="h-10 rounded-lg border border-gray-200 px-4 text-theme-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 select-none">
            Huỷ
          </button>
          <button onClick={() => onSave(cfg)} type="button"
            className="btn-press h-10 rounded-lg bg-brand-500 px-5 text-theme-sm font-semibold text-white hover:bg-brand-600 active:bg-brand-700 select-none">
            💾 Lưu style
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-theme-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-white/[0.02] space-y-2">
        {children}
      </div>
    </div>
  );
}
