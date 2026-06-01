import { useCallback, useEffect, useState } from "react";
import { orderApi } from "@/api/order.api";
import { useToast } from "@/context/ToastContext";
import { formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { cn } from "@/utils/cn";
import { STATUS_BADGE } from "@/pages/admin/orders/OrdersPage";
import type { Order, OrderItemSummary, OrderShippingAddress, OrderStatus } from "@/api/types";

// ── Status tabs ───────────────────────────────────────────────────────────────
const STATUS_TABS: { label: string; value: OrderStatus | "All" }[] = [
  { label: "Tất cả",       value: "All" },
  { label: "Chờ xác nhận", value: "Pending" },
  { label: "Đã xác nhận",  value: "Confirmed" },
  { label: "Đang xử lý",  value: "Processing" },
  { label: "Đang giao",   value: "Shipped" },
  { label: "Đã giao",     value: "Delivered" },
  { label: "Đã huỷ",      value: "Cancelled" },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-theme-xs font-medium", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatAddr(addr?: OrderShippingAddress | string | null) {
  if (!addr) return null;
  if (typeof addr === "string") return addr;
  return [addr.address, addr.ward, addr.district, addr.city].filter(Boolean).join(", ");
}

function getItems(order: Order): OrderItemSummary[] {
  if (order.items?.length) return order.items;
  if (order.orderItems?.length) return order.orderItems.map(i => ({
    id: i.id, productId: i.productId, productName: i.productName,
    productImageUrl: i.productImageUrl, unitPrice: i.unitPrice,
    quantity: i.quantity, subTotal: i.subTotal ?? i.subtotal ?? i.unitPrice * i.quantity,
  }));
  return [];
}

// ── Cancel modal ──────────────────────────────────────────────────────────────
function CancelModal({ open, onClose, onConfirm, busy }: {
  open: boolean; onClose: () => void; onConfirm: (reason: string) => void; busy: boolean;
}) {
  const [reason, setReason] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Huỷ đơn hàng</h3>
        <p className="mb-4 text-theme-sm text-gray-500">Vui lòng cho biết lý do huỷ đơn.</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder="Lý do huỷ..."
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-theme-sm focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="h-10 rounded-lg border border-gray-200 px-4 text-theme-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
            Đóng
          </button>
          <button type="button" disabled={busy} onClick={() => onConfirm(reason)}
            className="h-10 rounded-lg bg-error-500 px-4 text-theme-sm font-medium text-white hover:bg-error-600 disabled:opacity-60">
            {busy ? "Đang huỷ..." : "Xác nhận huỷ"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Order card ────────────────────────────────────────────────────────────────
function OrderCard({ order, onCancelled }: { order: Order; onCancelled: () => void }) {
  const toast = useToast();
  const [expanded, setExpanded]     = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const items   = getItems(order);
  const addr    = order.shippingAddress;
  const addrStr = formatAddr(addr);

  const handleCancel = async (reason: string) => {
    setCancelling(true);
    try {
      await orderApi.cancel(order.id, reason || null);
      toast.success("Đã huỷ đơn hàng", `#${order.orderNumber}`);
      setShowCancel(false);
      onCancelled();
    } catch (e) {
      toast.error("Huỷ thất bại", e instanceof Error ? e.message : undefined);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <span className="font-outfit text-theme-sm font-semibold text-gray-900 dark:text-white">
              #{order.orderNumber ?? order.id}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <span className="text-theme-xs text-gray-400">{formatDate(order.orderDate)}</span>
        </div>

        {/* Items preview */}
        {items.length > 0 ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {items.slice(0, expanded ? items.length : 2).map((item, i) => (
              <div key={item.id ?? i} className="flex items-center gap-3 px-5 py-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                  <img src={item.productImageUrl ? getImageUrl(item.productImageUrl) : IMAGE_PLACEHOLDER}
                    onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                    alt={item.productName} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white">{item.productName}</p>
                  <p className="text-theme-xs text-gray-400">{formatVND(item.unitPrice)} × {item.quantity}</p>
                </div>
                <span className="shrink-0 text-theme-sm font-semibold text-gray-700 dark:text-gray-300">
                  {formatVND(item.subTotal ?? item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
            {!expanded && items.length > 2 && (
              <button type="button" onClick={() => setExpanded(true)}
                className="w-full py-2.5 text-center text-theme-xs text-brand-500 hover:text-brand-600">
                Xem thêm {items.length - 2} sản phẩm ↓
              </button>
            )}
          </div>
        ) : (
          <div className="px-5 py-3">
            <p className="text-theme-sm text-gray-400">{order.totalItems ?? "?"} sản phẩm</p>
          </div>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3 dark:border-gray-800">
            <div className="grid gap-3 sm:grid-cols-2 text-theme-sm">
              {addrStr && (
                <div>
                  <p className="text-theme-xs font-medium text-gray-400 mb-0.5">Địa chỉ giao hàng</p>
                  {typeof addr === "object" && addr !== null && (
                    <p className="font-medium text-gray-800 dark:text-white">{addr.fullName} · {addr.phone}</p>
                  )}
                  <p className="text-gray-600 dark:text-gray-400">{addrStr}</p>
                </div>
              )}
              <div className="space-y-1 text-theme-sm">
                {order.paymentMethod && <Row label="Thanh toán" value={order.paymentMethod} />}
                {order.shippingMethod && <Row label="Vận chuyển" value={order.shippingMethod} />}
                {order.trackingNumber && (
                  <Row label="Mã vận đơn"
                    value={<span className="font-mono text-theme-xs font-semibold text-brand-600">{order.trackingNumber}</span>} />
                )}
                {order.estimatedDelivery && (
                  <Row label="Dự kiến giao" value={formatDate(order.estimatedDelivery)} />
                )}
                {order.discountCode && <Row label="Mã giảm giá" value={order.discountCode} cls="text-success-600" />}
              </div>
            </div>

            {(order.subTotal !== undefined || order.shippingFee !== undefined) && (
              <div className="rounded-xl bg-gray-50 p-3 space-y-1.5 text-theme-sm dark:bg-white/[0.03]">
                {order.subTotal !== undefined && <SumRow label="Tạm tính" value={formatVND(order.subTotal)} />}
                {!!order.discountAmount && <SumRow label="Giảm giá" value={`-${formatVND(order.discountAmount)}`} cls="text-success-600" />}
                {!!order.taxAmount && <SumRow label="VAT" value={formatVND(order.taxAmount)} />}
                {order.shippingFee !== undefined && (
                  <SumRow label="Phí vận chuyển" value={order.shippingFee === 0 ? "Miễn phí" : formatVND(order.shippingFee)} />
                )}
                <div className="border-t border-gray-200 pt-1.5 dark:border-gray-700">
                  <SumRow label="Tổng cộng" value={formatVND(order.totalAmount)} bold />
                </div>
              </div>
            )}

            {order.cancelReason && (
              <div className="rounded-xl bg-error-50 px-3 py-2 dark:bg-error-500/10">
                <span className="text-theme-xs text-error-500">Lý do huỷ: </span>
                <span className="text-theme-xs text-error-600 dark:text-error-400">{order.cancelReason}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
          <div>
            {order.canCancel && (
              <button type="button" onClick={() => setShowCancel(true)}
                className="text-theme-xs font-medium text-error-500 hover:text-error-600 hover:underline">
                Huỷ đơn
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-outfit text-base font-bold text-brand-600 dark:text-brand-400">
              {formatVND(order.totalAmount)}
            </span>
            <button type="button" onClick={() => setExpanded((v) => !v)}
              className="text-theme-xs text-gray-400 hover:text-gray-600">
              {expanded ? "Thu gọn ↑" : "Chi tiết ↓"}
            </button>
          </div>
        </div>
      </div>

      <CancelModal open={showCancel} onClose={() => setShowCancel(false)} onConfirm={handleCancel} busy={cancelling} />
    </>
  );
}

function Row({ label, value, cls }: { label: string; value: React.ReactNode; cls?: string }) {
  return (
    <div className="flex justify-between text-theme-sm">
      <span className="text-gray-400">{label}</span>
      <span className={cn("font-medium text-gray-700 dark:text-gray-300", cls)}>{value}</span>
    </div>
  );
}

function SumRow({ label, value, bold, cls }: { label: string; value: string; bold?: boolean; cls?: string }) {
  return (
    <div className={cn("flex justify-between text-theme-sm", bold && "font-semibold text-gray-900 dark:text-white")}>
      <span className="text-gray-400">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MyOrdersTab() {
  const toast = useToast();
  const [orders, setOrders]         = useState<Order[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [activeTab, setActiveTab]   = useState<OrderStatus | "All">("All");

  const PAGE_SIZE = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderApi.myOrders({
        status:   activeTab === "All" ? undefined : activeTab,
        page,
        pageSize: PAGE_SIZE,
      });
      setOrders(res.items ?? []);
      setTotal(res.totalCount ?? 0);
    } catch {
      toast.error("Không tải được đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [activeTab]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Đơn hàng của tôi</h2>
        {total > 0 && <span className="text-theme-sm text-gray-400">{total} đơn</span>}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1.5 dark:border-gray-800 dark:bg-white/[0.03] custom-scrollbar">
        {STATUS_TABS.map((tab) => (
          <button key={tab.value} type="button" onClick={() => setActiveTab(tab.value)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-theme-xs font-medium whitespace-nowrap transition-colors",
              activeTab === tab.value
                ? "bg-brand-500 text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5",
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-3 text-5xl">📦</div>
          <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">Chưa có đơn hàng nào</p>
          <p className="mt-1 text-theme-xs text-gray-400">
            {activeTab === "All" ? "Bạn chưa đặt đơn hàng nào." : "Không có đơn ở trạng thái này."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} onCancelled={load} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-theme-sm text-gray-500">
              <span>Trang {page}/{totalPages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="h-8 rounded-lg border border-gray-200 px-3 text-theme-xs hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700">
                  ← Trước
                </button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="h-8 rounded-lg border border-gray-200 px-3 text-theme-xs hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700">
                  Sau →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
