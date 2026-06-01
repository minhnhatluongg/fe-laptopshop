import { useEffect, useState } from "react";
import { walletApi, type WalletRedeemCodeDto } from "@/api/wallet.api";
import { useToast } from "@/context/ToastContext";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin / Wallet Codes — generate hàng loạt mã quà tặng nạp ví
 *
 *  - Mỗi code = 1 lần dùng, mệnh giá cố định.
 *  - User nhập code ở tab "Ví" → cộng tiền + log transaction.
 *  - Sandbox: dùng để demo / promotion / refund nhanh trước khi tích hợp
 *    cổng thanh toán thật (VNPay, Momo...).
 * ────────────────────────────────────────────────────────────────────────── */
export default function AdminWalletCodesPage() {
  const toast = useToast();
  const [codes, setCodes]     = useState<WalletRedeemCodeDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [amount, setAmount]         = useState("100000");
  const [count, setCount]           = useState("5");
  const [note, setNote]             = useState("");
  const [expireDays, setExpireDays] = useState("30");
  const [creating, setCreating]     = useState(false);

  const load = async () => {
    setLoading(true);
    try { setCodes(await walletApi.listCodes(1, 100)); }
    catch (e) { toast.error("Không tải được", (e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const fmt = (v: number) => v.toLocaleString("vi-VN") + " ₫";
  const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleString("vi-VN") : "—";

  const generate = async () => {
    const amt = Number(amount); const cnt = Number(count);
    if (!amt || amt <= 0) { toast.warning("Mệnh giá > 0"); return; }
    if (!cnt || cnt < 1 || cnt > 200) { toast.warning("Số lượng 1..200"); return; }
    setCreating(true);
    try {
      const created = await walletApi.generateCodes({
        amount: amt,
        count: cnt,
        note: note.trim() || undefined,
        expireInDays: Number(expireDays) || undefined,
      });
      toast.success(`Đã tạo ${created.length} mã`, `Mệnh giá ${fmt(amt)}`);
      void load();
    } catch (e) { toast.error("Tạo mã thất bại", (e as Error).message); }
    finally { setCreating(false); }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Đã copy", code);
    } catch {
      toast.info("Copy thủ công", code);
    }
  };

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold">Mã quà tặng (Redeem Codes)</h1>
        <p className="text-theme-sm text-gray-500">
          Admin generate mã → user nhập ở tab Ví của tôi để cộng tiền vào ví.
        </p>
      </div>

      {/* Generate form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold">Generate mã mới</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-theme-xs font-medium text-gray-500">Mệnh giá (đ)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <div>
            <label className="text-theme-xs font-medium text-gray-500">Số lượng</label>
            <input type="number" value={count} onChange={(e) => setCount(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <div>
            <label className="text-theme-xs font-medium text-gray-500">Hạn (ngày)</label>
            <input type="number" value={expireDays} onChange={(e) => setExpireDays(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <div>
            <label className="text-theme-xs font-medium text-gray-500">Ghi chú</label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Vd: Khuyến mãi tháng 12"
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
          </div>
        </div>
        <button onClick={() => void generate()} disabled={creating}
          className="mt-4 h-10 rounded-lg bg-brand-500 px-5 text-theme-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
          {creating ? "Đang tạo..." : "🎁 Generate"}
        </button>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h2 className="font-semibold">Danh sách mã ({codes.length})</h2>
          <button onClick={() => void load()} className="text-theme-xs text-brand-500 hover:underline">↻ Refresh</button>
        </div>
        <table className="w-full text-theme-sm">
          <thead className="bg-gray-50 text-left text-theme-xs uppercase text-gray-500 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Mệnh giá</th>
              <th className="px-4 py-3">Tạo lúc</th>
              <th className="px-4 py-3">Hết hạn</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Đã dùng bởi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : codes.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Chưa có mã nào</td></tr>
            ) : codes.map((c) => (
              <tr key={c.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3">
                  <button onClick={() => void copy(c.code)}
                    className="font-mono text-brand-600 hover:underline" title="Click để copy">
                    {c.code}
                  </button>
                </td>
                <td className="px-4 py-3 font-semibold">{fmt(c.amount)}</td>
                <td className="px-4 py-3 text-gray-500">{fmtDate(c.createdAt)}</td>
                <td className="px-4 py-3 text-gray-500">{c.expiresAt ? fmtDate(c.expiresAt) : "—"}</td>
                <td className="px-4 py-3">
                  {c.isUsed ? <span className="rounded bg-gray-100 px-2 py-0.5 text-theme-xs dark:bg-gray-800">Đã dùng</span>
                    : c.isExpired ? <span className="rounded bg-error-50 px-2 py-0.5 text-theme-xs text-error-600">Hết hạn</span>
                    : <span className="rounded bg-success-50 px-2 py-0.5 text-theme-xs text-success-600">Còn hiệu lực</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{c.usedByUserName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
