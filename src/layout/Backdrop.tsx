import { useSidebar } from "@/context/SidebarContext";

export function Backdrop() {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();
  if (!isMobileOpen) return null;
  return (
    <div
      onClick={toggleMobileSidebar}
      className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm lg:hidden"
    />
  );
}
