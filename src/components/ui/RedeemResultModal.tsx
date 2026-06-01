import { useEffect, useRef } from "react";
import { formatVND } from "@/utils/format";
import { cn } from "@/utils/cn";

export type RedeemStatus = "success" | "failed" | "pending";

export interface RedeemResult {
  status: RedeemStatus;
  amount: number;
  expiresAt?: string | null;
  note?: string | null;
}

interface Props {
  result: RedeemResult | null;
  onClose: () => void;
}

// ── Gift box SVG illustration ─────────────────────────────────────────────────
function GiftIllustration({ status }: { status: RedeemStatus }) {
  const strikethrough = status === "failed";
  return (
    <div className="relative mx-auto w-36 select-none">
      {/* Confetti dots */}
      {status !== "failed" && (
        <>
          <span className="absolute -left-4 top-0 h-2 w-2 rounded-full bg-yellow-400" />
          <span className="absolute -left-1 top-6 h-1.5 w-1.5 rounded-full bg-blue-400" />
          <span className="absolute -right-4 top-2 h-2 w-2 rounded-full bg-pink-400" />
          <span className="absolute -right-1 top-8 h-1.5 w-1.5 rotate-45 bg-green-400" />
          <span className="absolute left-2 -top-3 h-1 w-3 rounded-full bg-purple-400 rotate-12" />
          <span className="absolute right-3 -top-2 h-1 w-3 rounded-full bg-orange-400 -rotate-12" />
        </>
      )}

      {/* Gift box SVG */}
      <svg viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        {/* Box body */}
        <rect x="10" y="40" width="100" height="55" rx="4" fill={strikethrough ? "#fca5a5" : "#fbbf24"} />
        <rect x="10" y="40" width="100" height="55" rx="4" fill="url(#boxGrad)" />
        {/* Box lid */}
        <rect x="5" y="30" width="110" height="18" rx="4" fill={strikethrough ? "#f87171" : "#f59e0b"} />
        {/* Ribbon vertical */}
        <rect x="53" y="30" width="14" height="65" rx="2" fill={strikethrough ? "#dc2626" : "#ef4444"} />
        {/* Ribbon horizontal on lid */}
        <rect x="5" y="35" width="110" height="8" rx="2" fill={strikethrough ? "#dc2626" : "#ef4444"} />
        {/* Bow left */}
        <ellipse cx="42" cy="30" rx="16" ry="9" fill={strikethrough ? "#dc2626" : "#ef4444"} transform="rotate(-20 42 30)" />
        {/* Bow right */}
        <ellipse cx="78" cy="30" rx="16" ry="9" fill={strikethrough ? "#dc2626" : "#ef4444"} transform="rotate(20 78 30)" />
        {/* Bow center */}
        <circle cx="60" cy="30" r="7" fill={strikethrough ? "#b91c1c" : "#dc2626"} />
        {/* Shine */}
        <ellipse cx="30" cy="55" rx="8" ry="4" fill="rgba(255,255,255,0.2)" transform="rotate(-15 30 55)" />
        {/* Stars on box */}
        {!strikethrough && (
          <>
            <circle cx="30" cy="68" r="3" fill="rgba(255,255,255,0.35)" />
            <circle cx="85" cy="75" r="2" fill="rgba(255,255,255,0.35)" />
          </>
        )}
        <defs>
          <linearGradient id="boxGrad" x1="10" y1="40" x2="110" y2="95" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgba(255,255,255,0.1)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.05)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ── Status icon at top ────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: RedeemStatus }) {
  if (status === "success") return (
    <div className="mx-auto -mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-success-500 shadow-lg shadow-success-500/30">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
  );
  if (status === "failed") return (
    <div className="mx-auto -mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-error-500 shadow-lg shadow-error-500/30">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </div>
  );
  return (
    <div className="mx-auto -mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-warning-500 shadow-lg shadow-warning-500/30">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    </div>
  );
}

