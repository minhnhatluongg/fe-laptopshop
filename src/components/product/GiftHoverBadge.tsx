import { useEffect, useRef, useState } from "react";
import { Gift } from "lucide-react";
import { giftApi, type ProductGiftItemDto } from "@/api/gift.api";
import { getImageUrl } from "@/utils/image";
import { formatVND } from "@/utils/format";

/* ──────────────────────────────────────────────────────────────────────────
 * GiftHoverBadge — huy hiệu quà tặng kèm trên card sản phẩm.
 * Hover để xem danh sách quà (lazy-fetch theo productId). Dùng chung cho
 * Trang chủ và Trang sản phẩm.
 * ────────────────────────────────────────────────────────────────────────── */
export function GiftHoverBadge({ productId }: { productId: number }) {
  const [gifts, setGifts]     = useState<ProductGiftItemDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const wrapRef               = useRef<HTMLDivElement>(null);
  const showTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchIfNeeded = async () => {
    if (gifts !== null || loading) return;
    setLoading(true);
    try {
      setGifts(await giftApi.getByProduct(productId));
    } catch {
      setGifts([]);
    } finally {
      setLoading(false);
    }
  };

  const onEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    void fetchIfNeeded();
    showTimer.current = setTimeout(() => setVisible(true), 150);
  };
  const onLeave = () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 200);
  };

  useEffect(() => () => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  return (
    <div ref={wrapRef} className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {/* Badge icon */}
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-purple-500 shadow-md cursor-default dark:bg-gray-800">
        {loading
          ? <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          : <Gift size={15} strokeWidth={2.5} />
        }
      </span>

      {/* Popup */}
      {visible && gifts !== null && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
          onMouseEnter={onEnter} onMouseLeave={onLeave}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-gray-100 bg-purple-50 px-3 py-2.5 dark:border-gray-800 dark:bg-purple-500/10">
            <Gift size={13} className="text-purple-500" />
            <p className="text-[12px] font-semibold text-purple-700 dark:text-purple-300">
              Quà tặng kèm ({gifts.length})
            </p>
          </div>

          {gifts.length === 0 ? (
            <p className="px-4 py-3 text-[12px] text-gray-400">Chưa có quà tặng nào</p>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {gifts.map((g) => (
                <li key={g.id} className="flex items-center gap-3 px-3 py-2.5">
                  {/* Thumbnail or fallback */}
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                    {g.giftImageUrl ? (
                      <img
                        src={getImageUrl(g.giftImageUrl)}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            parent.className = parent.className.replace("overflow-hidden", "");
                            parent.innerHTML = `<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 text-sm font-bold dark:bg-purple-500/20">${g.giftName.charAt(0).toUpperCase()}</div>`;
                          }
                        }}
                        alt={g.giftName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-500/20">
                        <Gift size={16} className="text-purple-500" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-gray-800 dark:text-white">
                      {g.giftName}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-400">×{g.quantity}</span>
                      {g.giftPrice === 0 ? (
                        <span className="rounded-full bg-success-50 px-1.5 py-0.5 text-[10px] font-semibold text-success-600 dark:bg-success-500/15 dark:text-success-400">
                          Miễn phí
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">{formatVND(g.giftPrice)}</span>
                      )}
                      {g.note && (
                        <span className="truncate text-[10px] italic text-gray-400">{g.note}</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Triangle arrow */}
          <div className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t border-gray-100 bg-purple-50 dark:border-gray-800 dark:bg-purple-500/10" />
        </div>
      )}
    </div>
  );
}
