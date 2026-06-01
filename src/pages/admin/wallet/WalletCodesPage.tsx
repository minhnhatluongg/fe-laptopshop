import { useEffect, useState } from "react";
import { Trash2, RefreshCw, Copy, CheckSquare, Square, MinusSquare } from "lucide-react";
import { walletApi, type WalletRedeemCodeDto } from "@/api/wallet.api";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { cn } from "@/utils/cn";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin / Wallet Codes — generate + filter + delete + bulk action
 * ────────────────────────────────────────────────────────────────────────── */

const STATUS_OPTIONS = [
  { value: "",        label: "Tất cả" },
  { value: "active",  label: "Còn hiệu lực" },
  { value: "used",    label: "Đã dùng" },
  { value: "expired", label: "Hết hạn" },
];

const AMOUNT_PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];

export default function AdminWalletCodesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [codes, setCodes]     = useState<WalletRedeemCodeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // Generate form
  const [amount, setAmount]         = useState("100000");
  const [count, setCount]           = useState("5");
  const [note, setNote]             = useState("");
  const [expireDays, setExpireDays] = useState("30");
  const [creating, setCreating]     = useState(false);

  // Filters
  const [status, setStatus]       = useState("");
  const [minAmt, setMinAmt]       = useState("");
  const [maxAmt, setMaxAmt]       = useState("");
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState("");

  const load = async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = {
        pageNumber: 1, pageSize: 200,
        status: status || undefined,
        minAmount: minAmt ? Number(minAmt) : undefined,
        maxAmount: maxAmt ? Number(maxAmt) : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      };
      setCodes(await walletApi.listCodes(params));
    } catch (e) { toast.error("Không tải được", (e as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (v: number) => v.toLocaleString("vi-VN") + " ₫";
  const fmtDate = (s?: string | null) => s ? new Date(s).toLocaleString("vi-VN") : "—";

  // ── Generate ────────────────────────────────────────────────────────────
  const generate = async () => {
    const amt = Number(amount); const cnt = Number(count);
    if (!amt || amt <= 0) { toast.warning("Mệnh giá > 0"); return; }
    if (!cnt || cnt < 1 || cnt > 200) { toast.warning("Số lượng 1..200"); return; }
    setCreating(true);
    try {
      const created = await walletApi.generateCodes({ amount: amt, count: cnt,
        note: note.trim() || undefined, expireInDays: Number(expireDays) || undefined });
      toast.success(`Đã tạo ${created.length} mã`, `Mệnh giá ${fmt(amt)}`);
      void load();
    } catch (e) { toast.error("Tạo mã thất bại", (e as Error).message); }
    finally { setCreating(false); }
  };

  // ── Copy ────────────────────────────────────────────────────────────────
  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); toast.success("Đã copy", code); }
    catch { toast.info("Copy thủ công", code); }
  };

  // ── Select ──────────────────────────────────────────────────────────────
  const toggleOne = (id: number) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const deletableIds = codes.filter(c => !c.isUsed).map(c => c.id);
  const allDeletableSelected = deletableIds.length > 0 && deletableIds.every(id => selected.has(id));
  const someDeletableSelected = deletableIds.some(id => selected.has(id));

  const toggleAll = () => {
    if (allDeletableSelected) setSelected(new Set());
    else setSelected(new Set(deletableIds));
  };

  // ── Delete single ───────────────────────────────────────────────────────
  const deleteOne = async (c: WalletRedeemCodeDto) => {
    if (c.isUsed) { toast.warning("Không thể xoá mã đã dùng"); return; }
    if (!await confirm({ title: `Xoá mã ${c.code}?`, message: "Mã chưa sử dụng sẽ bị xoá vĩnh viễn.", variant: "danger", confirmLabel: "Xoá mã", cancelLabel: "Huỷ" })) return;
    try {
      await walletApi.deleteCode(c.id);
      toast.success("Đã xoá", c.code);
      void load();
    } catch (e) { toast.error("Xoá thất bại", (e as Error).message); }
  };

  // ── Bulk delete ─────────────────────────────────────────────────────────
  const bulkDelete = async () => {
    const ids = Array.from(selected).filter(id => {
      const c = codes.find(x => x.id === id);
      return c && !c.isUsed;
    });
    if (ids.length === 0) { toast.warning("Không có mã hợp lệ để xoá (chỉ xoá được mã chưa dùng)"); return; }
    if (!await confirm({ title: `Xoá ${ids.length} mã?`, message: "Chỉ xoá được mã chưa sử dụng. Hành động không thể hoàn tác.", variant: "danger", confirmLabel: "Xoá mã", cancelLabel: "Huỷ" })) return;
    setDeleting(true);
    try {
      const res = await walletApi.bulkDeleteCodes(ids);
      toast.success(`Đã xoá ${(res as { deleted: number }).deleted} mã`);
      void load();
    } catch (e) { toast.error("Xoá thất bại", (e as Error).message); }
    finally { setDeleting(false); }
  };

  const inputCls = "h-9 rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 focus:border-brand-400 focus:outline-none";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-title-sm font-bold text-gray-900 dark:text-white">Mã quà tặng (Redeem Codes)</h1>
        <p className="text-theme-sm text-gray-500">Admin generate mã — user nhập ở tab Ví để cộng tiền vào ví.</p>
      </div>

      {/* ── Generate form ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Generate mã mới</h2>

        {/* Amount presets */}
        <div className="mb-3 flex flex-wrap gap-2">
          {AMOUNT_PRESETS.map(v => (
            <button key={v} type="button" onClick={() => setAmount(String(v))}
              className={cn(
                "btn-press rounded-lg border px-3 py-1 text-theme-xs font-medium transition-all",
                Number(amount) === v
                  ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                  : "border-gray-200 text-gray-500 hover:border-brand-300 dark:border-gray-700 dark:text-gray-400",
              )}>
              {v.toLocaleString("vi-VN")}đ
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-theme-xs font-medium text-gray-500">Mệnh giá (đ)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className={cn(inputCls, "w-full")} />
          </div>
          <div>
            <label className="mb-1 block text-theme-xs font-medium text-gray-500">Số lượng</label>
            <input type="number" min="1" max="200" value={count} onChange={e => setCount(e.target.value)}
              className={cn(inputCls, "w-full")} />
          </div>
          <div>
            <label className="mb-1 block text-theme-xs font-medium text-gray-500">Hạn (ngày)</label>
            <input type="number" min="1" value={expireDays} onChange={e => setExpireDays(e.target.value)}
              className={cn(inputCls, "w-full")} />
          </div>
          <div>
            <label className="mb-1 block text-theme-xs font-medium text-gray-500">Ghi chú</label>
            <input value={note} onChange={e => setNote(e.target.value)}
              placeholder="Vd: Khuyến mãi tháng 6"
              className={cn(inputCls, "w-full")} />
          </div>
        </div>
        <button onClick={() => void generate()} disabled={creating}
          className="btn-press mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-5 text-theme-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-brand-500/30 hover:shadow-md active:bg-brand-700 disabled:opacity-50 select-none">
          {creating ? (
            <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>Đang tạo...</>
          ) : "🎁 Generate"}
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <label className="mb-1 block text-theme-xs font-medium text-gray-500">Trạng thái</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className={cn(inputCls, "w-36")}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-theme-xs font-medium text-gray-500">Từ ngày</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className={cn(inputCls, "w-36")} />
        </div>
        <div>
          <label className="mb-1 block text-theme-xs font-medium text-gray-500">Đến ngày</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className={cn(inputCls, "w-36")} />
        </div>
        <div>
          <label className="mb-1 block text-theme-xs font-medium text-gray-500">Mệnh giá từ</label>
          <input type="number" value={minAmt} onChange={e => setMinAmt(e.target.value)}
            placeholder="0" className={cn(inputCls, "w-28")} />
        </div>
        <div>
          <label className="mb-1 block text-theme-xs font-medium text-gray-500">đến</label>
          <input type="number" value={maxAmt} onChange={e => setMaxAmt(e.target.value)}
            placeholder="∞" className={cn(inputCls, "w-28")} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()}
            className="btn-press inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-4 text-theme-sm font-medium text-white transition-all hover:bg-brand-600 select-none">
            <RefreshCw size={13} /> Lọc
          </button>
          <button onClick={() => { setStatus(""); setMinAmt(""); setMaxAmt(""); setFromDate(""); setToDate(""); setTimeout(() => void load(), 50); }}
            className="btn-press h-9 rounded-lg border border-gray-200 px-3 text-theme-sm text-gray-500 transition-all hover:bg-gray-50 dark:border-gray-700 select-none">
            Reset
          </button>
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-2.5 dark:border-error-500/30 dark:bg-error-500/10">
          <span className="text-theme-sm font-medium text-error-700 dark:text-error-300">
            Đã chọn {selected.size} mã
          </span>
          <button onClick={() => void bulkDelete()} disabled={deleting}
            className="btn-press inline-flex h-8 items-center gap-1.5 rounded-lg bg-error-500 px-3 text-theme-xs font-semibold text-white transition-all hover:bg-error-600 disabled:opacity-50 select-none">
            <Trash2 size={13} />
            {deleting ? "Đang xoá..." : `Xoá ${selected.size} mã`}
          </button>
          <button onClick={() => setSelected(new Set())}
            className="text-theme-xs text-error-500 hover:underline">
            Bỏ chọn
          </button>
          <span className="text-theme-xs text-error-400">* Chỉ xoá được mã chưa sử dụng</span>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Danh sách mã ({codes.length})
          </h2>
          <button onClick={() => void load()}
            className="inline-flex items-center gap-1 text-theme-xs text-brand-500 hover:text-brand-600 transition-colors">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        <table className="w-full text-theme-sm">
          <thead className="bg-gray-50 text-left text-theme-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 w-10">
                <button type="button" onClick={toggleAll}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  {allDeletableSelected
                    ? <CheckSquare size={16} className="text-brand-500" />
                    : someDeletableSelected
                    ? <MinusSquare size={16} className="text-brand-400" />
                    : <Square size={16} />}
                </button>
              </th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Mệnh giá</th>
              <th className="px-4 py-3">Tạo lúc</th>
              <th className="px-4 py-3">Hết hạn</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Đã dùng bởi</th>
              <th className="px-4 py-3 text-right w-16"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Đang tải...
                </div>
              </td></tr>
            ) : codes.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">Không có mã nào</td></tr>
            ) : codes.map((c) => {
              const isSelected = selected.has(c.id);
              const canDelete = !c.isUsed;
              return (
                <tr key={c.id}
                  className={cn(
                    "border-t border-gray-100 transition-colors dark:border-gray-800",
                    isSelected && "bg-brand-50/40 dark:bg-brand-500/5",
                  )}>
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    {canDelete ? (
                      <button type="button" onClick={() => toggleOne(c.id)}
                        className="text-gray-400 hover:text-brand-500 transition-colors">
                        {isSelected
                          ? <CheckSquare size={16} className="text-brand-500" />
                          : <Square size={16} />}
                      </button>
                    ) : (
                      <Square size={16} className="text-gray-200 dark:text-gray-700" />
                    )}
                  </td>

                  {/* Code */}
                  <td className="px-4 py-3">
                    <button onClick={() => void copy(c.code)}
                      className="group inline-flex items-center gap-1.5 font-mono text-brand-600 hover:text-brand-700 dark:text-brand-400">
                      {c.code}
                      <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    {c.note && <p className="mt-0.5 text-theme-xs italic text-gray-400">{c.note}</p>}
                  </td>

                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{fmt(c.amount)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(c.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{c.expiresAt ? fmtDate(c.expiresAt) : "—"}</td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {c.isUsed
                      ? <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-theme-xs font-medium text-gray-500 dark:bg-gray-800">Đã dùng</span>
                      : c.isExpired
                      ? <span className="rounded-full bg-error-50 px-2.5 py-0.5 text-theme-xs font-medium text-error-600 dark:bg-error-500/15 dark:text-error-400">Hết hạn</span>
                      : <span className="rounded-full bg-success-50 px-2.5 py-0.5 text-theme-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-400">Còn hiệu lực</span>
                    }
                  </td>

                  <td className="px-4 py-3 text-gray-500">{c.usedByUserName ?? "—"}</td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    {canDelete && (
                      <button type="button" onClick={() => void deleteOne(c)}
                        title="Xoá mã"
                        className="btn-press rounded-lg p-1.5 text-gray-400 transition-all hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
