import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

export function Card({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={cn("mb-5 flex items-start justify-between gap-4", className)}>
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
