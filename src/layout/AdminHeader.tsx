import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";

export function AdminHeader() {
  const { toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex w-full items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:px-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="relative hidden md:block">
          <input
            type="search"
            placeholder="Tìm kiếm..."
            className="h-11 w-80 rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-theme-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggleButton />

        <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-1.5 dark:border-gray-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-theme-sm font-semibold text-white">
            {user?.fullName?.charAt(0)?.toUpperCase() ?? "A"}
          </div>
          <div className="hidden md:block">
            <div className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {user?.fullName ?? "Admin"}
            </div>
            <div className="text-theme-xs text-gray-500 dark:text-gray-400">
              {user?.role ?? "Admin"}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="text-theme-xs font-medium text-gray-500 hover:text-error-500"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
