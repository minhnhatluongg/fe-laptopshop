import { Outlet } from "react-router-dom";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
