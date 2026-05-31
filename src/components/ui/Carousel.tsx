import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { BannerDto } from "@/api/banner.api";
import { getImageUrl } from "@/utils/image";
import { cn } from "@/utils/cn";

interface CarouselProps {
  banners: BannerDto[];
  autoPlayMs?: number;
}

// ─── HeroCarousel ─────────────────────────────────────────────────────────────
// Parallax hero banner:
//   • Sliding transition (translateX) với cubic-bezier mượt
//   • Ken Burns: ảnh active zoom chậm từ 100% → 108% trong suốt thời gian slide
//   • Text stagger: subtitle → title → CTA lần lượt fade-up khi slide active
//   • Progress bar mỏng ở dưới, fill theo thời gian
//   • Arrows ẩn, hiện khi hover vào banner
//   • Slide counter ở góc phải dưới
export function HeroCarousel({ banners, autoPlayMs = 5500 }: CarouselProps) {
  const total = banners.length;

  // ── state ──────────────────────────────────────────────────────────────────
  const [cur, setCur]   = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [dir, setDir]   = useState<1 | -1>(1); // 1=next, -1=prev
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused]     = useState(false);

  // ── refs ───────────────────────────────────────────────────────────────────
  const busyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── slide function ─────────────────────────────────────────────────────────
  const go = (next: number, d: 1 | -1 = 1) => {
    if (busy || next === cur) return;
    const target = ((next % total) + total) % total;
    setDir(d);
    setPrev(cur);
    setCur(target);
    setBusy(true);
    setProgress(0);
    busyTimer.current = setTimeout(() => {
      setPrev(null);
      setBusy(false);
    }, 750);
  };

  const goNext = () => go((cur + 1) % total, 1);
  const goPrev = () => go((cur - 1 + total) % total, -1);

  // ── auto-play + progress ───────────────────────────────────────────────────
  useEffect(() => {
    if (total <= 1 || paused) { setProgress(0); return; }
    const TICK = 40;
    const step = 100 / (autoPlayMs / TICK);
    let p = 0;
    setProgress(0);

    tickTimer.current = setInterval(() => {
      p = Math.min(p + step, 100);
      setProgress(p);
      if (p >= 100) {
        p = 0;
        setProgress(0);
        setCur(c => {
          const next = (c + 1) % total;
          setPrev(c);
          setDir(1);
          setBusy(true);
          setTimeout(() => { setPrev(null); setBusy(false); }, 750);
          return next;
        });
      }
    }, TICK);

    return () => { if (tickTimer.current) clearInterval(tickTimer.current); };
  }, [cur, paused, total, autoPlayMs]);

  // ── cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (busyTimer.current) clearTimeout(busyTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
  }, []);

  if (total === 0) return null;

  // ── position helper ────────────────────────────────────────────────────────
  const getTransform = (i: number) => {
    if (i === cur)  return "translateX(0%)";
    if (i === prev) return dir === 1 ? "translateX(-100%)" : "translateX(100%)";
    // Off-screen waiting — placed on the side the current came FROM so it's ready
    return dir === 1 ? "translateX(100%)" : "translateX(-100%)";
  };

  const isVisible = (i: number) => i === cur || i === prev;

  return (
    <section
      className="group relative overflow-hidden rounded-2xl shadow-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Slide track ──────────────────────────────────────────────────── */}
      <div className="relative aspect-21/8 min-h-65 bg-gray-900">
        {banners.map((b, i) => {
          const active = i === cur;
          const exiting = i === prev;

          return (
            <div
              key={b.id}
              aria-hidden={!active}
              style={{
                position:  "absolute",
                inset:     0,
                transform: getTransform(i),
                transition: isVisible(i) ? "transform 0.75s cubic-bezier(0.76, 0, 0.24, 1)" : "none",
                zIndex:    active ? 10 : exiting ? 9 : 0,
                pointerEvents: active ? "auto" : "none",
              }}
            >
              {/* ── Parallax image (Ken Burns zoom) ───────────────────── */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={getImageUrl(b.imageUrl)}
                  alt={b.title}
                  loading={i === 0 ? "eager" : "lazy"}
                  style={{
                    width:      "100%",
                    height:     "100%",
                    objectFit:  "cover",
                    transform:  active ? "scale(1.08)" : "scale(1.0)",
                    transition: active
                      ? `transform ${autoPlayMs + 500}ms linear`
                      : "transform 0.75s ease",
                    transformOrigin: "center center",
                    willChange: "transform",
                  }}
                />
              </div>

              {/* ── Gradient overlay ──────────────────────────────────── */}
              <div className="absolute inset-0 bg-linear-to-r from-black/70 via-black/30 to-transparent" />
              <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />

              {/* ── Slide content (staggered fade-up) ────────────────── */}
              <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 lg:px-24">
                {b.subtitle && (
                  <span
                    className={cn(
                      "mb-3 w-fit rounded-full border border-white/25 bg-white/10 px-4 py-1",
                      "text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm",
                      "transition-all duration-700",
                      active ? "opacity-100 translate-y-0 delay-100" : "opacity-0 translate-y-3",
                    )}
                  >
                    {b.subtitle}
                  </span>
                )}

                <h2
                  className={cn(
                    "max-w-xl font-outfit text-2xl font-bold leading-snug text-white drop-shadow-md",
                    "md:text-4xl lg:text-[2.75rem]",
                    "transition-all duration-700",
                    active ? "opacity-100 translate-y-0 delay-175" : "opacity-0 translate-y-5",
                  )}
                >
                  {b.title}
                </h2>

                {b.linkUrl && (
                  <Link
                    to={b.linkUrl}
                    tabIndex={active ? 0 : -1}
                    className={cn(
                      "mt-6 w-fit inline-flex h-11 items-center gap-2 rounded-xl bg-white px-7",
                      "text-sm font-semibold text-gray-900 shadow-lg",
                      "transition-all duration-700 hover:bg-brand-500 hover:text-white hover:gap-3",
                      active ? "opacity-100 translate-y-0 delay-250" : "opacity-0 translate-y-5",
                    )}
                  >
                    Xem ngay
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Controls (only when > 1 slide) ─────────────────────────────── */}
      {total > 1 && (
        <>
          {/* Prev arrow */}
          <button
            type="button"
            onClick={goPrev}
            aria-label="Slide trước"
            className={cn(
              "absolute left-4 top-1/2 z-20 -translate-y-1/2",
              "flex h-11 w-11 items-center justify-center rounded-full",
              "border border-white/20 bg-black/25 text-white backdrop-blur-sm",
              "transition-all duration-300 hover:bg-brand-500 hover:border-brand-500 hover:scale-105",
              "opacity-0 group-hover:opacity-100",
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Next arrow */}
          <button
            type="button"
            onClick={goNext}
            aria-label="Slide tiếp"
            className={cn(
              "absolute right-4 top-1/2 z-20 -translate-y-1/2",
              "flex h-11 w-11 items-center justify-center rounded-full",
              "border border-white/20 bg-black/25 text-white backdrop-blur-sm",
              "transition-all duration-300 hover:bg-brand-500 hover:border-brand-500 hover:scale-105",
              "opacity-0 group-hover:opacity-100",
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* ── Bottom bar: progress indicators + counter ──────────────── */}
          <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-8 pb-4 md:px-16">
            {/* Progress pill per slide */}
            <div className="flex items-center gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i, i > cur ? 1 : -1)}
                  aria-label={`Chuyển sang slide ${i + 1}`}
                  style={{
                    width:      i === cur ? "2.5rem" : "0.625rem",
                    height:     "3px",
                    borderRadius: "99px",
                    overflow:   "hidden",
                    background: "rgba(255,255,255,0.3)",
                    transition: "width 0.3s ease",
                    position:   "relative",
                    padding:    0,
                    border:     "none",
                    cursor:     "pointer",
                  }}
                >
                  {i === cur && (
                    <span
                      style={{
                        position:   "absolute",
                        inset:      "0 auto 0 0",
                        background: "white",
                        borderRadius: "99px",
                        width:      `${progress}%`,
                        transition: "width 40ms linear",
                      }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Slide counter */}
            <span className="tabular-nums text-xs font-semibold text-white/60">
              <span className="text-base font-bold text-white">{String(cur + 1).padStart(2, "0")}</span>
              <span className="mx-1 text-white/40">/</span>
              {String(total).padStart(2, "0")}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
