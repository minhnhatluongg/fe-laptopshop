import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";

/* ──────────────────────────────────────────────────────────────────────────
 * AuthShell — split-screen layout dùng chung cho Đăng nhập / Đăng ký.
 *   Trái: brand panel (ẩn trên mobile) — gradient mềm + value props.
 *   Phải: vùng form, có logo nhỏ cho mobile.
 * ────────────────────────────────────────────────────────────────────────── */

function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", className)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M2 20h20" />
      </svg>
    </span>
  );
}

function MiniLogo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2">
      <LogoMark className="bg-brand-500 text-white" />
      <span className="text-lg font-bold text-gray-900 dark:text-white">LaptopShop</span>
    </Link>
  );
}

const VALUE_PROPS: { icon: ReactNode; text: string }[] = [
  {
    text: "Hàng chính hãng, bảo hành tận tâm",
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  {
    text: "Tích điểm thành viên và ưu đãi riêng",
    icon: <><path d="M20 12v10H4V12" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></>,
  },
  {
    text: "Giao nhanh toàn quốc, đổi trả trong 7 ngày",
    icon: <><path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>,
  },
];

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      {/* Soft ambient depth — không phải neon, chỉ là khối sáng mờ tạo chiều sâu */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />

      <Link to="/" className="relative inline-flex items-center gap-2.5">
        <LogoMark className="bg-white/15 text-white ring-1 ring-inset ring-white/20" />
        <span className="text-lg font-bold">LaptopShop</span>
      </Link>

      <div className="relative">
        <h2 className="font-outfit text-3xl font-bold leading-tight tracking-tight">
          Mua laptop chính hãng,<br />trải nghiệm trọn vẹn.
        </h2>
        <p className="mt-3 max-w-sm text-theme-sm leading-relaxed text-white/70">
          Tài khoản LaptopShop giúp bạn theo dõi đơn hàng, tích điểm và nhận ưu đãi dành riêng cho thành viên.
        </p>

        <ul className="mt-8 space-y-4">
          {VALUE_PROPS.map((vp) => (
            <li key={vp.text} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  {vp.icon}
                </svg>
              </span>
              <span className="text-theme-sm text-white/90">{vp.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-theme-xs text-white/50">
        © {"2026"} LaptopShop. Bảo hành chính hãng, hỗ trợ trọn đời.
      </p>
    </aside>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <BrandPanel />
      <main className="flex items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <MiniLogo />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * AuthInput — input có icon trái, toggle hiện/ẩn mật khẩu, error + hint.
 * ────────────────────────────────────────────────────────────────────────── */
export function AuthInput({
  icon, label, type = "text", value, onChange, placeholder, required,
  error, hint, autoComplete, name,
}: {
  icon: ReactNode;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: ReactNode;
  hint?: ReactNode;
  autoComplete?: string;
  name?: string;
}) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPw ? "text" : "password") : type;

  return (
    <div>
      <label className="block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
        {label}{required && <span className="ml-0.5 text-error-500">*</span>}
      </label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </span>
        <input
          type={inputType}
          name={name}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-11 w-full rounded-xl border bg-white pl-10 text-theme-sm text-gray-800 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-4 dark:bg-gray-900 dark:text-gray-200",
            isPassword ? "pr-10" : "pr-3",
            error
              ? "border-error-400 focus:border-error-400 focus:ring-error-500/10"
              : "border-gray-200 focus:border-brand-400 focus:ring-brand-500/10 dark:border-gray-800",
          )}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300">
            {showPw ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        )}
      </div>
      {error ? <p className="mt-1 text-theme-xs text-error-500">{error}</p>
        : hint ? <div className="mt-1.5">{hint}</div> : null}
    </div>
  );
}

/* ── Shared auth icons (stroke 1.75, đồng bộ toàn trang) ── */
const ico = (children: ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
export const AuthIcons = {
  user:  () => ico(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  email: () => ico(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>),
  phone: () => ico(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />),
  lock:  () => ico(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>),
  key:   () => ico(<><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" /></>),
};
