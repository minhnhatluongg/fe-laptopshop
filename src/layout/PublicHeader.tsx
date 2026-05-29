import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { cn } from "@/utils/cn";

const navLinks = [
  { label: "Trang chủ",    to: "/" },
  { label: "Sản phẩm",     to: "/products" },
  { label: "Thương hiệu",  to: "/brands" },
  { label: "Khuyến mãi",   to: "/sale" },
  { label: "Liên hệ",      to: "/contact" },
];

export function PublicHeader() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null); // dropdown panel
  const userBtnRef  = useRef<HTMLButtonElement>(null); // trigger button

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inBtn      = userBtnRef.current?.contains(target);
      const inDropdown = userMenuRef.current?.contains(target);
      if (!inBtn && !inDropdown) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-6 px-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="12" rx="2" />
              <path d="M2 20h20" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            LaptopShop
          </span>
        </Link>

        {/* Nav (desktop) */}
        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-theme-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
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

          <Link
            to="/cart"
            aria-label="Giỏ hàng"
            className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39A2 2 0 0 0 9.62 16h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </Link>

          {isAuthenticated ? (
            <div className="relative">
              <button
                ref={userBtnRef}
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-theme-xs font-bold text-white">
                  {user?.fullName?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <span className="hidden max-w-[110px] truncate md:inline">
                  {user?.fullName}
                </span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  className={cn("transition-transform", userMenuOpen && "rotate-180")}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {userMenuOpen && (
                <div ref={userMenuRef} className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900">
                  {/* User info header */}
                  <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5 dark:border-gray-800">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white shadow-sm">
                      {user?.fullName?.charAt(0)?.toUpperCase() ?? "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-theme-sm font-semibold text-gray-900 dark:text-white">
                        {user?.fullName}
                      </p>
                      <p className="truncate text-theme-xs text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  {/* Admin Dashboard — hiển thị theo role */}
                  {isAdmin && (
                    <div className="border-b border-gray-100 p-1.5 dark:border-gray-800">
                      <MenuItem
                        to="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        icon={<DashboardIcon />}
                        label="Vào Dashboard"
                        desc={`${user?.role} Panel`}
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
                      desc="Số dư & lịch sử giao dịch"
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
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/auth/login"
                className="inline-flex h-11 items-center rounded-lg border border-gray-200 px-4 text-theme-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Đăng nhập
              </Link>
              <Link
                to="/auth/register"
                className="inline-flex h-11 items-center rounded-lg bg-brand-500 px-4 text-theme-sm font-medium text-white hover:bg-brand-600"
              >
                Đăng ký
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 lg:hidden dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
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
            {!isAuthenticated && (
              <div className="mt-2 flex gap-2">
                <Link
                  to="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg border border-gray-200 text-theme-sm font-medium dark:border-gray-800"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 flex-1 items-center justify-center rounded-lg bg-brand-500 text-theme-sm font-medium text-white"
                >
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
function MenuItem({
  to, onClick, icon, label, desc, accent,
}: {
  to: string;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  desc?: string;
  accent?: boolean;
}) {
  return (
    <li>
      <Link
        to={to}
        onClick={onClick}
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

// ─── Icons ────────────────────────────────────────────────────────────────────
function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function OrderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
      <circle cx="17" cy="15" r="1" fill="currentColor"/>
    </svg>
  );
}
function AdminIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1l9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V5l9-4z"/>
    </svg>
  );
}
function DashboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}
