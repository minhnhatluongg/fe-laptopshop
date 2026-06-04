import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { BannerDto } from "@/api/banner.api";
import { BannerRenderer, parseBannerConfig } from "@/components/ui/BannerBuilder";
import { getImageUrl } from "@/utils/image";
import { cn } from "@/utils/cn";

interface CarouselProps {
  banners: BannerDto[];
  autoPlayMs?: number;
}

export function HeroCarousel({ banners, autoPlayMs = 5000 }: CarouselProps) {
  const total = banners.length;
  const [cur, setCur]         = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [paused, setPaused]   = useState(false);
  const [progress, setProgress] = useState(0);

  // Stable refs — no stale closure in interval
  const curRef    = useRef(0);
  const pausedRef = useRef(false);
  curRef.current    = cur;
  pausedRef.current = paused;

  // ── Slide to index ─────────────────────────────────────────────────────────
  const slideTo = (idx: number) => {
    const next = ((idx % total) + total) % total;
    curRef.current = next;
    setCur(next);
    setAnimKey(k => k + 1);
    setProgress(0);
  };

  const goNext = () => slideTo(curRef.current + 1);
  const goPrev = () => slideTo(curRef.current - 1);

  // ── Auto-play — single stable interval, never recreated ──────────────────
  useEffect(() => {
    if (total <= 1) return;
    const TICK = 50;
    const step = 100 / (autoPlayMs / TICK);
    let p = 0;

    const id = setInterval(() => {
      if (pausedRef.current) { p = 0; setProgress(0); return; }
      p = Math.min(p + step, 100);
      setProgress(p);
      if (p >= 100) {
        p = 0;
        setProgress(0);
        const next = (curRef.current + 1) % total;
        curRef.current = next;
        setCur(next);
        setAnimKey(k => k + 1);
      }
    }, TICK);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, autoPlayMs]);

  if (total === 0) return null;

  // Guard: if cur is out of range after banner deleted
  const safeCur = cur >= total ? total - 1 : cur;
  if (safeCur !== cur) { setCur(safeCur); }
  const b = banners[safeCur];
  const cfg = parseBannerConfig(b.styleConfig);

  return (
    <section
      className="group relative mx-auto w-full max-w-screen-2xl select-none overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        // Banner tỉ lệ 21:9 (cinematic) — co giãn theo width nhưng giới hạn max-height
        // Trên 1920px: width≈1536px → height≈658px nhưng cap ở 420px để không loé pixel.
        aspectRatio: "21 / 9",
        maxHeight: "clamp(220px, 30vw, 420px)",
      }}
    >
      {/* ── Slides — CSS fade transition ──────────────────────────────────── */}
      {banners.map((banner, i) => {
        const bannerCfg = parseBannerConfig(banner.styleConfig);
        const isActive  = i === safeCur;
        return (
          <div
            key={banner.id}
            className="absolute inset-0"
            style={{
              opacity:    isActive ? 1 : 0,
              transition: "opacity 0.7s ease",
              zIndex:     isActive ? 10 : 0,
              pointerEvents: isActive ? "auto" : "none",
            }}
          >
            {bannerCfg ? (
              /* ── Styled banner (BannerBuilder config) ── */
              <BannerRenderer
                cfg={bannerCfg}
                linkUrl={banner.linkUrl}
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              /* ── Image banner with Ken Burns ── */
              <>
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    key={isActive ? `active-${animKey}` : `idle-${i}`}
                    src={getImageUrl(banner.imageUrl)}
                    alt={banner.title}
                    loading={i === 0 ? "eager" : "lazy"}
                    draggable={false}
                    style={{
                      width:  "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                      // Ken Burns: zoom in slowly while active (giảm scale để không quá zoom)
                      transform:  isActive ? "scale(1.04)" : "scale(1.0)",
                      transition: isActive
                        ? `transform ${autoPlayMs + 1000}ms linear`
                        : "transform 0.8s ease",
                      transformOrigin: "center center",
                      willChange: "transform",
                      imageRendering: "auto",
                    }}
                  />
                </div>

                {/* Gradient overlays — đủ tương phản chữ, nhẹ hơn để thoáng */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

                {/* Slide text */}
                <div
                  className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 lg:px-20"
                  style={{
                    opacity:    isActive ? 1 : 0,
                    transform:  isActive ? "translateY(0)" : "translateY(12px)",
                    transition: isActive
                      ? "opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s"
                      : "none",
                  }}
                >
                  {banner.subtitle && (
                    <span className="mb-3 w-fit rounded-full border border-white/25 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                      {banner.subtitle}
                    </span>
                  )}
                  <h2 className="max-w-xl font-outfit text-2xl font-bold leading-snug text-white drop-shadow-md md:text-3xl lg:text-4xl">
                    {banner.title}
                  </h2>
                  {banner.linkUrl && (
                    <Link
                      to={banner.linkUrl}
                      tabIndex={isActive ? 0 : -1}
                      className="mt-5 w-fit inline-flex h-11 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-gray-900 shadow-lg transition-all hover:bg-brand-500 hover:text-white hover:gap-3"
                    >
                      Xem ngay
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* ── Paused badge ──────────────────────────────────────────────────── */}
      <div className={cn(
        "absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-full px-3 py-1",
        "bg-black/40 text-[11px] font-medium text-white backdrop-blur-sm",
        "pointer-events-none transition-all duration-300",
        "opacity-0 group-hover:opacity-100",
      )}>
        <span className="h-2 w-1 rounded-sm bg-white" />
        <span className="h-2 w-1 rounded-sm bg-white" />
        Đã dừng
      </div>

      {/* ── Arrows ────────────────────────────────────────────────────────── */}
      {total > 1 && (
        <>
          <button type="button" onClick={goPrev} aria-label="Slide trước"
            className={cn(
              "absolute left-4 top-1/2 z-20 -translate-y-1/2",
              "flex h-11 w-11 items-center justify-center rounded-full",
              "border border-white/20 bg-black/25 text-white backdrop-blur-sm",
              "transition-colors duration-200 hover:bg-brand-500 hover:border-brand-500",
              "opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
            )}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button type="button" onClick={goNext} aria-label="Slide tiếp"
            className={cn(
              "absolute right-4 top-1/2 z-20 -translate-y-1/2",
              "flex h-11 w-11 items-center justify-center rounded-full",
              "border border-white/20 bg-black/25 text-white backdrop-blur-sm",
              "transition-colors duration-200 hover:bg-brand-500 hover:border-brand-500",
              "opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
            )}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* ── Progress dots + counter ──────────────────────────────────── */}
          <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-8 pb-4 md:px-16">
            <div className="flex items-center gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => slideTo(i)}
                  aria-label={`Slide ${i + 1}`}
                  style={{
                    width:        i === safeCur ? "2.25rem" : "0.5rem",
                    height:       "3px",
                    borderRadius: "99px",
                    overflow:     "hidden",
                    background:   "rgba(255,255,255,0.3)",
                    transition:   "width 0.35s ease",
                    position:     "relative",
                    padding:      0,
                    border:       "none",
                    cursor:       "pointer",
                  }}
                >
                  {i === safeCur && (
                    <span style={{
                      position:     "absolute",
                      inset:        "0 auto 0 0",
                      background:   "white",
                      borderRadius: "99px",
                      width:        `${progress}%`,
                      transition:   "width 50ms linear",
                    }} />
                  )}
                </button>
              ))}
            </div>

            <span className="tabular-nums text-xs font-semibold text-white/60">
              <span className="text-base font-bold text-white">{String(safeCur + 1).padStart(2, "0")}</span>
              <span className="mx-1 text-white/40">/</span>
              {String(total).padStart(2, "0")}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
