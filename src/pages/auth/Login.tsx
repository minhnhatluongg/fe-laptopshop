import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth.api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending]       = useState(false);
  const [resent, setResent]             = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login({ email, password, rememberMe: remember });
      toast.success(`Chào mừng, ${user.fullName}!`, "Đăng nhập thành công.");
      const to = redirectTo === "/auth/login" ? "/" : redirectTo;
      navigate(["Admin", "Manager"].includes(user.role) ? "/admin" : to, {
        replace: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại";
      if (msg === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(email);
        setError(null);
      } else {
        setError(msg);
        toast.error("Đăng nhập thất bại", msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
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

        <h1 className="mt-6 text-title-sm font-bold text-gray-900 dark:text-white">
          Đăng nhập
        </h1>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
          Chào mừng trở lại! Nhập email và mật khẩu để tiếp tục.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
            />
          </div>

          <div>
            <label className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-theme-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              Ghi nhớ đăng nhập
            </label>
            <Link
              to="/auth/forgot"
              className="text-theme-sm font-medium text-brand-500 hover:text-brand-600"
            >
              Quên mật khẩu?
            </Link>
          </div>

          {error && (
            <div className="rounded-lg bg-error-50 px-3 py-2 text-theme-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
              {error}
            </div>
          )}

          {unverifiedEmail && (
            <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10">
              <p className="text-theme-sm font-medium text-warning-700 dark:text-warning-300">
                ⚠️ Email chưa được xác minh
              </p>
              <p className="mt-1 text-theme-xs text-warning-600 dark:text-warning-400">
                Kiểm tra hộp thư <strong>{unverifiedEmail}</strong> và nhấn link xác minh.
              </p>
              {!resent ? (
                <button
                  type="button"
                  disabled={resending}
                  onClick={async () => {
                    setResending(true);
                    try {
                      await authApi.resendVerification(unverifiedEmail);
                      setResent(true);
                      toast.success("Đã gửi lại!", "Kiểm tra hộp thư của bạn.");
                    } catch {
                      toast.error("Gửi thất bại");
                    } finally { setResending(false); }
                  }}
                  className="mt-2 text-theme-xs font-medium text-warning-700 underline hover:text-warning-800 disabled:opacity-50 dark:text-warning-300"
                >
                  {resending ? "Đang gửi..." : "Gửi lại email xác minh →"}
                </button>
              ) : (
                <p className="mt-2 text-theme-xs font-medium text-success-600">✓ Đã gửi lại email xác minh.</p>
              )}
            </div>
          )}

          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? "Đang xử lý..." : "Đăng nhập"}
          </Button>
        </form>

        <p className="mt-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
          Chưa có tài khoản?{" "}
          <Link to="/auth/register" className="font-medium text-brand-500 hover:text-brand-600">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
