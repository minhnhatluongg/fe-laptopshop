import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  fullWidth?: boolean;
}

const sizeStyles: Record<Size, string> = {
  sm: "h-9 px-3 text-theme-sm",
  md: "h-11 px-4 text-theme-sm",
  lg: "h-12 px-6 text-base",
};

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-sm hover:bg-brand-600 hover:shadow-brand-500/30 hover:shadow-md active:bg-brand-700 active:shadow-none disabled:bg-brand-300 disabled:shadow-none",
  outline:
    "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 active:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5 dark:active:bg-white/10",
  ghost:
    "text-gray-700 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/5 dark:active:bg-white/10",
  danger:
    "bg-error-500 text-white shadow-sm hover:bg-error-600 hover:shadow-error-500/30 hover:shadow-md active:bg-error-700 active:shadow-none disabled:bg-error-300 disabled:shadow-none",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      startIcon,
      endIcon,
      fullWidth,
      className,
      children,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium select-none",
        "transition-all duration-150 ease-out",
        "active:scale-[0.97]",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {startIcon}
      {children}
      {endIcon}
    </button>
  ),
);
Button.displayName = "Button";
