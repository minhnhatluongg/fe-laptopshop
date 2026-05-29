import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/utils/cn";

const fieldBase =
  "w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm text-gray-800 placeholder:text-gray-400 transition focus:border-brand-400 focus:outline-none disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:disabled:bg-gray-800";

const inputHeight = "h-11";

/* ---------- Field wrapper ---------- */
interface FieldProps {
  label?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Field({ label, required, hint, error, className, children }: FieldProps) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="ml-1 text-error-500">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-theme-xs text-error-500">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-theme-xs text-gray-500 dark:text-gray-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/* ---------- Input ---------- */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={cn(fieldBase, inputHeight, className)} {...rest} />
  ),
);
Input.displayName = "Input";

/* ---------- Textarea ---------- */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 4, ...rest }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(fieldBase, "py-2.5 leading-relaxed", className)}
    {...rest}
  />
));
Textarea.displayName = "Textarea";

/* ---------- Select ---------- */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...rest }, ref) => (
  <select ref={ref} className={cn(fieldBase, inputHeight, "pr-8", className)} {...rest} />
));
Select.displayName = "Select";

/* ---------- Switch ---------- */
interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, hint, disabled }: SwitchProps) {
  return (
    <label
      className={cn(
        "flex items-start gap-3",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-700",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
      {(label || hint) && (
        <div>
          {label && (
            <div className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </div>
          )}
          {hint && (
            <div className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
              {hint}
            </div>
          )}
        </div>
      )}
    </label>
  );
}
