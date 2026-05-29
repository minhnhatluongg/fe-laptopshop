import { Outlet } from "react-router-dom";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { Backdrop } from "./Backdrop";
import { cn } from "@/utils/cn";

function AdminShell() {
  const { isExpanded, isHovered } = useSidebar();
  const expanded = isExpanded || isHovered;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AdminSidebar />
      <Backdrop />
      <div
        className={cn(
          "transition-all duration-300",
          expanded ? "lg:ml-[290px]" : "lg:ml-[90px]",
        )}
      >
        <AdminHeader />
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <SidebarProvider>
      <AdminShell />
    </SidebarProvider>
  );
}
