import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cartApi } from "@/api/cart.api";
import { orderApi } from "@/api/order.api";
import { productApi } from "@/api/product.api";
import { userAddressApi } from "@/api/userAddress.api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import type { Product, ShoppingCart, UserAddress } from "@/api/types";
import { computeDiscountPrice, formatVND } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { guestCart, type GuestCartItem } from "@/utils/guestCart";
import { getApiErrorMessage } from "@/utils/apiError";
import { ErrorModal } from "@/components/ui/ErrorModal";
import { cn } from "@/utils/cn";

// inline coupon api (avoid missing file issue)
import { apiClient, API_V1, unwrap } from "@/api/client";
import type { ApiResponse } from "@/api/types";

interface ApplyCouponResult {
  couponId: number; code: string; orderAmount: number;
  discountAmount: number; finalAmount: number; message: string;
}

const couponApply = (code: string, orderAmount: number) =>
  unwrap(apiClient.post<ApiResponse<ApplyCouponResult>>(`${API_V1}/coupons/apply`, { code, orderAmount }));

const PAYMENT_METHODS = [
  { value: "COD",      label: "Thanh toán khi nhận hàng (COD)" },
  { value: "wallet",   label: "Ví LaptopShop" },
  { value: "bank",     label: "Chuyển khoản ngân hàng" },
];

const SHIPPING_METHODS = [
  { value: "standard", label: "Giao hàng tiêu chuẩn (30.000đ — miễn phí ≥10tr)" },
  { value: "express",  label: "Giao nhanh 2h (50.000đ)" },
  { value: "free",     label: "Nhận tại cửa hàng (miễn phí)" },
];

