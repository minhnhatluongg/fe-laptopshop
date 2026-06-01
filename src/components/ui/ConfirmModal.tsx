import { useEffect, useRef, useState, useCallback, createContext, useContext } from "react";
import { cn } from "@/utils/cn";

// ── Types ─────────────────────────────────────────────────────────────────────
export type ConfirmVariant = "danger" | "warning" | "info" | "success";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

// ── Icon per variant ──────────────────────────────────────────────────────────
function VariantIcon({ variant }: { variant: ConfirmVariant }) {
  const cls = {
    danger:  "bg-error-50 dark:bg-error-500/15",
    warning: "bg-warning-50 dark:bg-warning-500/15",
    info:    "bg-blue-50 dark:bg-blue-500/15",
    success: "bg-success-50 dark:bg-success-500/15",
  }[variant];

  const icon = {
    danger: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-error-500">
        <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
      </svg>
    ),
    warning: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning-500">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    info: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    success: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success-500">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  }[variant];

  return (
    <div className={cn("mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full", cls)}>
      {icon}
    </div>
  );
}

// ── Modal UI ──────────────────────────────────────────────────────────────────
interface ModalProps extends ConfirmOptions {
  onConfirm: () => void;
  onCancel:  () => void;
}

function ConfirmModalUI({
  title, message, confirmLabel = "Xác nhận", cancelLabel = "Huỷ",
  variant = "danger", onConfirm, onCancel,
}: ModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm on open
  useEffect(() => { confirmRef.current?.focus(); }, []);

  // ESC to cancel
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onCancel]);

  const confirmBtnCls = {
    danger:  "bg-error-500 hover:bg-error-600 active:bg-error-700 text-white",
    warning: "bg-warning-500 hover:bg-warning-600 active:bg-warning-700 text-white",
    info:    "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white",
    success: "bg-success-500 hover:bg-success-600 active:bg-success-700 text-white",
  }[variant];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Close X */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Body */}
        <div className="px-6 pb-2 pt-8 text-center">
          <VariantIcon variant={variant} />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
          {message && (
            <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6 pt-5">
          <button
            type="button"
            onClick={onCancel}
            className="btn-press flex-1 rounded-xl border border-gray-200 py-2.5 text-theme-sm font-medium text-gray-700 transition-all hover:bg-gray-50 active:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5 select-none"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={cn(
              "btn-press flex-1 rounded-xl py-2.5 text-theme-sm font-semibold shadow-sm transition-all select-none",
              confirmBtnCls,
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Context + Provider ────────────────────────────────────────────────────────
interface ConfirmCtx {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<ConfirmCtx | undefined>(undefined);

interface State { opts: ConfirmOptions; resolve: (v: boolean) => void; }

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> =>
    new Promise(resolve => setState({ opts, resolve }))
  , []);

  const handleConfirm = () => { state?.resolve(true);  setState(null); };
  const handleCancel  = () => { state?.resolve(false); setState(null); };

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      {state && (
        <ConfirmModalUI
          {...state.opts}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx.confirm;
}
