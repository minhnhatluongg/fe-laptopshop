import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number; // ms
}

interface ToastApi {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((type: ToastType, title: string, message?: string, duration = 3500) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration + 300); // +300 for exit animation
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const api: ToastApi = {
    success: (t, m) => add("success", t, m),
    error:   (t, m) => add("error",   t, m, 5000),
    warning: (t, m) => add("warning", t, m, 4000),
    info:    (t, m) => add("info",    t, m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

// ─── Toaster display ──────────────────────────────────────────────────────────
const config: Record<ToastType, { icon: string; bar: string; container: string; title: string }> = {
  success: {
    icon: "✓",
    bar: "bg-success-500",
    container: "border-success-200 bg-success-50 dark:border-success-500/30 dark:bg-success-500/10",
    title: "text-success-700 dark:text-success-400",
  },
  error: {
    icon: "✕",
    bar: "bg-error-500",
    container: "border-error-200 bg-error-50 dark:border-error-500/30 dark:bg-error-500/10",
    title: "text-error-700 dark:text-error-400",
  },
  warning: {
    icon: "⚠",
    bar: "bg-warning-500",
    container: "border-warning-200 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/10",
    title: "text-warning-700 dark:text-warning-400",
  },
  info: {
    icon: "ℹ",
    bar: "bg-brand-500",
    container: "border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10",
    title: "text-brand-700 dark:text-brand-400",
  },
};

function Toaster({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed right-4 top-4 z-[9999] flex flex-col gap-2.5">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  );
}

function ToastCard({ toast: t, onClose }: { toast: ToastItem; onClose: (id: string) => void }) {
  const c = config[t.type];
  return (
    <div
      className={cn(
        "relative w-80 overflow-hidden rounded-xl border shadow-theme-lg",
        "animate-in slide-in-from-right-8 fade-in duration-300",
        c.container,
      )}
      role="alert"
    >
      {/* Progress bar */}
      <div
        className={cn("absolute left-0 top-0 h-0.5 w-full origin-left", c.bar)}
        style={{ animation: `shrink ${t.duration}ms linear forwards` }}
      />

      <div className="flex items-start gap-3 p-4">
        <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", c.bar)}>
          {c.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-theme-sm font-semibold", c.title)}>{t.title}</p>
          {t.message && (
            <p className="mt-0.5 text-theme-xs text-gray-600 dark:text-gray-400">{t.message}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onClose(t.id)}
          className="ml-1 shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="Đóng"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