export default function CartPage() {
  const { isAuthenticated, user } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();

  const [cart, setCart]               = useState<ShoppingCart | null>(null);
  const [loading, setLoading]         = useState(true);
  const [addresses, setAddresses]     = useState<UserAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod]     = useState("COD");
  const [shippingMethod, setShippingMethod]   = useState("standard");
  const [notes, setNotes]             = useState("");
  const [couponCode, setCouponCode]   = useState("");
  const [couponResult, setCouponResult] = useState<ApplyCouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing]         = useState(false);
  const [step, setStep]               = useState<"cart" | "checkout">("cart");
  const [orderError, setOrderError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    setLoading(true);
    try {
      const [c, addr] = await Promise.allSettled([
        cartApi.get(),
        userAddressApi.getByUser(user?.id ?? 0),
      ]);
      if (c.status === "fulfilled") setCart(c.value);
      if (addr.status === "fulfilled") {
        setAddresses(addr.value);
        const def = addr.value.find((a) => a.isDefault);
        if (def) setSelectedAddress(def.id);
      }
    } finally { setLoading(false); }
  }, [isAuthenticated, user?.id]);

  useEffect(() => { void load(); }, [load]);

  const updateQty = async (itemId: number, qty: number) => {
    if (qty < 0) return;
    try {
      if (qty === 0) {
        await cartApi.removeItem(itemId);
      } else {
        await cartApi.updateItem(itemId, qty);
      }
      const updated = await cartApi.get();
      setCart(updated);
    } catch (e) {
      toast.error("Cập nhật giỏ hàng thất bại", e instanceof Error ? e.message : undefined);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const subTotal = cart?.items.reduce((s, i) => s + (i.totalPrice ?? i.unitPrice * i.quantity), 0) ?? 0;
      const res = await couponApply(couponCode.trim(), subTotal);
      setCouponResult(res);
      toast.success("Áp dụng mã thành công!", `Giảm ${formatVND(res.discountAmount)}`);
    } catch (e) {
      toast.error("Mã không hợp lệ", e instanceof Error ? e.message : undefined);
      setCouponResult(null);
    } finally { setCouponLoading(false); }
  };

  const placeOrder = async () => {
    if (!cart?.items.length) return;
    setPlacing(true);
    try {
      const order = await orderApi.create({
        items: [],
        createFromCart: true,
        shippingAddressId: selectedAddress ?? undefined,
        paymentMethod,
        shippingMethod,
        discountCode: couponResult?.code ?? undefined,
        notes: notes.trim() || undefined,
      } as Parameters<typeof orderApi.create>[0]);

      toast.success("Đặt hàng thành công!", `Mã đơn: ${(order as any).orderNumber}`);
      navigate(`/account/orders`, { replace: true });
    } catch (e) {
      // Hiện thông điệp thật từ server qua pop-up (vd: "Số dư ví không đủ ...")
      setOrderError(getApiErrorMessage(e, "Không thể đặt hàng. Vui lòng thử lại."));
    } finally { setPlacing(false); }
  };

  // ── Derived totals ─────────────────────────────────────────────────────────
  const subTotal  = cart?.items.reduce((s, i) => s + (i.totalPrice ?? i.unitPrice * i.quantity), 0) ?? 0;
  const discount  = couponResult?.discountAmount ?? 0;
  const shipping  = shippingMethod === "express" ? 50_000
    : shippingMethod === "free" ? 0
    : subTotal >= 10_000_000 ? 0 : 30_000;
  const tax       = (subTotal - discount) * 0.1;
  const total     = subTotal - discount + tax + shipping;

  // Khách (chưa đăng nhập) — render GuestCartView từ localStorage
  if (!isAuthenticated) {
    return <GuestCartView />;
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
      <ErrorModal
        open={orderError !== null}
        onClose={() => setOrderError(null)}
        title="Đặt hàng không thành công"
        message={orderError}
      />
      <h1 className="mb-6 font-outfit text-2xl font-bold text-gray-900 dark:text-white">
        {step === "cart" ? "Giỏ hàng" : "Thanh toán"}
      </h1>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : !cart?.items.length ? (
        <div className="py-20 text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Giỏ hàng trống</h2>
          <p className="mt-2 text-theme-sm text-gray-500">Hãy chọn thêm sản phẩm để bắt đầu mua sắm!</p>
          <Link to="/products" className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-500 px-6 text-theme-sm font-semibold text-white hover:bg-brand-600">
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left: items + checkout form ── */}
          <div className="space-y-4 lg:col-span-2">
            {step === "cart" && (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                {cart.items.map((item, idx) => {
                  // Backend trả: productName, productImageUrl, totalPrice (không có nested product)
                  const itemTotal = item.totalPrice ?? item.unitPrice * item.quantity;
                  const imgSrc = item.productImageUrl
                    ? getImageUrl(item.productImageUrl)
                    : IMAGE_PLACEHOLDER;
                  return (
                    <div key={item.id}
                      className={cn("flex items-start gap-4 p-4", idx > 0 && "border-t border-gray-100 dark:border-gray-800")}>
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                        <img src={imgSrc} onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                          alt={item.productName} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="line-clamp-2 text-theme-sm font-semibold text-gray-900 dark:text-white">
                          {item.productName || `Sản phẩm #${item.productId}`}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700">
                            <button type="button" onClick={() => void updateQty(item.id, item.quantity - 1)}
                              className="h-8 w-8 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded-l-lg">−</button>
                            <span className="w-8 text-center text-theme-sm font-medium">{item.quantity}</span>
                            <button type="button" onClick={() => void updateQty(item.id, item.quantity + 1)}
                              className="h-8 w-8 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded-r-lg">+</button>
                          </div>
                          <button type="button" onClick={() => void updateQty(item.id, 0)}
                            className="text-theme-xs text-error-500 hover:text-error-600">Xoá</button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-outfit text-base font-bold text-brand-600 dark:text-brand-400">
                          {formatVND(itemTotal)}
                        </p>
                        {item.quantity > 1 && (
                          <p className="text-theme-xs text-gray-400">{formatVND(item.unitPrice)} / cái</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {step === "checkout" && (
              <div className="space-y-4">
                {/* Address */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <h3 className="mb-3 font-outfit text-base font-semibold text-gray-900 dark:text-white">Địa chỉ giao hàng</h3>
                  {addresses.length === 0 ? (
                    <p className="text-theme-sm text-gray-500">
                      Chưa có địa chỉ.{" "}
                      <Link to="/account" className="text-brand-500 hover:underline">Thêm địa chỉ</Link>
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {addresses.map((addr) => (
                        <label key={addr.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                            selectedAddress === addr.id
                              ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10"
                              : "border-gray-200 hover:border-gray-300 dark:border-gray-700",
                          )}>
                          <input type="radio" name="address" value={addr.id}
                            checked={selectedAddress === addr.id}
                            onChange={() => setSelectedAddress(addr.id)}
                            className="mt-0.5 accent-brand-500" />
                          <div>
                            <p className="text-theme-sm font-semibold text-gray-800 dark:text-white">
                              {addr.recipientName} · {addr.phone}
                            </p>
                            <p className="text-theme-xs text-gray-500">
                              {[addr.addressLine, addr.ward, addr.district, addr.city].filter(Boolean).join(", ")}
                            </p>
                            {addr.isDefault && (
                              <span className="mt-1 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-600">Mặc định</span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Shipping + Payment */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <h3 className="mb-3 font-outfit text-base font-semibold text-gray-900 dark:text-white">Phương thức vận chuyển</h3>
                    <div className="space-y-2">
                      {SHIPPING_METHODS.map((m) => (
                        <label key={m.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-theme-sm transition-colors",
                            shippingMethod === m.value
                              ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                              : "border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300",
                          )}>
                          <input type="radio" name="shipping" value={m.value}
                            checked={shippingMethod === m.value}
                            onChange={() => setShippingMethod(m.value)}
                            className="accent-brand-500" />
                          {m.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                    <h3 className="mb-3 font-outfit text-base font-semibold text-gray-900 dark:text-white">Thanh toán</h3>
                    <div className="space-y-2">
                      {PAYMENT_METHODS.map((m) => (
                        <label key={m.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-theme-sm transition-colors",
                            paymentMethod === m.value
                              ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                              : "border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300",
                          )}>
                          <input type="radio" name="payment" value={m.value}
                            checked={paymentMethod === m.value}
                            onChange={() => setPaymentMethod(m.value)}
                            className="accent-brand-500" />
                          {m.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ghi chú */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <h3 className="mb-2 font-outfit text-base font-semibold text-gray-900 dark:text-white">Ghi chú đơn hàng</h3>
                  <textarea
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    rows={2} placeholder="Yêu cầu đặc biệt, thời gian giao hàng..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-theme-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Right: order summary ── */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="mb-4 font-outfit text-base font-semibold text-gray-900 dark:text-white">Tóm tắt đơn hàng</h3>

              {/* Coupon */}
              <div className="mb-4 flex gap-2">
                <input
                  value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && void applyCoupon()}
                  placeholder="Mã giảm giá"
                  className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none"
                />
                <button type="button" onClick={() => void applyCoupon()} disabled={couponLoading}
                  className="h-10 rounded-lg bg-gray-100 px-3 text-theme-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300">
                  {couponLoading ? "..." : "Áp dụng"}
                </button>
              </div>
              {couponResult && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-success-50 px-3 py-2 dark:bg-success-500/10">
                  <span className="text-theme-xs font-semibold text-success-600 dark:text-success-400">
                    ✓ {couponResult.code} — giảm {formatVND(couponResult.discountAmount)}
                  </span>
                  <button type="button" onClick={() => setCouponResult(null)}
                    className="ml-auto text-success-500 text-xs">×</button>
                </div>
              )}

              {/* Line items */}
              <div className="space-y-2 text-theme-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tạm tính ({cart.totalItems} SP)</span>
                  <span>{formatVND(subTotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-success-600 dark:text-success-400">
                    <span>Giảm giá</span>
                    <span>−{formatVND(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>VAT (10%)</span>
                  <span>{formatVND(tax)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Phí vận chuyển</span>
                  <span>{shipping === 0 ? "Miễn phí" : formatVND(shipping)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 font-outfit text-base font-bold text-gray-900 dark:border-gray-800 dark:text-white">
                  <span>Tổng cộng</span>
                  <span className="text-brand-600 dark:text-brand-400">{formatVND(total)}</span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-4 space-y-2">
                {step === "cart" ? (
                  <button type="button" onClick={() => setStep("checkout")}
                    className="btn-press flex h-12 w-full items-center justify-center rounded-xl bg-brand-500 text-base font-semibold text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-brand-500/30 hover:shadow-md active:bg-brand-700 active:shadow-none select-none">
                    Tiến hành thanh toán →
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={() => void placeOrder()} disabled={placing}
                      className="btn-press flex h-12 w-full items-center justify-center rounded-xl bg-brand-500 text-base font-semibold text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-brand-500/30 hover:shadow-md active:bg-brand-700 active:shadow-none disabled:opacity-60 disabled:shadow-none select-none">
                      {placing ? "Đang đặt hàng..." : "Xác nhận đặt hàng"}
                    </button>
                    <button type="button" onClick={() => setStep("cart")}
                      className="btn-press flex h-10 w-full items-center justify-center rounded-xl border border-gray-200 text-theme-sm text-gray-600 transition-all hover:bg-gray-50 active:bg-gray-100 dark:border-gray-700 select-none">
                      ← Quay lại giỏ hàng
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Mini product list */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="mb-3 text-theme-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {cart.totalItems} sản phẩm
              </p>
              <ul className="space-y-2">
                {cart.items.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-center gap-2.5">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      <img
                        src={item.productImageUrl ? getImageUrl(item.productImageUrl) : IMAGE_PLACEHOLDER}
                        onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                        alt="" className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-theme-xs font-medium text-gray-700 dark:text-gray-300">
                        {item.productName || `#${item.productId}`}
                      </p>
                      <p className="text-theme-xs text-gray-400">×{item.quantity}</p>
                    </div>
                    <span className="text-theme-xs font-semibold text-gray-700 dark:text-gray-300">
                      {formatVND(item.totalPrice ?? item.unitPrice * item.quantity)}
                    </span>
                  </li>
                ))}
                {cart.items.length > 4 && (
                  <p className="text-theme-xs text-gray-400 text-center">
                    +{cart.items.length - 4} sản phẩm khác
                  </p>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 *  GuestCartView — giỏ hàng cho khách CHƯA đăng nhập.
 *
 *  Nghiệp vụ:
 *  - Đọc list { productId, quantity } từ localStorage['guest_cart'].
 *  - Gọi /products/batch để lấy info (name/price/image/discount/inStock).
 *  - Cho phép update qty / remove ngay trên localStorage (không gọi API).
 *  - Khách điền form Họ tên / SĐT / Email / Địa chỉ → POST /orders/guest.
 *  - Đặt hàng xong: clear localStorage, hiện OrderNumber + CTA đăng ký.
 *  - Banner gợi ý đăng ký để nhận coupon + tích điểm (không ép buộc).
 * ════════════════════════════════════════════════════════════════════════════ */
function GuestCartView() {
  const toast    = useToast();
  const navigate = useNavigate();

  const [items, setItems]       = useState<GuestCartItem[]>(() => guestCart.get());
  const [products, setProducts] = useState<Record<number, Product>>({});
  const [loading, setLoading]   = useState(true);
  const [step, setStep]         = useState<"cart" | "checkout">("cart");

  // Form thanh toán cho khách
  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", address: "",
    ward: "", district: "", city: "",
    paymentMethod: "COD",
    shippingMethod: "standard",
    notes: "",
  });
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{ orderNumber: string } | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Hydrate product info từ /products/batch
  useEffect(() => {
    const ids = items.map((i) => i.productId);
    if (ids.length === 0) { setLoading(false); return; }
    setLoading(true);
    productApi.getBatch(ids)
      .then((list) => {
        const map: Record<number, Product> = {};
        for (const p of list) map[p.id] = p;
        setProducts(map);
      })
      .catch(() => { /* silent */ })
      .finally(() => setLoading(false));
  }, [items.length]); // chỉ refresh khi số item thay đổi

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      guestCart.remove(productId);
    } else {
      guestCart.setQuantity(productId, qty);
    }
    setItems(guestCart.get());
  };

  const computeUnitPrice = (p?: Product) => {
    if (!p) return 0;
    return p.discount && p.discount > 0
      ? computeDiscountPrice(p.price, p.discount)
      : p.price;
  };

  const subTotal = items.reduce((s, i) => s + computeUnitPrice(products[i.productId]) * i.quantity, 0);
  const shipping = form.shippingMethod === "express" ? 50_000
    : form.shippingMethod === "free" ? 0
    : subTotal >= 10_000_000 ? 0 : 30_000;
  const total    = subTotal + shipping;

  const placeOrder = async () => {
    if (!form.fullName.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.warning("Vui lòng điền đủ Họ tên, SĐT và Địa chỉ");
      return;
    }
    if (items.length === 0) return;
    setPlacing(true);
    try {
      const res = await orderApi.createGuest({
        fullName:       form.fullName.trim(),
        phone:          form.phone.trim(),
        email:          form.email.trim() || undefined,
        address:        form.address.trim(),
        ward:           form.ward.trim() || undefined,
        district:       form.district.trim() || undefined,
        city:           form.city.trim() || undefined,
        paymentMethod:  form.paymentMethod,
        shippingMethod: form.shippingMethod,
        notes:          form.notes.trim() || undefined,
        items:          items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      guestCart.clear();
      setItems([]);
      setPlacedOrder({ orderNumber: (res as { orderNumber?: string }).orderNumber ?? "" });
      toast.success("Đặt hàng thành công!", `Mã đơn: ${(res as { orderNumber?: string }).orderNumber ?? ""}`);
    } catch (e) {
      setOrderError(getApiErrorMessage(e, "Không thể đặt hàng. Vui lòng thử lại."));
    } finally {
      setPlacing(false);
    }
  };

  // ── Đặt hàng thành công ────────────────────────────────────────────────────
  if (placedOrder) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mb-4 text-6xl">🎉</div>
        <h1 className="font-outfit text-2xl font-bold text-gray-900 dark:text-white">
          Đặt hàng thành công!
        </h1>
        <p className="mt-3 text-theme-sm text-gray-500">
          Mã đơn: <strong className="text-gray-900 dark:text-white">{placedOrder.orderNumber}</strong>
        </p>
        <p className="mt-1 text-theme-sm text-gray-500">
          Chúng tôi sẽ liên hệ qua SĐT bạn cung cấp để xác nhận.
        </p>
        <div className="mt-6 rounded-xl border border-warning-200 bg-warning-50 p-4 text-left dark:border-warning-500/30 dark:bg-warning-500/10">
          <p className="text-theme-sm font-semibold text-warning-700 dark:text-warning-300">
            🎁 Đăng ký tài khoản để nhận:
          </p>
          <ul className="mt-2 list-disc pl-5 text-theme-xs text-warning-700 dark:text-warning-300">
            <li>Coupon WELCOME10 (-10% cho đơn tiếp theo)</li>
            <li>Tích điểm thành viên — đổi quà về sau</li>
            <li>Theo dõi đơn hàng dễ dàng</li>
          </ul>
          <Link to="/auth/register"
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-warning-500 px-4 text-theme-xs font-semibold text-white hover:bg-warning-600">
            Đăng ký ngay →
          </Link>
        </div>
        <Link to="/products"
          className="mt-6 inline-flex h-11 items-center rounded-xl border border-gray-200 px-6 text-theme-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  // ── Giỏ trống ─────────────────────────────────────────────────────────────
  if (!loading && items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mb-4 text-6xl">🛒</div>
        <h1 className="font-outfit text-2xl font-bold text-gray-900 dark:text-white">Giỏ hàng trống</h1>
        <p className="mt-3 text-theme-sm text-gray-500">Hãy chọn sản phẩm để bắt đầu mua sắm.</p>
        <Link to="/products"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-500 px-6 text-theme-sm font-semibold text-white hover:bg-brand-600">
          Khám phá sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
      <ErrorModal
        open={orderError !== null}
        onClose={() => setOrderError(null)}
        title="Đặt hàng không thành công"
        message={orderError}
      />
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-outfit text-2xl font-bold text-gray-900 dark:text-white">
          {step === "cart" ? "Giỏ hàng" : "Thanh toán"}
        </h1>
        <Link to="/auth/login" state={{ from: "/cart" }}
          className="text-theme-sm font-semibold text-brand-500 hover:text-brand-600">
          Đăng nhập để nhận ưu đãi →
        </Link>
      </div>

      {/* Banner gợi ý đăng nhập */}
      <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-theme-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
        🎁 <strong>Đăng nhập / đăng ký</strong> để dùng ví, tích điểm thành viên, áp coupon dành riêng.
        Bạn vẫn có thể đặt hàng với tư cách khách — chúng tôi chỉ cần SĐT & địa chỉ để giao hàng.
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: items / checkout form ── */}
        <div className="space-y-4 lg:col-span-2">
          {step === "cart" ? (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              {loading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: items.length || 2 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                  ))}
                </div>
              ) : (
                items.map((it, idx) => {
                  const p = products[it.productId];
                  const unitPrice = computeUnitPrice(p);
                  return (
                    <div key={it.productId}
                      className={cn("flex items-start gap-4 p-4", idx > 0 && "border-t border-gray-100 dark:border-gray-800")}>
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                        <img
                          src={p?.mainImageUrl ? getImageUrl(p.mainImageUrl) : IMAGE_PLACEHOLDER}
                          onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                          alt={p?.name ?? ""} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={p ? `/products/${p.slug}` : "/products"}
                          className="line-clamp-2 text-theme-sm font-semibold text-gray-900 hover:text-brand-500 dark:text-white">
                          {p?.name ?? `Sản phẩm #${it.productId}`}
                        </Link>
                        <p className="mt-1 text-theme-sm font-bold text-brand-600">
                          {formatVND(unitPrice)}
                          {p?.discount ? (
                            <span className="ml-2 text-theme-xs text-gray-400 line-through">{formatVND(p.price)}</span>
                          ) : null}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700">
                            <button onClick={() => updateQty(it.productId, it.quantity - 1)}
                              className="flex h-8 w-8 items-center justify-center text-gray-500 hover:text-brand-500">−</button>
                            <span className="w-10 text-center text-theme-sm font-semibold">{it.quantity}</span>
                            <button onClick={() => updateQty(it.productId, it.quantity + 1)}
                              className="flex h-8 w-8 items-center justify-center text-gray-500 hover:text-brand-500">+</button>
                          </div>
                          <button onClick={() => updateQty(it.productId, 0)}
                            className="text-theme-xs text-error-500 hover:underline">Xóa</button>
                        </div>
                      </div>
                      <div className="text-right text-theme-sm font-bold text-gray-900 dark:text-white">
                        {formatVND(unitPrice * it.quantity)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            // CHECKOUT FORM — Guest
            <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Thông tin nhận hàng</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Họ tên *" value={form.fullName}
                  onChange={(v) => setForm({ ...form, fullName: v })} />
                <Field label="Số điện thoại *" value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })} />
                <Field label="Email (để nhận hóa đơn)" value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })} className="md:col-span-2" />
                <Field label="Địa chỉ chi tiết *" value={form.address}
                  onChange={(v) => setForm({ ...form, address: v })} className="md:col-span-2" />
                <Field label="Phường/Xã" value={form.ward}
                  onChange={(v) => setForm({ ...form, ward: v })} />
                <Field label="Quận/Huyện" value={form.district}
                  onChange={(v) => setForm({ ...form, district: v })} />
                <Field label="Tỉnh/Thành phố" value={form.city}
                  onChange={(v) => setForm({ ...form, city: v })} className="md:col-span-2" />
              </div>

              <div>
                <label className="text-theme-xs font-medium text-gray-500">Phương thức thanh toán</label>
                <select value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900">
                  {PAYMENT_METHODS.filter((p) => p.value !== "wallet").map((p) =>
                    <option key={p.value} value={p.value}>{p.label}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-theme-xs font-medium text-gray-500">Phương thức giao hàng</label>
                <select value={form.shippingMethod}
                  onChange={(e) => setForm({ ...form, shippingMethod: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900">
                  {SHIPPING_METHODS.map((s) =>
                    <option key={s.value} value={s.value}>{s.label}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-theme-xs font-medium text-gray-500">Ghi chú</label>
                <textarea value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ghi chú cho người giao hàng..."
                  className="mt-1 min-h-[60px] w-full rounded-lg border border-gray-200 px-3 py-2 text-theme-sm dark:border-gray-700 dark:bg-gray-900" />
              </div>
            </div>
          )}
        </div>

        {/* ── Right: summary ── */}
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tóm tắt đơn hàng</h3>
          <Row label={`Tạm tính (${items.length} sản phẩm)`} value={formatVND(subTotal)} />
          <Row label="Phí giao hàng" value={shipping === 0 ? "Miễn phí" : formatVND(shipping)} />
          <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
          <Row label="Tổng cộng" value={formatVND(total)} bold />

          {step === "cart" ? (
            <button onClick={() => setStep("checkout")}
              disabled={items.length === 0}
              className="mt-3 h-11 w-full rounded-xl bg-brand-500 text-theme-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
              Tiếp tục thanh toán →
            </button>
          ) : (
            <>
              <button onClick={() => void placeOrder()} disabled={placing}
                className="mt-3 h-11 w-full rounded-xl bg-brand-500 text-theme-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
                {placing ? "Đang đặt..." : "Đặt hàng"}
              </button>
              <button onClick={() => setStep("cart")}
                className="h-10 w-full rounded-xl border border-gray-200 text-theme-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">
                ← Quay lại giỏ hàng
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, className,
}: {
  label: string; value: string;
  onChange: (v: string) => void; className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-theme-xs font-medium text-gray-500">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900" />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between text-theme-sm",
      bold ? "text-base font-bold text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
