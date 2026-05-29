import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface Props {
  children: React.ReactNode;
}

export function RequireAuth({ children }: Props) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullscreenSpinner />;
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: Props) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullscreenSpinner />;
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function FullscreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
    </div>
  );
}
