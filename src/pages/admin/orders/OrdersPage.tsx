import { useCallback, useEffect, useState } from "react";
import { orderApi } from "@/api/order.api";
import { useToast } from "@/context/ToastContext";
import { formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { cn } from "@/utils/cn";
import { Modal } from "@/components/ui/Modal";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/Table";
import type { Order, OrderItemSummary, OrderShippingAddress, OrderStatus, UpdateOrderStatusRequest } from "@/api/types";

// ── Status config (matches backend OrderStatus enum) ─────────────────────────
const ALL_STATUSES: { label: string; value: OrderStatus | "All" }[] = [
  { label: "Tất cả",       value: "All" },
  { label: "Chờ xác nhận", value: "Pending" },
  { label: "Đã xác nhận",  value: "Confirmed" },
  { label: "Đang xử lý",  value: "Processing" },
  { label: "Đang giao",   value: "Shipped" },
  { label: "Đã giao",     value: "Delivered" },
  { label: "Hoàn thành",  value: "Completed" },
  { label: "Đã huỷ",      value: "Cancelled" },
  { label: "Đã trả",      value: "Returned" },
  { label: "Hoàn tiền",   value: "Refunded" },
];

export const STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  Pending:    { label: "Chờ xác nhận", cls: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400" },
  Confirmed:  { label: "Đã xác nhận",  cls: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
  Processing: { label: "Đang xử lý",  cls: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400" },
  Shipped:    { label: "Đang giao",   cls: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400" },
  Delivered:  { label: "Đã giao",     cls: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500" },
  Completed:  { label: "Hoàn thành",  cls: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400" },
  Cancelled:  { label: "Đã huỷ",      cls: "bg-error-50 text-error-500 dark:bg-error-500/15 dark:text-error-400" },
  Returned:   { label: "Đã trả",      cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  Refunded:   { label: "Hoàn tiền",   cls: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400" },
};

// Mirrors backend ValidateStatusTransition exactly
const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  Pending:    ["Confirmed", "Cancelled"],
  Confirmed:  ["Processing", "Cancelled"],
  Processing: ["Shipped", "Cancelled"],
  Shipped:    ["Delivered"],
  Delivered:  ["Completed", "Returned"],
  Completed:  ["Returned"],
  Returned:   ["Refunded"],
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-theme-xs font-medium", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatAddr(addr?: OrderShippingAddress | string | null): string {
  if (!addr) return "—";
  if (typeof addr === "string") return addr;
  return [addr.address, addr.ward, addr.district, addr.city].filter(Boolean).join(", ");
}

function getSummaryItems(order: Order): OrderItemSummary[] {
  if (order.items?.length) return order.items;
  if (order.orderItems?.length) return order.orderItems.map(i => ({
    id: i.id, productId: i.productId, productName: i.productName,
    productImageUrl: i.productImageUrl, unitPrice: i.unitPrice,
    quantity: i.quantity, subTotal: i.subTotal ?? i.subtotal ?? i.unitPrice * i.quantity,
  }));
  return [];
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const items = getSummaryItems(order);
  const addr  = order.shippingAddress;

  return (
    <Modal open onClose={onClose} title={`Đơn hàng #${order.orderNumber ?? order.id}`} size="lg"
      footer={<button type="button" onClick={onClose}
        className="h-10 rounded-lg border border-gray-200 px-5 text-theme-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700">
        Đóng
      </button>}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 text-theme-sm">
          <Info label="Khách hàng" value={order.userFullName ?? `User #${order.userId}`} />
          <Info label="Email"      value={order.userEmail ?? "—"} />
          <Info label="Ngày đặt"   value={formatDate(order.orderDate)} />
          <Info label="Trạng thái" value={<StatusBadge status={order.status} />} />
          <Info label="Thanh toán" value={order.paymentMethod ?? "—"} />
          <Info label="Vận chuyển" value={order.shippingMethod ?? "—"} />
          {order.trackingNumber && <Info label="Mã vận đơn"
            value={<span className="font-mono text-theme-xs font-semibold text-brand-600">{order.trackingNumber}</span>} />}
          {order.estimatedDelivery && <Info label="Dự kiến giao" value={formatDate(order.estimatedDelivery)} />}
          {order.isPaid && <Info label="Đã thanh toán" value={formatDate(order.paidDate ?? "")} />}
        </div>

        {addr && (
          <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
            <p className="mb-2 text-theme-xs font-semibold uppercase tracking-wider text-gray-400">Địa chỉ giao hàng</p>
            {typeof addr === "object" ? (
              <>
                <p className="text-theme-sm font-medium text-gray-800 dark:text-white">{addr.fullName} · {addr.phone}</p>
                <p className="text-theme-sm text-gray-500">{formatAddr(addr)}</p>
              </>
            ) : (
              <p className="text-theme-sm text-gray-500">{addr}</p>
            )}
          </div>
        )}

        {items.length > 0 && (
          <div>
            <p className="mb-2 text-theme-xs font-semibold uppercase tracking-wider text-gray-400">Sản phẩm ({items.length})</p>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
              {items.map((item, i) => (
                <div key={item.id ?? i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    <img src={item.productImageUrl ? getImageUrl(item.productImageUrl) : IMAGE_PLACEHOLDER}
                      onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                      alt="" className="h-full w-full object-cover" />
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
            </div>
          </div>
        )}

        <div className="rounded-xl bg-gray-50 p-4 space-y-1.5 text-theme-sm dark:bg-white/[0.03]">
          {order.subTotal !== undefined && <TRow label="Tạm tính" value={formatVND(order.subTotal)} />}
          {!!order.discountAmount && (
            <TRow label={`Giảm giá${order.discountCode ? ` (${order.discountCode})` : ""}`}
              value={`-${formatVND(order.discountAmount)}`} cls="text-success-600" />
          )}
          {!!order.taxAmount && <TRow label="VAT" value={formatVND(order.taxAmount)} />}
          {order.shippingFee !== undefined && (
            <TRow label="Phí vận chuyển" value={order.shippingFee === 0 ? "Miễn phí" : formatVND(order.shippingFee)} />
          )}
          <div className="border-t border-gray-200 pt-1.5 dark:border-gray-700">
            <TRow label="Tổng cộng" value={formatVND(order.totalAmount)} bold />
          </div>
        </div>

        {order.notes && (
          <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03]">
            <p className="text-theme-xs font-medium text-gray-400">Ghi chú</p>
            <p className="mt-1 text-theme-sm text-gray-700 dark:text-gray-300">{order.notes}</p>
          </div>
        )}
        {order.cancelReason && (
          <div className="rounded-xl bg-error-50 p-3 dark:bg-error-500/10">
            <p className="text-theme-xs font-medium text-error-500">Lý do huỷ</p>
            <p className="mt-1 text-theme-sm text-error-600 dark:text-error-400">{order.cancelReason}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-theme-xs text-gray-400">{label}</p>
      <div className="mt-0.5 text-theme-sm font-medium text-gray-800 dark:text-white">{value}</div>
    </div>
  );
}

function TRow({ label, value, bold, cls }: { label: string; value: string; bold?: boolean; cls?: string }) {
  return (
    <div className={cn("flex justify-between text-theme-sm", bold && "font-semibold text-gray-900 dark:text-white")}>
      <span className="text-gray-500">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}

// ── Update Status Modal ───────────────────────────────────────────────────────
function UpdateStatusModal({ order, onClose, onUpdated }: { order: Order; onClose: () => void; onUpdated: () => void }) {
  const toast = useToast();
  const nexts = NEXT_STATUSES[order.status] ?? [];
  const [status, setStatus]     = useState<OrderStatus>(nexts[0] ?? order.status);
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [estimated, setEstimated] = useState(
    order.estimatedDelivery ? new Date(order.estimatedDelivery).toISOString().split("T")[0] : ""
  );
  const [notes, setNotes]       = useState("");
  const [saving, setSaving]     = useState(false);

  const showShipping = status === "Shipped";
  const showCancel   = status === "Cancelled";

  const [cancelReason, setCancelReason] = useState("");

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: UpdateOrderStatusRequest = {
        status,
        notes: notes.trim() || null,
        trackingNumber:    showShipping ? (tracking.trim() || null) : null,
        estimatedDelivery: showShipping && estimated ? estimated : null,
        cancelReason:      showCancel ? (cancelReason.trim() || null) : null,
      };
      await orderApi.adminUpdateStatus(order.id, body);
      toast.success("Cập nhật trạng thái thành công");
      onUpdated();
      onClose();
    } catch (e) {
      toast.error("Cập nhật thất bại", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Cập nhật trạng thái" size="sm"
      footer={
        <>
          <button type="button" onClick={onClose}
            className="h-10 rounded-lg border border-gray-200 px-4 text-theme-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700">
            Huỷ
          </button>
          <button type="button" onClick={handleSave} disabled={saving || nexts.length === 0}
            className="h-10 rounded-lg bg-brand-500 px-5 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </>
      }>
      <div className="space-y-4">
        <div>
          <label className="block text-theme-xs font-medium text-gray-500 mb-1">Trạng thái mới</label>
          {nexts.length === 0 ? (
            <p className="text-theme-sm text-gray-400">Đây là trạng thái cuối, không thể chuyển tiếp.</p>
          ) : (
            <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none">
              {nexts.map((s) => (
                <option key={s} value={s}>{STATUS_BADGE[s]?.label ?? s}</option>
              ))}
            </select>
          )}
        </div>

        {showShipping && (
          <>
            <LabelInput label="Mã vận đơn" value={tracking} onChange={setTracking} placeholder="VD: GHN123456789" />
            <div>
              <label className="block text-theme-xs font-medium text-gray-500 mb-1">Ngày giao dự kiến</label>
              <input type="date" value={estimated} onChange={(e) => setEstimated(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
            </div>
          </>
        )}

        {showCancel && (
          <LabelInput label="Lý do huỷ *" value={cancelReason} onChange={setCancelReason} placeholder="Vui lòng nhập lý do..." />
        )}

        {!showCancel && (
          <div>
            <label className="block text-theme-xs font-medium text-gray-500 mb-1">Ghi chú (tuỳ chọn)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
          </div>
        )}
      </div>
    </Modal>
  );
}

function LabelInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-theme-xs font-medium text-gray-500 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
    </div>
  );
}

// ── Cancel Modal ──────────────────────────────────────────────────────────────
function AdminCancelModal({ order, onClose, onCancelled }: { order: Order; onClose: () => void; onCancelled: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy]     = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await orderApi.adminCancel(order.id, reason || null);
      toast.success("Đã huỷ đơn hàng", `#${order.orderNumber}`);
      onCancelled();
      onClose();
    } catch (e) {
      toast.error("Huỷ thất bại", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Huỷ đơn #${order.orderNumber ?? order.id}`} size="sm"
      footer={
        <>
          <button type="button" onClick={onClose}
            className="h-10 rounded-lg border border-gray-200 px-4 text-theme-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700">
            Đóng
          </button>
          <button type="button" onClick={handleConfirm} disabled={busy}
            className="h-10 rounded-lg bg-error-500 px-4 text-theme-sm font-medium text-white hover:bg-error-600 disabled:opacity-60">
            {busy ? "Đang huỷ..." : "Xác nhận huỷ"}
          </button>
        </>
      }>
      <div>
        <p className="mb-3 text-theme-sm text-gray-500">Nhập lý do huỷ đơn hàng này.</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder="Lý do huỷ..."
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-theme-sm focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
      </div>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminOrdersPage() {
  const toast = useToast();
  const [orders, setOrders]         = useState<Order[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");

  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [updateOrder, setUpdateOrder] = useState<Order | null>(null);
  const [cancelOrder, setCancelOrder] = useState<Order | null>(null);

  const PAGE_SIZE = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderApi.adminGetAll({
        page,
        pageSize: PAGE_SIZE,
        search:   search.trim() || undefined,
        status:   statusFilter === "All" ? undefined : statusFilter,
      });
      setOrders(res.items ?? []);
      setTotal(res.totalCount ?? 0);
    } catch {
      toast.error("Không tải được danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-title-sm font-bold text-gray-900 dark:text-white">Quản lý đơn hàng</h1>
          <p className="text-theme-sm text-gray-500">{total} đơn hàng</p>
        </div>
      </div>

      {/* Search + Status tabs */}
      <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }} className="flex gap-2">
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm mã đơn, tên khách, email..."
          className="h-10 flex-1 max-w-xs rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none" />
        <button type="submit"
          className="h-10 rounded-lg bg-brand-500 px-4 text-theme-sm font-medium text-white hover:bg-brand-600">
          Tìm
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(""); setSearchInput(""); }}
            className="h-10 rounded-lg border border-gray-200 px-3 text-theme-sm text-gray-500 hover:bg-gray-50 dark:border-gray-700">
            ×
          </button>
        )}
      </form>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1.5 dark:border-gray-800 dark:bg-white/[0.03] custom-scrollbar">
        {ALL_STATUSES.map((tab) => (
          <button key={tab.value} type="button" onClick={() => setStatusFilter(tab.value)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-theme-xs font-medium whitespace-nowrap transition-colors",
              statusFilter === tab.value
                ? "bg-brand-500 text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5",
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mb-2 text-4xl">📋</div>
            <p className="text-theme-sm text-gray-500">
              {search ? `Không tìm thấy kết quả cho "${search}"` : "Không có đơn hàng nào."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Ngày đặt</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thanh toán</TableHead>
                <TableHead className="text-right">Tổng tiền</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const nexts    = NEXT_STATUSES[order.status] ?? [];
                const canUpdate = nexts.length > 0;
                const canCancel = order.canCancel ?? (order.status === "Pending" || order.status === "Confirmed");
                return (
                  <TableRow key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                    <TableCell>
                      <span className="font-mono text-theme-xs font-semibold text-brand-600 dark:text-brand-400">
                        #{order.orderNumber ?? order.id}
                      </span>
                      {order.trackingNumber && (
                        <p className="mt-0.5 text-[10px] text-gray-400">{order.trackingNumber}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {order.userFullName ?? `User #${order.userId ?? "—"}`}
                      </p>
                      {order.userEmail && (
                        <p className="text-theme-xs text-gray-400">{order.userEmail}</p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-theme-xs text-gray-500">
                      {new Date(order.orderDate).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell><StatusBadge status={order.status} /></TableCell>
                    <TableCell>
                      <p className="text-theme-xs text-gray-500">{order.paymentMethod ?? "—"}</p>
                      {order.isPaid && (
                        <span className="text-[10px] text-success-500">✓ Đã TT</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-outfit font-semibold text-gray-900 dark:text-white">
                      {formatVND(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => setDetailOrder(order)}
                          className="rounded-lg px-2.5 py-1.5 text-theme-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5">
                          Chi tiết
                        </button>
                        {canUpdate && (
                          <button type="button" onClick={() => setUpdateOrder(order)}
                            className="rounded-lg px-2.5 py-1.5 text-theme-xs text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">
                            Cập nhật
                          </button>
                        )}
                        {canCancel && (
                          <button type="button" onClick={() => setCancelOrder(order)}
                            className="rounded-lg px-2.5 py-1.5 text-theme-xs text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10">
                            Huỷ
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-theme-sm text-gray-500">
          <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total} đơn</span>
          <div className="flex gap-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="h-8 rounded-lg border border-gray-200 px-3 text-theme-xs hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700">
              ← Trước
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1
                : page <= 4 ? i + 1
                : page >= totalPages - 3 ? totalPages - 6 + i
                : page - 3 + i;
              return (
                <button key={p} type="button" onClick={() => setPage(p)}
                  className={cn(
                    "h-8 min-w-[2rem] rounded-lg border px-2 text-theme-xs",
                    p === page
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-200 hover:bg-gray-50 dark:border-gray-700",
                  )}>
                  {p}
                </button>
              );
            })}
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
              className="h-8 rounded-lg border border-gray-200 px-3 text-theme-xs hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700">
              Sau →
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {detailOrder && <DetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
      {updateOrder && (
        <UpdateStatusModal order={updateOrder} onClose={() => setUpdateOrder(null)} onUpdated={load} />
      )}
      {cancelOrder && (
        <AdminCancelModal order={cancelOrder} onClose={() => setCancelOrder(null)} onCancelled={load} />
      )}
    </div>
  );
}
