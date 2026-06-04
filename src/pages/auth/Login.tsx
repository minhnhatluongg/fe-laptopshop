import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth.api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { AuthShell, AuthInput, AuthIcons } from "./AuthShell";

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
    <AuthShell>
      <h1 className="text-title-sm font-bold tracking-tight text-gray-900 dark:text-white">
        Đăng nhập
      </h1>
      <p className="mt-1.5 text-theme-sm text-gray-500 dark:text-gray-400">
        Chào mừng trở lại! Nhập email và mật khẩu để tiếp tục.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <AuthInput
          icon={<AuthIcons.email />}
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
        />

        <AuthInput
          icon={<AuthIcons.lock />}
          label="Mật khẩu"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          placeholder="Nhập mật khẩu"
        />

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-theme-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-brand-500"
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
          <div className="flex items-start gap-2.5 rounded-xl border border-error-200 bg-error-50 px-3.5 py-3 text-theme-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {unverifiedEmail && (
          <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10">
            <p className="flex items-center gap-2 text-theme-sm font-medium text-warning-700 dark:text-warning-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Email chưa được xác minh
            </p>
            <p className="mt-1.5 text-theme-xs text-warning-600 dark:text-warning-400">
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
                className="mt-2 text-theme-xs font-semibold text-warning-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-warning-300"
              >
                {resending ? "Đang gửi..." : "Gửi lại email xác minh"}
              </button>
            ) : (
              <p className="mt-2 text-theme-xs font-medium text-success-600">Đã gửi lại email xác minh.</p>
            )}
          </div>
        )}

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Đang xử lý..." : "Đăng nhập"}
        </Button>
      </form>

      <p className="mt-7 text-center text-theme-sm text-gray-500 dark:text-gray-400">
        Chưa có tài khoản?{" "}
        <Link to="/auth/register" className="font-semibold text-brand-500 hover:text-brand-600">
          Đăng ký ngay
        </Link>
      </p>
    </AuthShell>
  );
}
