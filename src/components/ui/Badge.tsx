import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type Color = "primary" | "success" | "error" | "warning" | "info" | "light" | "dark";
type Variant = "light" | "solid";
type Size = "sm" | "md";

interface BadgeProps {
  children: ReactNode;
  color?: Color;
  variant?: Variant;
  size?: Size;
  className?: string;
  startIcon?: ReactNode;
}

const variantColor: Record<Variant, Record<Color, string>> = {
  light: {
    primary: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
    success: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
    error:   "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500",
    warning: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
    info:    "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400",
    light:   "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300",
    dark:    "bg-gray-800 text-white",
  },
  solid: {
    primary: "bg-brand-500 text-white",
    success: "bg-success-500 text-white",
    error:   "bg-error-500 text-white",
    warning: "bg-warning-500 text-white",
    info:    "bg-blue-light-500 text-white",
    light:   "bg-gray-200 text-gray-700",
    dark:    "bg-gray-900 text-white",
  },
};

const sizeStyles: Record<Size, string> = {
  sm: "px-2 py-0.5 text-theme-xs",
  md: "px-2.5 py-1 text-theme-sm",
};

export function Badge({
  children,
  color = "primary",
  variant = "light",
  size = "sm",
  className,
  startIcon,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        sizeStyles[size],
        variantColor[variant][color],
        className,
      )}
    >
      {startIcon}
      {children}
    </span>
  );
}
