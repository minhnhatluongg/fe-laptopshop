import { useEffect, useState } from "react";
import { walletApi } from "@/api/wallet.api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import type { WalletDto, WalletTransactionDto, WalletTransactionType } from "@/api/types";
import { formatDateTime, formatVND } from "@/utils/format";
import { cn } from "@/utils/cn";

export default function WalletTab() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletDto | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 15;

  useEffect(() => {
    walletApi.getMyWallet()
      .then(setWallet)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTx(1);
  }, []);

  const loadTx = async (p: number) => {
    setTxLoading(true);
    try {
      const data = await walletApi.getMyTransactions(p, PAGE_SIZE);
      if (p === 1) setTransactions(data);
      else setTransactions((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setPage(p);
    } finally {
      setTxLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Balance card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white">
        <div className="relative z-10">
          <p className="text-theme-sm font-medium text-white/70">Số dư ví</p>
          <p className="mt-1 text-title-md font-bold">
            {formatVND(wallet?.balance ?? 0)}
          </p>
          <p className="mt-3 text-theme-xs text-white/60">
            {user?.fullName} · {user?.email}
          </p>

          <div className="mt-4 flex gap-6">
            <div>
              <p className="text-theme-xs text-white/60">Tổng nạp</p>
              <p className="text-theme-sm font-semibold">{formatVND(wallet?.lifetimeTopUp ?? 0)}</p>
            </div>
            <div>
              <p className="text-theme-xs text-white/60">Tổng chi</p>
              <p className="text-theme-sm font-semibold">{formatVND(wallet?.lifetimeSpent ?? 0)}</p>
            </div>
          </div>

          {wallet?.isLocked && (
            <div className="mt-3 rounded-lg bg-error-500/30 px-3 py-1.5 text-theme-xs font-medium">
              🔒 Ví đang bị khoá: {wallet.lockReason ?? "Liên hệ hỗ trợ"}
            </div>
          )}
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Redeem code box */}
      <RedeemCodeBox onRedeemed={() => {
        walletApi.getMyWallet().then(setWallet).catch(() => {});
        // refresh transactions
        walletApi.getMyTransactions(1, PAGE_SIZE).then((d) => {
          setTransactions(d);
        }).catch(() => {});
      }} />

      {/* Transaction list */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Lịch sử giao dịch</h3>
        </div>

        {transactions.length === 0 && !txLoading ? (
          <p className="px-5 py-10 text-center text-theme-sm text-gray-500">
            Chưa có giao dịch nào.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </ul>
        )}

        {(txLoading) && (
          <div className="space-y-px">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="h-4 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        )}

        {hasMore && !txLoading && (
          <div className="border-t border-gray-100 p-4 text-center dark:border-gray-800">
            <button
              type="button"
              onClick={() => void loadTx(page + 1)}
              className="text-theme-sm font-medium text-brand-500 hover:text-brand-600"
            >
              Xem thêm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────
const txConfig: Record<
  WalletTransactionType,
  { icon: string; color: string; amountColor: string }
> = {
  TopUp:      { icon: "↓", color: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500", amountColor: "text-success-600 dark:text-success-500" },
  Payment:    { icon: "↑", color: "bg-error-50 text-error-500 dark:bg-error-500/15 dark:text-error-400",         amountColor: "text-error-500 dark:text-error-400" },
  Refund:     { icon: "↵", color: "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15",              amountColor: "text-success-600 dark:text-success-500" },
  Reward:     { icon: "★", color: "bg-warning-50 text-warning-600 dark:bg-warning-500/15",                       amountColor: "text-success-600 dark:text-success-500" },
  Adjustment: { icon: "≈", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",              amountColor: "text-gray-700 dark:text-gray-300" },
  Withdraw:   { icon: "↑", color: "bg-error-50 text-error-500 dark:bg-error-500/15 dark:text-error-400",         amountColor: "text-error-500 dark:text-error-400" },
};

function TransactionRow({ tx }: { tx: WalletTransactionDto }) {
  const cfg = txConfig[tx.type] ?? txConfig.Adjustment;
  const positive = tx.amount >= 0;

  return (
    <li className="flex items-center gap-4 px-5 py-3.5">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold",
          cfg.color,
        )}
      >
        {cfg.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {tx.typeLabel}
        </p>
        <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
          {tx.note ?? (tx.referenceType ? `${tx.referenceType} #${tx.referenceId}` : "")}
          <span className="ml-2">{formatDateTime(tx.createdAt)}</span>
        </p>
      </div>
      <div className={cn("shrink-0 text-right", cfg.amountColor)}>
        <p className="text-theme-sm font-semibold">
          {positive ? "+" : ""}{formatVND(tx.amount)}
        </p>
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          → {formatVND(tx.balanceAfter)}
        </p>
      </div>
    </li>
  );
}

/* ─── RedeemCodeBox ─────────────────────────────────────────────────────────
 * Form nhập mã quà tặng (Admin generate ở /admin/wallet-codes).
 * Hợp lệ → cộng tiền + reload wallet/transactions ngay.
 * ──────────────────────────────────────────────────────────────────────── */
function RedeemCodeBox({ onRedeemed }: { onRedeemed: () => void }) {
  const toast = useToast();
  const [code, setCode]       = useState("");
  const [busy, setBusy]       = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const tx = await walletApi.redeemCode(code.trim().toUpperCase());
      toast.success("Nạp ví thành công 🎉", `+${formatVND(tx.amount)}`);
      setCode("");
      onRedeemed();
    } catch (e) {
      toast.error("Mã không hợp lệ", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}
      className="rounded-2xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10">
      <div className="flex items-center gap-2">
        <span className="text-xl">🎁</span>
        <h3 className="text-base font-semibold text-warning-700 dark:text-warning-300">
          Nhập mã quà tặng
        </h3>
      </div>
      <p className="mt-1 text-theme-xs text-warning-700/80 dark:text-warning-300/80">
        Nhập mã được tặng để cộng tiền vào ví. Mỗi mã chỉ dùng được 1 lần.
      </p>
      <div className="mt-3 flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="VD: LS-AB12CD34EF"
          className="h-10 flex-1 rounded-lg border border-warning-300 bg-white px-3 font-mono text-theme-sm uppercase dark:border-warning-500/30 dark:bg-gray-900" />
        <button type="submit" disabled={busy || !code.trim()}
          className="h-10 rounded-lg bg-warning-500 px-5 text-theme-sm font-semibold text-white hover:bg-warning-600 disabled:opacity-50">
          {busy ? "Đang xử lý..." : "Nhận tiền"}
        </button>
      </div>
    </form>
  );
}
