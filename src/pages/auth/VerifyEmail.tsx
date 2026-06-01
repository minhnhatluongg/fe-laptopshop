import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "@/api/auth.api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

type State = "verifying" | "success" | "expired" | "invalid";

export default function VerifyEmailPage() {
  const [params]      = useSearchParams();
  const token         = params.get("token") ?? "";
  const navigate      = useNavigate();
  const { refresh }   = useAuth();
  const toast         = useToast();

  const [state, setState]         = useState<State>("verifying");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent]       = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (!token || done.current) return;
    done.current = true;

    authApi.verifyEmail(token)
      .then(async (auth) => {
        // Store tokens via AuthContext refresh
        localStorage.setItem(
          import.meta.env.VITE_TOKEN_STORAGE_KEY || "ls_auth_v1",
          JSON.stringify({
            accessToken:           auth.accessToken,
            refreshToken:          auth.refreshToken,
            accessTokenExpiration: auth.accessTokenExpiration,
          }),
        );
        await refresh();
        setState("success");
        toast.success("Xác minh thành công!", `Chào mừng ${auth.user?.fullName ?? "bạn"}!`);
        setTimeout(() => navigate("/", { replace: true }), 2500);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "";
        setState(msg === "LINK_EXPIRED" ? "expired" : "invalid");
      });
  }, [token]);

  const handleResend = async () => {
    if (!resendEmail.trim()) return;
    setResending(true);
    try {
      await authApi.resendVerification(resendEmail.trim().toLowerCase());
      setResent(true);
      toast.success("Đã gửi lại!", "Kiểm tra hộp thư của bạn.");
    } catch (e) {
      toast.error("Gửi thất bại", e instanceof Error ? e.message : undefined);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] text-center">

        {/* ── Verifying ── */}
        {state === "verifying" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15">
              <svg className="h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Đang xác minh...</h1>
            <p className="mt-2 text-theme-sm text-gray-500">Vui lòng chờ trong giây lát.</p>
          </>
        )}

        {/* ── Success ── */}
        {state === "success" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/15">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" className="text-success-500">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Email đã được xác minh!</h1>
            <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
              Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng về trang chủ...
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div className="h-full bg-success-500 animate-[grow_2.5s_linear_forwards] rounded-full"
                style={{ animation: "width 2.5s linear forwards" }} />
            </div>
          </>
        )}

        {/* ── Expired ── */}
        {state === "expired" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-500/15">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="text-warning-500">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Link đã hết hạn</h1>
            <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
              Link xác minh chỉ có hiệu lực trong 24 giờ. Vui lòng nhập email để nhận link mới.
            </p>
            {!resent ? (
              <div className="mt-5 space-y-3">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleResend()}
                  placeholder="your@email.com"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 focus:border-brand-400 focus:outline-none"
                />
                <button type="button" onClick={handleResend} disabled={resending || !resendEmail.trim()}
                  className="h-11 w-full rounded-lg bg-brand-500 text-theme-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                  {resending ? "Đang gửi..." : "Gửi lại link xác minh"}
                </button>
              </div>
            ) : (
              <div className="mt-5 rounded-xl bg-success-50 p-3 text-theme-sm text-success-600 dark:bg-success-500/10 dark:text-success-400">
                ✓ Đã gửi! Kiểm tra hộp thư của bạn.
              </div>
            )}
          </>
        )}

        {/* ── Invalid ── */}
        {state === "invalid" && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/15">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="text-error-500">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Link không hợp lệ</h1>
            <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
              Link này đã được sử dụng hoặc không hợp lệ.
            </p>
          </>
        )}

        {/* Common footer */}
        {state !== "verifying" && state !== "success" && (
          <div className="mt-6 flex justify-center gap-4 text-theme-sm">
            <Link to="/auth/login" className="text-brand-500 hover:text-brand-600 font-medium">
              Đăng nhập
            </Link>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <Link to="/auth/register" className="text-gray-500 hover:text-gray-700">
              Đăng ký lại
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
