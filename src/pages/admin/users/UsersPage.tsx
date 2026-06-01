import { useEffect, useRef, useState } from "react";
import { userApi } from "@/api/user.api";
import { roleApi } from "@/api/role.api";
import { walletApi } from "@/api/wallet.api";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/utils/cn";
import type { Role, User, WalletDto } from "@/api/types";

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
// ── Role config — dot color + badge style dùng inline style để tránh Tailwind purge ──
interface RoleCfg { dot: string; badge: string; badgeDark: string; }
const ROLE_CFG: Record<string, RoleCfg> = {
  SUPER_ADMIN: { dot: "#ef4444", badge: "background:#fee2e2;color:#b91c1c",  badgeDark: "background:rgba(239,68,68,.18);color:#fca5a5" },
  ADMIN:       { dot: "#a855f7", badge: "background:#f3e8ff;color:#7e22ce",  badgeDark: "background:rgba(168,85,247,.18);color:#d8b4fe" },
  MANAGER:     { dot: "#3b82f6", badge: "background:#dbeafe;color:#1d4ed8",  badgeDark: "background:rgba(59,130,246,.18);color:#93c5fd" },
  SALES:       { dot: "#06b6d4", badge: "background:#cffafe;color:#0e7490",  badgeDark: "background:rgba(6,182,212,.18);color:#67e8f9"  },
  WAREHOUSE:   { dot: "#f97316", badge: "background:#ffedd5;color:#c2410c",  badgeDark: "background:rgba(249,115,22,.18);color:#fdba74" },
  SUPPORT:     { dot: "#eab308", badge: "background:#fef9c3;color:#854d0e",  badgeDark: "background:rgba(234,179,8,.18);color:#fde047"  },
  MODERATOR:   { dot: "#6366f1", badge: "background:#e0e7ff;color:#3730a3",  badgeDark: "background:rgba(99,102,241,.18);color:#a5b4fc" },
  VIP:         { dot: "#f59e0b", badge: "background:#fef3c7;color:#92400e",  badgeDark: "background:rgba(245,158,11,.18);color:#fcd34d" },
  PARTNER:     { dot: "#14b8a6", badge: "background:#ccfbf1;color:#115e59",  badgeDark: "background:rgba(20,184,166,.18);color:#5eead4" },
  CUSTOMER:    { dot: "#9ca3af", badge: "background:#f3f4f6;color:#4b5563",  badgeDark: "background:rgba(156,163,175,.18);color:#9ca3af" },
};
function getRoleCfg(code: string): RoleCfg {
  return ROLE_CFG[code.toUpperCase().replace(/\s+/g,"_")] ?? ROLE_CFG.CUSTOMER;
}

// ── Inline role selector ──────────────────────────────────────────────────────
function RoleSelector({ user, roles, onChanged }: {
  user: User; roles: Role[]; onChanged: () => void;
}) {
  const toast = useToast();
  const [open, setOpen]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const [pos, setPos]     = useState({ top: 0, left: 0 });
  const btnRef            = useRef<HTMLButtonElement>(null);
  const dropRef           = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const openDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: r.left });
    setOpen(true);
  };

  const changeRole = async (role: Role, e: React.MouseEvent) => {
    e.stopPropagation();
    if (role.id === user.roleId) { setOpen(false); return; }
    setBusy(true);
    setOpen(false);
    try {
      await userApi.update(user.id, { roleId: role.id });
      toast.success(`Đã đổi → ${role.name}`, user.email);
      onChanged();
    } catch (err) {
      toast.error("Đổi role thất bại", (err as Error).message);
    } finally { setBusy(false); }
  };

  const code = (user.role?.code ?? user.roleName ?? "CUSTOMER").toUpperCase().replace(/\s+/g,"_");
  const cfg  = getRoleCfg(code);

  return (
    <>
      {/* Badge button */}
      <button
        ref={btnRef}
        type="button"
        disabled={busy}
        onClick={openDropdown}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-theme-xs font-semibold cursor-pointer hover:opacity-75 transition-opacity"
        style={{ background: cfg.badge.split(";")[0].replace("background:","").trim(),
                 color: cfg.badge.split(";")[1].replace("color:","").trim() }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: cfg.dot }} />
        {user.roleName ?? `Role#${user.roleId}`}
        {busy
          ? <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
        }
      </button>

      {/* Dropdown — fixed to escape overflow:hidden */}
      {open && (
        <div
          ref={dropRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-48 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
          onClick={e => e.stopPropagation()}
        >
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <p className="text-theme-xs font-semibold text-gray-500">Chọn vai trò</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {roles.map(r => {
              const rc  = (r.code ?? r.name ?? "").toUpperCase().replace(/\s+/g,"_");
              const rcfg = getRoleCfg(rc);
              const isCurrent = r.id === user.roleId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={e => void changeRole(r, e)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                    isCurrent ? "bg-gray-50 dark:bg-white/5" : "hover:bg-gray-50 dark:hover:bg-white/5",
                  )}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: rcfg.dot }} />
                  <span className="flex-1 text-theme-xs font-medium text-gray-700 dark:text-gray-300">
                    {r.name}
                  </span>
                  {isCurrent && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500 shrink-0">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers]     = useState<User[]>([]);
  const [roles, setRoles]     = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState<User | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const [list, roleList] = await Promise.allSettled([
        userApi.getAll(),
        roleApi.getAll(),
      ]);
      if (list.status === "fulfilled") setUsers(list.value);
      if (roleList.status === "fulfilled") setRoles(roleList.value);
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
                  <RoleSelector user={u} roles={roles} onChanged={reload} />
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
