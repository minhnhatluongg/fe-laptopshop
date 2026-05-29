import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { BannerDto } from "@/api/banner.api";
import { getImageUrl } from "@/utils/image";
import { cn } from "@/utils/cn";

interface CarouselProps {
  banners: BannerDto[];
  autoPlayMs?: number;
}

export function HeroCarousel({ banners, autoPlayMs = 5000 }: CarouselProps) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = banners.length;

  const go = useCallback((idx: number) => {
    setCurrent(((idx % total) + total) % total);
  }, [total]);

  const next = useCallback(() => go(current + 1), [current, go]);
  const prev = useCallback(() => go(current - 1), [current, go]);

  // Auto-play
  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(next, autoPlayMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, autoPlayMs, total]);

  const pause = () => { if (timerRef.current) clearInterval(timerRef.current); };
  const resume = () => {
    if (total <= 1) return;
    timerRef.current = setInterval(next, autoPlayMs);
  };

  if (total === 0) return null;

  const banner = banners[current];
  const Wrapper = banner.linkUrl ? Link : "div";
  const wrapperProps = banner.linkUrl
    ? { to: banner.linkUrl, className: "block" }
    : { className: "block" };

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      {/* Slides */}
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === current ? "opacity-100 z-10" : "opacity-0 z-0",
          )}
        >
          <img
            src={getImageUrl(b.imageUrl)}
            alt={b.title}
            className="h-full w-full object-cover"
            loading={i === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}

      {/* Current slide content */}
      <div className="relative z-20 aspect-[21/8] min-h-[240px]">
        <img
          src={getImageUrl(banner.imageUrl)}
          alt={banner.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 lg:px-24">
          {banner.subtitle && (
            <span className="mb-2 w-fit rounded-full bg-brand-500/80 px-3 py-1 text-theme-xs font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
              {banner.subtitle}
            </span>
          )}
          <h2 className="max-w-xl text-2xl font-bold leading-tight text-white drop-shadow-lg md:text-4xl lg:text-5xl">
            {banner.title}
          </h2>
          {banner.linkUrl && (
            <Link
              to={banner.linkUrl}
              className="mt-5 w-fit inline-flex h-11 items-center rounded-lg bg-white px-6 text-theme-sm font-semibold text-gray-900 shadow hover:bg-gray-100 transition"
            >
              Xem ngay →
            </Link>
          )}
        </div>
      </div>

      {/* Controls */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Trước"
            className="absolute left-3 top-1/2 z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Tiếp"
            className="absolute right-3 top-1/2 z-30 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === current
                    ? "w-6 bg-white"
                    : "w-2 bg-white/50 hover:bg-white/80",
                )}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
