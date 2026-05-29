import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Table({
  className,
  ...rest
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table
        className={cn("min-w-full divide-y divide-gray-100 dark:divide-gray-800", className)}
        {...rest}
      />
    </div>
  );
}

export function TableHeader(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}

export function TableBody({
  className,
  ...rest
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("divide-y divide-gray-100 dark:divide-gray-800", className)}
      {...rest}
    />
  );
}

export function TableRow(props: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} />;
}

export function TableHead({
  className,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-5 py-3 text-left text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400",
        className,
      )}
      {...rest}
    />
  );
}

export function TableCell({
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-5 py-4 text-theme-sm text-gray-700 dark:text-gray-300",
        className,
      )}
      {...rest}
    />
  );
}
