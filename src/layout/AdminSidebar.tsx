import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import { cn } from "@/utils/cn";

interface NavItem {
  key: string;
  label: string;
  to: string;
  icon: ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const Icon = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const navGroups: NavGroup[] = [
  {
    title: "Tổng quan",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        to: "/admin",
        icon: <Icon d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />,
      },
    ],
  },
  {
    title: "Sản phẩm",
    items: [
      {
        key: "products",
        label: "Sản phẩm",
        to: "/admin/products",
        icon: <Icon d="M20 7l-8-4-8 4 8 4 8-4zM4 7v10l8 4 8-4V7" />,
      },
      {
        key: "categories",
        label: "Danh mục",
        to: "/admin/categories",
        icon: <Icon d="M4 6h16M4 12h16M4 18h7" />,
      },
      {
        key: "brands",
        label: "Thương hiệu",
        to: "/admin/brands",
        icon: <Icon d="M20.59 13.41L13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" />,
      },
      {
        key: "inventory",
        label: "Tồn kho",
        to: "/admin/inventory",
        icon: <Icon d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />,
      },
      {
        key: "banners",
        label: "Banner",
        to: "/admin/banners",
        icon: <Icon d="M4 5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4zM3 13h18M3 17h18" />,
      },
      {
        key: "showrooms",
        label: "Showroom",
        to: "/admin/showrooms",
        icon: <Icon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" />,
      },
    ],
  },
  {
    title: "Bán hàng",
    items: [
      {
        key: "orders",
        label: "Đơn hàng",
        to: "/admin/orders",
        icon: <Icon d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 1 1-8 0" />,
      },
    ],
  },
  {
    title: "Người dùng",
    items: [
      {
        key: "users",
        label: "Users",
        to: "/admin/users",
        icon: <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
      },
      {
        key: "roles",
        label: "Phân quyền",
        to: "/admin/roles",
        icon: <Icon d="M12 1l9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V5l9-4z" />,
      },
    ],
  },
];

export function AdminSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const { pathname } = useLocation();
  const expanded = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white text-gray-900 transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white",
        expanded ? "w-[290px]" : "w-[90px]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-6 py-6", !expanded && "justify-center px-0")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M2 20h20" />
          </svg>
        </div>
        {expanded && (
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900 dark:text-white">LaptopShop</span>
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">Admin Panel</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-6">
            {expanded && (
              <h4 className="mb-3 px-3 text-theme-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {group.title}
              </h4>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.to ||
                  (item.to !== "/admin" && pathname.startsWith(item.to));
                return (
                  <li key={item.key}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/admin"}
                      onClick={() => isMobileOpen && toggleMobileSidebar()}
                      className={cn(
                        "menu-item",
                        active ? "menu-item-active" : "menu-item-inactive",
                        !expanded && "justify-center",
                      )}
                      title={!expanded ? item.label : undefined}
                    >
                      <span
                        className={cn(
                          "menu-item-icon",
                          active && "menu-item-icon-active",
                        )}
                      >
                        {item.icon}
                      </span>
                      {expanded && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer card */}
      {expanded && (
        <div className="mx-4 mb-6 rounded-2xl bg-gray-50 p-4 dark:bg-white/[0.03]">
          <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            Cần hỗ trợ?
          </p>
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            Liên hệ team kỹ thuật để được hướng dẫn.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-brand-500 px-3 text-theme-sm font-medium text-white hover:bg-brand-600"
          >
            Liên hệ
          </button>
        </div>
      )}
    </aside>
  );
}
