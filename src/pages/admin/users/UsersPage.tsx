import { useEffect, useState } from "react";
import { userApi } from "@/api/user.api";
import { walletApi } from "@/api/wallet.api";
import { useToast } from "@/context/ToastContext";
import type { User, WalletDto } from "@/api/types";

/* ──────────────────────────────────────────────────────────────────────────
 * Admin / Users — quản lý người dùng + thao tác ví
 *
 * Tính năng:
 *  - List users (search by email/tên)
 *  - Khoá / mở khoá account (changeStatus)
 *  - Xem chi tiết ví user + nạp tiền trực tiếp (TopUp)
 *  - Điều chỉnh số dư (Adjust ± với lý do)
 *  - Khoá / mở khoá ví
 *
 * Nghiệp vụ:
 *  - Nạp trực tiếp: dùng cho support / khuyến mãi đặc biệt.
 *  - Generate Redeem Code: dùng cho campaign hàng loạt (xem trang Wallet Codes).
 * ────────────────────────────────────────────────────────────────────────── */
export default function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState<User | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const list = await userApi.getAll();
      setUsers(list);
    } catch (e) {
      toast.error("Không tải được danh sách", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (u.email ?? "").toLowerCase().includes(s) ||
      (u.firstName ?? "").toLowerCase().includes(s) ||
      (u.lastName ?? "").toLowerCase().includes(s) ||
      (u.phone ?? "").includes(s)
    );
  });

  const toggleActive = async (u: User) => {
    try {
      await userApi.changeStatus(u.id, !u.isActive);
      toast.success(u.isActive ? "Đã khoá tài khoản" : "Đã mở khoá tài khoản");
      void reload();
    } catch (e) {
      toast.error("Thao tác thất bại", (e as Error).message);
    }
  };

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
          <p className="text-theme-sm text-gray-500">Tổng {users.length} tài khoản · Click "Ví" để thao tác số dư</p>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo email / tên / SĐT..."
          className="h-10 w-72 rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-theme-sm">
          <thead className="bg-gray-50 text-left text-theme-xs uppercase text-gray-500 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">SĐT</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">Không có user nào</td></tr>
            ) : filtered.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 text-gray-500">{u.id}</td>
                <td className="px-4 py-3 font-medium">{`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{u.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-theme-xs dark:bg-gray-800">
                    {u.roleName ?? `Role#${u.roleId}`}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="rounded bg-success-50 px-2 py-0.5 text-theme-xs text-success-600">Active</span>
                  ) : (
                    <span className="rounded bg-error-50 px-2 py-0.5 text-theme-xs text-error-600">Locked</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setSelected(u)}
                    className="rounded-lg border border-gray-200 px-3 py-1 text-theme-xs hover:border-brand-300 hover:text-brand-500 dark:border-gray-700">
                    Ví
                  </button>
                  <button onClick={() => void toggleActive(u)}
                    className={`ml-2 rounded-lg px-3 py-1 text-theme-xs text-white ${u.isActive ? "bg-error-500 hover:bg-error-600" : "bg-success-500 hover:bg-success-600"}`}>
                    {u.isActive ? "Khoá" : "Mở khoá"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <WalletDrawer user={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

/* ──────── WalletDrawer: panel nạp/điều chỉnh ví user ───────── */
function WalletDrawer({ user, onClose }: { user: User; onClose: () => void }) {
  const toast = useToast();
  const [wallet, setWallet] = useState<WalletDto | null>(null);
  const [topupAmount, setTopupAmount]   = useState("");
  const [topupNote, setTopupNote]       = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote]     = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setWallet(await walletApi.getUserWallet(user.id));
    } catch (e) {
      toast.error("Không tải được ví", (e as Error).message);
    }
  };
  useEffect(() => { void load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (v: number) => v.toLocaleString("vi-VN") + " ₫";

  const onTopup = async () => {
    const amt = Number(topupAmount);
    if (!amt || amt <= 0) { toast.warning("Số tiền > 0"); return; }
    setBusy(true);
    try {
      await walletApi.topUp({ userId: user.id, amount: amt, note: topupNote || undefined });
      toast.success("Đã nạp", `+${fmt(amt)} cho ${user.email}`);
      setTopupAmount(""); setTopupNote("");
      void load();
    } catch (e) { toast.error("Nạp thất bại", (e as Error).message); }
    finally { setBusy(false); }
  };

  const onAdjust = async () => {
    const amt = Number(adjustAmount);
    if (!amt) { toast.warning("Số tiền khác 0"); return; }
    if (!adjustNote.trim()) { toast.warning("Phải có lý do điều chỉnh"); return; }
    setBusy(true);
    try {
      await walletApi.adjust({ userId: user.id, amount: amt, note: adjustNote.trim() });
      toast.success("Đã điều chỉnh", `${amt > 0 ? "+" : ""}${fmt(amt)}`);
      setAdjustAmount(""); setAdjustNote("");
      void load();
    } catch (e) { toast.error("Điều chỉnh thất bại", (e as Error).message); }
    finally { setBusy(false); }
  };

  const onLock = async (isLocked: boolean) => {
    setBusy(true);
    try {
      await walletApi.setLock(user.id, { isLocked, reason: isLocked ? "Admin lock" : undefined });
      toast.success(isLocked ? "Đã khoá ví" : "Đã mở khoá ví");
      void load();
    } catch (e) { toast.error("Thao tác thất bại", (e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Ví của {user.email}</h2>
            <p className="text-theme-xs text-gray-500">{`${user.firstName ?? ""} ${user.lastName ?? ""}`}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-700">×</button>
        </div>

        <div className="mt-5 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 p-5 text-white">
          <p className="text-theme-xs opacity-80">Số dư hiện tại</p>
          <p className="mt-1 text-3xl font-bold">{wallet ? fmt(wallet.balance) : "..."}</p>
          <div className="mt-3 flex gap-4 text-theme-xs opacity-90">
            <span>Tổng nạp: {wallet ? fmt(wallet.lifetimeTopUp) : "—"}</span>
            <span>Tổng chi: {wallet ? fmt(wallet.lifetimeSpent) : "—"}</span>
          </div>
          {wallet?.isLocked && <p className="mt-2 text-theme-xs bg-error-600/40 px-2 py-1 rounded">🔒 Đang khoá: {wallet.lockReason}</p>}
        </div>

        {/* Top-up */}
        <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="font-semibold">Nạp trực tiếp</h3>
          <p className="text-theme-xs text-gray-500">Cộng tiền vào ví — ghi log như giao dịch nạp thật.</p>
          <input value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)}
            type="number" placeholder="Số tiền (đ)"
            className="mt-2 h-9 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
          <input value={topupNote} onChange={(e) => setTopupNote(e.target.value)}
            placeholder="Ghi chú (tuỳ chọn)"
            className="mt-2 h-9 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
          <button onClick={() => void onTopup()} disabled={busy}
            className="mt-2 h-9 w-full rounded-lg bg-brand-500 text-theme-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
            Nạp tiền
          </button>
        </div>

        {/* Adjust */}
        <div className="mt-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <h3 className="font-semibold">Điều chỉnh số dư</h3>
          <p className="text-theme-xs text-gray-500">Số dương = cộng · Số âm = trừ. Phải có lý do.</p>
          <input value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)}
            type="number" placeholder="Số tiền ± (đ)"
            className="mt-2 h-9 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
          <input value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)}
            placeholder="Lý do *"
            className="mt-2 h-9 w-full rounded-lg border border-gray-200 px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-800" />
          <button onClick={() => void onAdjust()} disabled={busy}
            className="mt-2 h-9 w-full rounded-lg bg-warning-500 text-theme-sm font-semibold text-white hover:bg-warning-600 disabled:opacity-50">
            Điều chỉnh
          </button>
        </div>

        {/* Lock */}
        <div className="mt-4 flex gap-2">
          <button onClick={() => void onLock(!wallet?.isLocked)} disabled={busy || !wallet}
            className={`flex-1 h-9 rounded-lg text-theme-sm font-semibold text-white ${wallet?.isLocked ? "bg-success-500 hover:bg-success-600" : "bg-error-500 hover:bg-error-600"} disabled:opacity-50`}>
            {wallet?.isLocked ? "🔓 Mở khoá ví" : "🔒 Khoá ví"}
          </button>
        </div>
      </div>
    </div>
  );
}
