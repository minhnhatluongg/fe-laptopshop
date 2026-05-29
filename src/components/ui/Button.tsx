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
    "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
  outline:
    "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5",
  ghost:
    "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
  danger:
    "bg-error-500 text-white shadow-theme-xs hover:bg-error-600 disabled:bg-error-300",
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
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed",
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
