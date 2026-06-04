import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cartApi } from "@/api/cart.api";
import { walletApi } from "@/api/wallet.api";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { formatVND } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { CartItem, ShoppingCart, WalletDto } from "@/api/types";

const navLinks = [
  { label: "Trang chủ",   to: "/" },
  { label: "Sản phẩm",    to: "/products" },
  { label: "Thương hiệu", to: "/brands" },
  { label: "Khuyến mãi",       to: "/sale" },
  { label: "Liên hệ",          to: "/contact" },
  { label: "Tra cứu bảo hành", to: "/warranty" },
];

export function PublicHeader() {
  const { user, isAuthenticated, loading, logout } = useAuth();

  // ── Cart mini-popup ─────────────────────────────────────────────────────
  const [cartCount, setCartCount]   = useState(0);
  const [cartData,  setCartData]    = useState<ShoppingCart | null>(null);
  const [cartOpen,  setCartOpen]    = useState(false);
  const cartHoverTimer              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartContainerRef            = useRef<HTMLDivElement>(null);

  const loadCart = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [count, cart] = await Promise.all([cartApi.count(), cartApi.get()]);
      setCartCount(count);
      setCartData(cart);
    } catch { /* silent */ }
  }, [isAuthenticated]);

  /** Đọc tổng số item từ guest_cart trong localStorage (cho khách chưa login). */
  const readGuestCartCount = (): number => {
    try {
      const raw = localStorage.getItem("guest_cart");
      if (!raw) return 0;
      const items: Array<{ quantity: number }> = JSON.parse(raw);
      return items.reduce((s, i) => s + (i.quantity ?? 0), 0);
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      // Guest: lấy count từ localStorage
      setCartCount(readGuestCartCount());
      setCartData(null);
      return;
    }
    void loadCart();
  }, [isAuthenticated, loadCart]);

  const onCartMouseEnter = () => {
    if (cartHoverTimer.current) clearTimeout(cartHoverTimer.current);
    cartHoverTimer.current = setTimeout(() => setCartOpen(true), 120);
  };
  const onCartMouseLeave = () => {
    if (cartHoverTimer.current) clearTimeout(cartHoverTimer.current);
    cartHoverTimer.current = setTimeout(() => setCartOpen(false), 200);
  };

  // close cart popup on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!cartContainerRef.current?.contains(e.target as Node)) setCartOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Wallet balance ──────────────────────────────────────────────────────
  const [wallet, setWallet] = useState<WalletDto | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setWallet(null); return; }
    walletApi.getMyWallet().then(setWallet).catch(() => setWallet(null));
  }, [isAuthenticated]);

  // Lắng nghe cart:updated (auth) + cart:guest-updated (guest) → update badge real-time
  useEffect(() => {
    const authHandler = (e: Event) => {
      const delta = (e as CustomEvent<{ delta: number }>).detail?.delta ?? 1;
      setCartCount((c) => Math.max(0, c + delta));
      void loadCart();
    };
    const guestHandler = (e: Event) => {
      const totalQty = (e as CustomEvent<{ totalQty: number }>).detail?.totalQty;
      setCartCount(typeof totalQty === "number" ? totalQty : readGuestCartCount());
    };
    window.addEventListener("cart:updated", authHandler);
    window.addEventListener("cart:guest-updated", guestHandler);
    return () => {
      window.removeEventListener("cart:updated", authHandler);
      window.removeEventListener("cart:guest-updated", guestHandler);
    };
  }, [loadCart]);

  const navigate  = useNavigate();

  // Fix issue #6: compute isAdmin trực tiếp từ user.role (case-insensitive)
  // Tránh timing issue khi useMemo context chưa update kịp sau navigation
  const isAdmin = !!user && ["admin", "manager"].includes(user.role?.toLowerCase() ?? "");

  const [mobileOpen, setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Fix issue #1: dùng 1 container ref bao cả button + dropdown
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuContainerRef.current?.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  // Fix #2: Avatar display — show real image if exists
  const AvatarDisplay = ({
    size = "sm",
  }: {
    size?: "sm" | "md";
  }) => {
    const cls = size === "sm"
      ? "h-7 w-7 text-theme-xs"
      : "h-10 w-10 text-sm";

    if (user?.avatarUrl) {
      return (
        <img
          src={getImageUrl(user.avatarUrl)}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          alt={user.fullName}
          className={cn(cls, "rounded-full object-cover ring-1 ring-white/20")}
        />
      );
    }
    return (
      <div className={cn(
        cls,
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-bold text-white",
      )}>
        {user?.fullName?.charAt(0)?.toUpperCase() ?? "U"}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/85 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/85">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-6 px-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="12" rx="2" />
              <path d="M2 20h20" />
            </svg>
          </div>
          <span className="font-outfit text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            LaptopShop
          </span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "relative px-3 py-2 text-theme-sm transition-colors",
                  isActive
                    ? "font-semibold text-gray-900 after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-brand-500 dark:text-white"
                    : "font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggleButton />

          {/* ── Mini cart hover popup ── */}
          <div className="relative"
            ref={cartContainerRef}
            onMouseEnter={onCartMouseEnter}
            onMouseLeave={onCartMouseLeave}>
            <Link
              to="/cart"
              aria-label="Giỏ hàng"
              data-cart-icon
              className="relative flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39A2 2 0 0 0 9.62 16h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white leading-none">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* Popup */}
            {cartOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                  <span className="font-outfit text-base font-semibold text-gray-900 dark:text-white">
                    Giỏ hàng {cartCount > 0 && <span className="ml-1 text-theme-xs font-normal text-gray-400">({cartCount} sản phẩm)</span>}
                  </span>
                </div>

                {!cartData?.items?.length ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-theme-sm text-gray-400">Giỏ hàng trống</p>
                    <Link to="/products" onClick={() => setCartOpen(false)}
                      className="mt-3 inline-flex text-theme-sm font-medium text-brand-500 hover:text-brand-600">
                      Khám phá sản phẩm →
                    </Link>
                  </div>
                ) : (
                  <>
                    <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto custom-scrollbar dark:divide-gray-800">
                      {cartData.items.slice(0, 6).map((item: CartItem) => {
                        const itemTotal = item.totalPrice ?? item.unitPrice * item.quantity;
                        const imgSrc = item.productImageUrl ? getImageUrl(item.productImageUrl) : IMAGE_PLACEHOLDER;
                        return (
                          <li key={item.id} className="group flex items-center gap-3 px-4 py-2.5">
                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                              <img src={imgSrc} onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
                                alt="" className="h-full w-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                                {item.productName || `#${item.productId}`}
                              </p>
                              <p className="mt-0.5 text-theme-xs text-gray-400">
                                ×{item.quantity} · {formatVND(item.unitPrice)}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span className="text-theme-sm font-semibold text-brand-600 dark:text-brand-400">
                                {formatVND(itemTotal)}
                              </span>
                              {/* Nút xoá — hiện khi hover */}
                              <button
                                type="button"
                                title="Xoá khỏi giỏ"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    await cartApi.removeItem(item.id);
                                    await loadCart();
                                  } catch { /* silent */ }
                                }}
                                className="flex h-5 w-5 items-center justify-center rounded-full text-gray-300 opacity-0 transition-all hover:bg-error-50 hover:text-error-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Subtotal + CTA */}
                    <div className="border-t border-gray-100 p-4 dark:border-gray-800">
                      <div className="mb-3 flex items-center justify-between text-theme-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          Tạm tính ({cartCount} SP)
                        </span>
                        <span className="font-outfit font-bold text-gray-900 dark:text-white">
                          {formatVND(cartData.items.reduce((s, i: CartItem) => s + (i.totalPrice ?? i.unitPrice * i.quantity), 0))}
                        </span>
                      </div>
                      <Link
                        to="/cart"
                        onClick={() => setCartOpen(false)}
                        className="flex h-11 w-full items-center justify-center rounded-xl bg-brand-500 text-theme-sm font-semibold text-white hover:bg-brand-600 transition-colors"
                      >
                        Xem giỏ hàng & thanh toán →
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Fix #1: relative ở wrapper nhỏ này → right-0 sẽ căn đúng button */}
          {!loading && isAuthenticated ? (
            <div className="relative" ref={menuContainerRef}>
              {/* Trigger button */}
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                <AvatarDisplay size="sm" />
                <span className="hidden max-w-[110px] truncate md:inline">
                  {user?.fullName}
                </span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  className={cn("transition-transform duration-200", userMenuOpen && "rotate-180")}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Dropdown — right-0 căn cạnh phải của wrapper */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900">
                  {/* Fix #5: click header → trang account */}
                  <Link
                    to="/account"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                  >
                    <AvatarDisplay size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-theme-sm font-semibold text-gray-900 dark:text-white">
                        {user?.fullName}
                      </p>
                      <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </p>
                      {/* Fix #6: badge role */}
                      {isAdmin && (
                        <span className="mt-0.5 inline-block rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                          {user?.role}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Wallet balance card */}
                  <Link
                    to="/account/wallet"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center justify-between border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/15">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500 dark:text-brand-400">
                          <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                          <circle cx="17" cy="15" r="1" fill="currentColor"/>
                        </svg>
                      </span>
                      <div>
                        <p className="text-theme-xs font-medium text-gray-600 dark:text-gray-400">Ví LaptopShop</p>
                        <p className="font-outfit text-base font-bold text-brand-600 dark:text-brand-400">
                          {wallet != null ? formatVND(wallet.balance) : "—"}
                        </p>
                      </div>
                    </div>
                    <span className="text-theme-xs text-brand-500 dark:text-brand-400">Nạp tiền →</span>
                  </Link>

                  {/* Admin Dashboard — chỉ hiện sau khi auth resolve */}
                  {isAdmin && (
                    <div className="border-b border-gray-100 p-1.5 dark:border-gray-800">
                      <MenuItem
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        icon={<DashboardIcon />}
                        label="Vào Dashboard"
                        desc="Admin Panel"
                        accent
                      />
                    </div>
                  )}

                  {/* Menu items */}
                  <ul className="p-1.5">
                    <MenuItem
                      to="/account"
                      onClick={() => setUserMenuOpen(false)}
                      icon={<UserIcon />}
                      label="Tài khoản"
                      desc="Thông tin cá nhân"
                    />
                    <MenuItem
                      to="/account/orders"
                      onClick={() => setUserMenuOpen(false)}
                      icon={<OrderIcon />}
                      label="Đơn hàng"
                      desc="Theo dõi đơn hàng"
                    />
                    <MenuItem
                      to="/account/wallet"
                      onClick={() => setUserMenuOpen(false)}
                      icon={<WalletIcon />}
                      label="Ví của tôi"
                      desc={wallet != null ? formatVND(wallet.balance) : "Số dư & lịch sử"}
                    />
                  </ul>

                  {/* Logout */}
                  <div className="border-t border-gray-100 p-1.5 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-theme-sm font-medium text-error-500 transition hover:bg-error-50 dark:hover:bg-error-500/10"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-error-50 dark:bg-error-500/15">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                      </span>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : !loading ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/auth/login"
                className="inline-flex h-11 items-center rounded-lg px-3 text-theme-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Đăng nhập
              </Link>
              <Link
                to="/auth/register"
                className="inline-flex h-11 items-center rounded-lg bg-brand-500 px-4 text-theme-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
              >
                Đăng ký
              </Link>
            </div>
          ) : (
            // Placeholder skeleton khi đang load auth — tránh layout shift
            <div className="h-11 w-32 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-white/5"
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t border-gray-200 bg-white px-4 py-3 lg:hidden dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2 text-theme-sm font-medium",
                    isActive
                      ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-theme-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/[0.12]"
              >
                <DashboardIcon />
                Vào Dashboard
              </Link>
            )}
            {!isAuthenticated && (
              <div className="mt-2 flex gap-2">
                <Link to="/auth/login" onClick={() => setMobileOpen(false)}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg border border-gray-200 text-theme-sm font-medium dark:border-gray-800">
                  Đăng nhập
                </Link>
                <Link to="/auth/register" onClick={() => setMobileOpen(false)}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-500 text-theme-sm font-medium text-white">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

// ─── MenuItem ──────────────────────────────────────────────────────────────────
function MenuItem({ to, onClick, icon, label, desc, accent }: {
  to: string; onClick: () => void; icon: ReactNode;
  label: string; desc?: string; accent?: boolean;
}) {
  return (
    <li>
      <Link to={to} onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
          accent
            ? "text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/[0.12]"
            : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5",
        )}
      >
        <span className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          accent
            ? "bg-brand-50 text-brand-500 dark:bg-brand-500/15"
            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
        )}>
          {icon}
        </span>
        <span>
          <span className="block text-theme-sm font-medium">{label}</span>
          {desc && <span className="block text-theme-xs text-gray-400 dark:text-gray-500">{desc}</span>}
        </span>
      </Link>
    </li>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
function UserIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function OrderIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
}
function WalletIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="17" cy="15" r="1" fill="currentColor"/></svg>;
}
function DashboardIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
}