// ── Confetti canvas ───────────────────────────────────────────────────────────
function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const COLORS = ["#f59e0b","#ef4444","#3b82f6","#10b981","#8b5cf6","#ec4899","#06b6d4"];
    const pieces = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: 6 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: 1.5 + Math.random() * 2.5,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.15,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        ctx.save();
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        p.y += p.speed;
        p.angle += p.spin;
        if (p.y > canvas.height + 10) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function RedeemResultModal({ result, onClose }: Props) {
  if (!result) return null;
  const { status, amount, expiresAt, note } = result;

  const config = {
    success: {
      title: "Nạp ví thành công! 🎉",
      sub:   "Mã quà tặng đã được kích hoạt thành công!",
      statusLabel: expiresAt
        ? `Giao dịch lúc ${new Date().toLocaleString("vi-VN")}`
        : "Số tiền đã được cộng vào ví",
      labelCls: "text-success-600 dark:text-success-400",
      statusBadge: "Thành công",
      badgeCls: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
      desc: "Cảm ơn bạn! Số tiền đã được cộng vào ví ngay lập tức.",
    },
    failed: {
      title: "Nạp ví thất bại",
      sub:   "Mã quà tặng không hợp lệ hoặc đã được sử dụng",
      statusLabel: "Giao dịch không thành công",
      labelCls: "text-error-500 line-through",
      statusBadge: "Thất bại",
      badgeCls: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
      desc: "Vui lòng kiểm tra lại mã và thử lại. Nếu cần hỗ trợ, liên hệ admin.",
    },
    pending: {
      title: "Đang xử lý...",
      sub:   "Giao dịch của bạn đang được xử lý",
      statusLabel: "Vui lòng chờ trong giây lát",
      labelCls: "text-warning-600 dark:text-warning-400",
      statusBadge: "Đang xử lý",
      badgeCls: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
      desc: "Đừng lo! Giao dịch sẽ hoàn tất sớm và tiền sẽ vào ví ngay.",
    },
  }[status];

  // Auto close on success after 6s
  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [status, onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Confetti (success only) */}
        {status === "success" && <Confetti />}

        {/* Top colored band */}
        <div className={cn(
          "h-16 w-full",
          status === "success" && "bg-gradient-to-r from-success-400 to-emerald-400",
          status === "failed"  && "bg-gradient-to-r from-error-400 to-red-300",
          status === "pending" && "bg-gradient-to-r from-warning-400 to-amber-300",
        )} />

        {/* Status icon overlapping band */}
        <div className="px-6">
          <StatusIcon status={status} />

          {/* Title */}
          <div className="mt-4 text-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{config.title}</h2>
            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{config.sub}</p>
          </div>

          {/* Gift illustration */}
          <div className={cn(
            "my-5 rounded-2xl p-5",
            status === "success" && "bg-amber-50 dark:bg-amber-500/10",
            status === "failed"  && "bg-red-50 dark:bg-red-500/10",
            status === "pending" && "bg-amber-50 dark:bg-amber-500/10",
          )}>
            <GiftIllustration status={status} />

            {/* Brand + amount */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white text-xs font-bold">L</div>
                <span className="text-theme-xs font-semibold text-gray-600 dark:text-gray-400">LaptopShop</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-300">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
              <span className={cn("text-lg font-extrabold", config.labelCls)}>
                +{formatVND(amount)}
              </span>
            </div>

            {/* Status badge */}
            <div className="mt-3 flex justify-center">
              <span className={cn("rounded-full px-4 py-1 text-theme-xs font-semibold", config.badgeCls)}>
                {config.statusBadge}
              </span>
            </div>
          </div>

          {/* Note / description */}
          <p className="mb-5 text-center text-theme-xs text-gray-500 dark:text-gray-400">
            {note ?? config.desc}
          </p>
        </div>

        {/* Footer button */}
        <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "btn-press w-full rounded-xl py-2.5 text-theme-sm font-semibold text-white transition-all select-none",
              status === "success" && "bg-success-500 hover:bg-success-600 active:bg-success-700",
              status === "failed"  && "bg-error-500 hover:bg-error-600 active:bg-error-700",
              status === "pending" && "bg-warning-500 hover:bg-warning-600 active:bg-warning-700",
            )}
          >
            {status === "success" ? "Tuyệt vời!" : status === "failed" ? "Thử lại" : "Đã hiểu"}
          </button>
        </div>

        {/* Close X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-gray-500 hover:bg-white hover:text-gray-700 dark:bg-gray-800/80 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
