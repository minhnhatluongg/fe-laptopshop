import { useState, type ReactNode } from "react";
import type { ChartQueryParams } from "@/api/dashboard.api";
import { cn } from "@/utils/cn";

export interface DatePreset {
  label: string;
  days?: number;        // relative: last N days
  ytd?: boolean;        // year to date
  all?: boolean;        // all time
}

const DEFAULT_PRESETS: DatePreset[] = [
  { label: "7 ngày",    days: 7  },
  { label: "1 tháng",   days: 30 },
  { label: "3 tháng",   days: 90 },
  { label: "6 tháng",   days: 180 },
  { label: "Năm nay",   ytd: true },
  { label: "Tùy chỉnh" },
];

// Utility: ISO date string "YYYY-MM-DD"
const toISO = (d: Date) => d.toISOString().split("T")[0];
const today = () => new Date();
const daysAgo = (n: number) => {
  const d = today();
  d.setDate(d.getDate() - n);
  return d;
};
const startOfYear = () => new Date(today().getFullYear(), 0, 1);

export function presetToRange(p: DatePreset): { from: string; to: string } {
  const to = toISO(today());
  if (p.days)  return { from: toISO(daysAgo(p.days)), to };
  if (p.ytd)   return { from: toISO(startOfYear()), to };
  if (p.all)   return { from: "2020-01-01", to };
  return { from: toISO(daysAgo(30)), to }; // fallback
}

export function defaultFilter(): ChartQueryParams {
  return { from: toISO(daysAgo(30)), to: toISO(today()), groupBy: "auto" };
}

interface Category { id: number; name: string; }

interface Props {
  value: ChartQueryParams;
  onChange: (v: ChartQueryParams) => void;
  categories?: Category[];
  showCategory?: boolean;
  presets?: DatePreset[];
  loading?: boolean;
  children?: ReactNode;
}

export function ChartFilterBar({
  value, onChange, categories = [], showCategory = false,
  presets = DEFAULT_PRESETS, loading, children,
}: Props) {
  const [activePreset, setActivePreset] = useState("1 tháng");
  const [showCustom, setShowCustom]     = useState(false);
  const [customFrom, setCustomFrom]     = useState(value.from ?? "");
  const [customTo, setCustomTo]         = useState(value.to ?? "");

  const applyPreset = (p: DatePreset) => {
    setActivePreset(p.label);
    if (!p.days && !p.ytd && !p.all) {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    const range = presetToRange(p);
    onChange({ ...value, from: range.from, to: range.to, groupBy: "auto" });
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    if (customFrom > customTo) return;
    onChange({ ...value, from: customFrom, to: customTo, groupBy: "auto" });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            disabled={loading}
            className={cn(
              "rounded-lg px-3 py-1.5 text-theme-xs font-medium transition-colors",
              activePreset === p.label
                ? "bg-brand-500 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {showCustom && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 px-2 text-theme-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-brand-400 focus:outline-none"
          />
          <span className="text-theme-xs text-gray-400">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 px-2 text-theme-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-brand-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="h-8 rounded-lg bg-brand-500 px-3 text-theme-xs font-medium text-white hover:bg-brand-600"
          >
            Áp dụng
          </button>
        </div>
      )}

      {/* Category filter */}
      {showCategory && categories.length > 0 && (
        <select
          value={value.categoryId ?? ""}
          onChange={(e) => onChange({ ...value, categoryId: e.target.value ? Number(e.target.value) : undefined })}
          className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-theme-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-brand-400 focus:outline-none"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      {/* Granularity override */}
      <select
        value={value.groupBy ?? "auto"}
        onChange={(e) => onChange({ ...value, groupBy: e.target.value as ChartQueryParams["groupBy"] })}
        className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-theme-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 focus:border-brand-400 focus:outline-none"
      >
        <option value="auto">Tự động</option>
        <option value="day">Theo ngày</option>
        <option value="week">Theo tuần</option>
        <option value="month">Theo tháng</option>
      </select>

      {/* Loading indicator */}
      {loading && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
      )}

      {/* Extra slot */}
      {children}
    </div>
  );
}
