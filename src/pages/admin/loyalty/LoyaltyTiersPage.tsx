import { useEffect, useState } from "react";
import { loyaltyTierApi, type LoyaltyTierDto } from "@/api/loyaltyTier.api";
import { useToast } from "@/context/ToastContext";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin / Loyalty Tiers — chỉnh số tiền target lên hạng + % hoa hồng giảm
 *
 *  - MinSpend: tổng chi tiêu tối thiểu (LifetimeSpend từ các đơn Delivered)
 *  - DiscountPercent: % giảm tự động cho mọi đơn của thành viên hạng đó
 *  - PointsMultiplier: hệ số nhân điểm khi tích lũy
 *
 *  Thay đổi áp dụng NGAY cho các đơn tạo sau đó. Đơn đã tạo không thay đổi.
 * ────────────────────────────────────────────────────────────────────────── */
export default function AdminLoyaltyTiersPage() {
  const toast = useToast();
  const [tiers, setTiers]     = useState<LoyaltyTierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<number, LoyaltyTierDto>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await loyaltyTierApi.getAll();
      setTiers(list);
      setEditing(Object.fromEntries(list.map((t) => [t.id, { ...t }])));
    } catch (e) { toast.error("Không tải được", (e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const fmt = (v: number) => v.toLocaleString("vi-VN") + " ₫";

  const onChange = (id: number, field: keyof LoyaltyTierDto, value: string | boolean) => {
    setEditing((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: typeof value === "boolean" ? value : Number(value) || 0,
      },
    }));
  };

  const onSave = async (id: number) => {
    const dto = editing[id];
    if (!dto) return;
    if (dto.discountPercent < 0 || dto.discountPercent > 100) {
      toast.warning("DiscountPercent phải 0..100"); return;
    }
    if (dto.minSpend < 0) { toast.warning("MinSpend ≥ 0"); return; }
    if (dto.pointsMultiplier <= 0) { toast.warning("PointsMultiplier > 0"); return; }
    setSavingId(id);
    try {
      const updated = await loyaltyTierApi.update(id, {
        name: dto.name,
        minSpend: dto.minSpend,
        discountPercent: dto.discountPercent,
        pointsMultiplier: dto.pointsMultiplier,
        isActive: dto.isActive,
      });
      toast.success("Đã cập nhật", updated.name);
      void load();
    } catch (e) { toast.error("Lưu thất bại", (e as Error).message); }
    finally { setSavingId(null); }
  };

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">Hạng thành viên (Loyalty)</h1>
        <p className="text-theme-sm text-gray-500">
          Chỉnh ngưỡng chi tiêu (MinSpend), % giảm giá tự động & hệ số tích điểm.
          Thay đổi áp dụng cho các đơn tạo sau khi lưu.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-theme-sm">
          <thead className="bg-gray-50 text-left text-theme-xs uppercase text-gray-500 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3">Tên hạng</th>
              <th className="px-4 py-3">MinSpend (đ)</th>
              <th className="px-4 py-3">Giảm % / đơn</th>
              <th className="px-4 py-3">Hệ số điểm</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : tiers.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Chưa có hạng nào — chạy SQL seed LoyaltyTiers</td></tr>
            ) : tiers.map((t) => {
              const e = editing[t.id] ?? t;
              const dirty = JSON.stringify(e) !== JSON.stringify(t);
              return (
                <tr key={t.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3">
                    <input value={e.name} onChange={(ev) => onChange(t.id, "name", ev.target.value)}
                      className="h-9 w-32 rounded border border-gray-200 px-2 dark:border-gray-700 dark:bg-gray-800" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={e.minSpend} onChange={(ev) => onChange(t.id, "minSpend", ev.target.value)}
                      className="h-9 w-40 rounded border border-gray-200 px-2 dark:border-gray-700 dark:bg-gray-800" />
                    <div className="mt-1 text-theme-xs text-gray-400">{fmt(e.minSpend)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <input type="number" step="0.5" value={e.discountPercent}
                        onChange={(ev) => onChange(t.id, "discountPercent", ev.target.value)}
                        className="h-9 w-20 rounded border border-gray-200 px-2 dark:border-gray-700 dark:bg-gray-800" />
                      <span className="text-gray-400">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">×</span>
                      <input type="number" step="0.1" value={e.pointsMultiplier}
                        onChange={(ev) => onChange(t.id, "pointsMultiplier", ev.target.value)}
                        className="h-9 w-20 rounded border border-gray-200 px-2 dark:border-gray-700 dark:bg-gray-800" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex cursor-pointer items-center">
                      <input type="checkbox" checked={e.isActive}
                        onChange={(ev) => onChange(t.id, "isActive", ev.target.checked)}
                        className="h-4 w-4" />
                    </label>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => void onSave(t.id)} disabled={!dirty || savingId === t.id}
                      className="rounded-lg bg-brand-500 px-3 py-1 text-theme-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40">
                      {savingId === t.id ? "Đang lưu..." : dirty ? "Lưu" : "Đã lưu"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-theme-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
        <p><strong>💡 Cách flow hoạt động:</strong></p>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-theme-xs">
          <li><strong>MinSpend</strong>: tổng chi tiêu (tính từ đơn <em>đã giao</em>) tối thiểu để đạt hạng.</li>
          <li><strong>Giảm %</strong>: khi thành viên đặt đơn, hệ thống tự cộng giảm theo subTotal × % này (cộng dồn với coupon).</li>
          <li><strong>Hệ số điểm</strong>: khi đơn Delivered, điểm thưởng = (Total ÷ 1.000) × hệ số.</li>
          <li>User được thông báo khi <em>lên hạng</em> và mỗi lần được cộng điểm.</li>
        </ul>
      </div>
    </div>
  );
}
