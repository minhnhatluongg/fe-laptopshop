import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/api/auth.api";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { LegalModal, type LegalDoc } from "@/components/legal/LegalModal";
import { cn } from "@/utils/cn";
import { AuthShell, AuthInput, AuthIcons } from "./AuthShell";

// ── Password strength (5 criteria, matches backend validation) ───────────────
const PW_RULES = [
  { label: "Tối thiểu 8 ký tự",      test: (p: string) => p.length >= 8 },
  { label: "Có chữ hoa (A-Z)",        test: (p: string) => /[A-Z]/.test(p) },
  { label: "Có chữ thường (a-z)",     test: (p: string) => /[a-z]/.test(p) },
  { label: "Có số (0-9)",             test: (p: string) => /[0-9]/.test(p) },
  { label: "Có ký tự đặc biệt (!@#)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(pw: string) {
  return PW_RULES.filter(r => r.test(pw)).length; // 0-5
}

const STRENGTH_CFG = [
  { label: "",           bar: "w-0",    cls: "",                   fill: "" },
  { label: "Rất yếu",   bar: "w-1/5",  cls: "text-error-500",     fill: "bg-error-500" },
  { label: "Yếu",       bar: "w-2/5",  cls: "text-error-400",     fill: "bg-error-400" },
  { label: "Trung bình",bar: "w-3/5",  cls: "text-warning-500",   fill: "bg-warning-500" },
  { label: "Khá",       bar: "w-4/5",  cls: "text-blue-500",      fill: "bg-blue-500" },
  { label: "Mạnh",      bar: "w-full", cls: "text-success-500",   fill: "bg-success-500" },
];

// ── Parse server validation errors (ASP.NET or our ApiResponse) ───────────────
function parseServerErrors(err: unknown): string[] {
  const axErr = err as { response?: { data?: unknown } };
  if (axErr?.response?.data) {
    const d = axErr.response.data as Record<string, unknown>;
    // ASP.NET ModelState: { errors: { Password: ["msg"], Email: ["msg"] } }
    if (d.errors && typeof d.errors === "object" && !Array.isArray(d.errors)) {
      const msgs = Object.values(d.errors as Record<string, string[]>).flat();
      if (msgs.length) return msgs;
    }
    // Our ApiResponse: { errors: ["msg1"] }
    if (Array.isArray(d.errors) && d.errors.length) return d.errors as string[];
    // Our ApiResponse message
    if (typeof d.message === "string" && d.message) return [d.message];
  }
  return [err instanceof Error ? err.message : "Đăng ký thất bại"];
}

// ── Check-email screen ────────────────────────────────────────────────────────
function CheckEmailScreen({ email }: { email: string }) {
  const toast = useToast();
  const [resending, setResending] = useState(false);
  const [resent, setResent]       = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await authApi.resendVerification(email);
      setResent(true);
      toast.success("Đã gửi lại!", "Kiểm tra hộp thư của bạn.");
    } catch (e) {
      toast.error("Gửi thất bại", e instanceof Error ? e.message : undefined);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/15">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
          strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>
      <h1 className="text-title-sm font-bold tracking-tight text-gray-900 dark:text-white">Kiểm tra email của bạn</h1>
      <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
        Chúng tôi đã gửi link xác minh đến
      </p>
      <p className="mt-1 font-semibold text-gray-800 dark:text-white">{email}</p>

      <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-4 text-left dark:border-brand-500/20 dark:bg-brand-500/10">
        <p className="text-theme-sm font-medium text-brand-700 dark:text-brand-300">Các bước tiếp theo:</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-theme-sm text-brand-600 dark:text-brand-400">
          <li>Mở email vừa nhận</li>
          <li>Nhấn nút <strong>"Xác minh email ngay"</strong></li>
          <li>Bạn sẽ được đăng nhập tự động</li>
        </ol>
      </div>

      <p className="mt-5 text-theme-xs text-gray-400">
        Không nhận được email? Kiểm tra thư mục Spam.
      </p>
      <button type="button" onClick={handleResend} disabled={resending || resent}
        className="mt-2 text-theme-sm font-semibold text-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50">
        {resent ? "Đã gửi lại" : resending ? "Đang gửi..." : "Gửi lại email xác minh"}
      </button>

      <div className="mt-6">
        <Link to="/auth/login" className="text-theme-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}

const GENDERS = [
  { value: "Male",   label: "Nam" },
  { value: "Female", label: "Nữ" },
  { value: "Other",  label: "Khác" },
];

// ── Main ─────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const toast = useToast();

  const [step, setStep] = useState<"form" | "success">("form");

  // Form state
  const [firstName,       setFirstName]       = useState("");
  const [lastName,        setLastName]        = useState("");
  const [email,           setEmail]           = useState("");
  const [phone,           setPhone]           = useState("");
  const [gender,          setGender]          = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed,          setAgreed]          = useState(false);
  const [legalDoc,        setLegalDoc]        = useState<LegalDoc | null>(null);

  // Email availability check
  type EmailStatus = "idle" | "checking" | "available" | "taken" | "invalid";
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkEmail = useCallback(async (val: string) => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(val)) { setEmailStatus("invalid"); return; }
    setEmailStatus("checking");
    try {
      const res = await authApi.checkEmail(val.trim().toLowerCase());
      setEmailStatus(res.available ? "available" : "taken");
    } catch {
      setEmailStatus("idle");
    }
  }, []);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailStatus("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length > 4) {
      debounceRef.current = setTimeout(() => void checkEmail(val.trim()), 600);
    }
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Validation errors
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [submitting, setSubmitting]   = useState(false);

  const pwStrength = getStrength(password);
  const strengthCfg = STRENGTH_CFG[pwStrength];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "Vui lòng nhập họ";
    if (!lastName.trim())  e.lastName  = "Vui lòng nhập tên";
    if (!email.trim())     e.email     = "Vui lòng nhập email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email không hợp lệ";
    else if (emailStatus === "taken") e.email = "Email này đã được đăng ký. Vui lòng dùng email khác.";
    if (phone && !/^(0[3|5|7|8|9])+([0-9]{8})$/.test(phone.replace(/\s/g, "")))
      e.phone = "Số điện thoại Việt Nam không hợp lệ (VD: 0901234567)";
    if (!password) {
      e.password = "Vui lòng nhập mật khẩu";
    } else {
      const failedRules = PW_RULES.filter(r => !r.test(password));
      if (failedRules.length > 0)
        e.password = `Thiếu: ${failedRules.map(r => r.label.toLowerCase()).join(", ")}`;
    }
    if (!confirmPassword)          e.confirmPassword = "Vui lòng nhập lại mật khẩu";
    else if (confirmPassword !== password) e.confirmPassword = "Mật khẩu không khớp";
    if (!agreed) e.agreed = "Bạn cần đồng ý với điều khoản dịch vụ";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerErrors([]);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await authApi.register({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim().toLowerCase(),
        password,
        confirmPassword,
        phone:  phone.trim() || null,
        gender: gender || null,
      });
      setStep("success");
      toast.success("Đăng ký thành công!", "Kiểm tra email để xác minh tài khoản.");
    } catch (err) {
      const msgs = parseServerErrors(err);
      setServerErrors(msgs);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "success") {
    return <AuthShell><CheckEmailScreen email={email} /></AuthShell>;
  }

  return (
    <AuthShell>
      <h1 className="text-title-sm font-bold tracking-tight text-gray-900 dark:text-white">Tạo tài khoản</h1>
      <p className="mt-1.5 text-theme-sm text-gray-500 dark:text-gray-400">
        Đăng ký để mua sắm, tích điểm và theo dõi đơn hàng.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <AuthInput
            icon={<AuthIcons.user />}
            label="Họ" required
            value={firstName} onChange={setFirstName}
            placeholder="Nguyễn"
            error={errors.firstName}
          />
          <AuthInput
            icon={<AuthIcons.user />}
            label="Tên" required
            value={lastName} onChange={setLastName}
            placeholder="Văn A"
            error={errors.lastName}
          />
        </div>

        <AuthInput
          icon={<AuthIcons.email />}
          label="Email" type="email" required
          autoComplete="email"
          value={email} onChange={handleEmailChange}
          placeholder="you@example.com"
          error={errors.email ?? (emailStatus === "taken" ? "Email này đã được đăng ký." : null)}
          hint={
            emailStatus === "checking" ? (
              <span className="flex items-center gap-1 text-theme-xs text-gray-400">
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang kiểm tra...
              </span>
            ) : emailStatus === "available" ? (
              <span className="flex items-center gap-1 text-theme-xs text-success-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Email có thể sử dụng
              </span>
            ) : null
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <AuthInput
            icon={<AuthIcons.phone />}
            label="Số điện thoại"
            autoComplete="tel"
            value={phone} onChange={setPhone}
            placeholder="0901 234 567"
            error={errors.phone}
          />

          {/* Gender */}
          <div>
            <label className="block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              Giới tính
            </label>
            <div className="mt-1.5 flex gap-1.5">
              {GENDERS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(g => g === opt.value ? "" : opt.value)}
                  className={cn(
                    "h-11 flex-1 rounded-xl border text-theme-sm font-medium transition-colors",
                    gender === opt.value
                      ? "border-brand-400 bg-brand-50 text-brand-600 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AuthInput
          icon={<AuthIcons.lock />}
          label="Mật khẩu" type="password" required
          autoComplete="new-password"
          value={password} onChange={setPassword}
          placeholder="Tối thiểu 8 ký tự"
          error={errors.password}
          hint={password && (
            <div className="space-y-2">
              {/* Strength bar */}
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className={cn("h-full rounded-full transition-all duration-300", strengthCfg.bar, strengthCfg.fill)} />
                </div>
                {pwStrength > 0 && (
                  <span className={cn("w-16 text-right text-theme-xs font-medium", strengthCfg.cls)}>
                    {strengthCfg.label}
                  </span>
                )}
              </div>
              {/* Criteria checklist */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                {PW_RULES.map((rule) => {
                  const ok = rule.test(password);
                  return (
                    <span key={rule.label}
                      className={cn("flex items-center gap-1 text-[11px]",
                        ok ? "text-success-500" : "text-gray-400 dark:text-gray-500")}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        {ok
                          ? <polyline points="20 6 9 17 4 12" />
                          : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>}
                      </svg>
                      {rule.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        />

        <AuthInput
          icon={<AuthIcons.key />}
          label="Nhập lại mật khẩu" type="password" required
          autoComplete="new-password"
          value={confirmPassword} onChange={setConfirmPassword}
          placeholder="Nhập lại mật khẩu"
          error={errors.confirmPassword}
          hint={confirmPassword && !errors.confirmPassword && confirmPassword === password && (
            <span className="flex items-center gap-1 text-theme-xs text-success-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Mật khẩu khớp
            </span>
          )}
        />

        {/* Terms */}
        <div>
          <label className={cn(
            "flex cursor-pointer items-start gap-2.5 text-theme-sm",
            errors.agreed ? "text-error-500" : "text-gray-600 dark:text-gray-400",
          )}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-brand-500" />
            <span>
              Tôi đồng ý với{" "}
              <button type="button"
                onClick={(e) => { e.preventDefault(); setLegalDoc("terms"); }}
                className="font-medium text-brand-500 underline-offset-2 hover:text-brand-600 hover:underline">
                Điều khoản dịch vụ
              </button>{" "}
              và{" "}
              <button type="button"
                onClick={(e) => { e.preventDefault(); setLegalDoc("privacy"); }}
                className="font-medium text-brand-500 underline-offset-2 hover:text-brand-600 hover:underline">
                Chính sách bảo mật
              </button>
            </span>
          </label>
          {errors.agreed && <p className="mt-1 text-theme-xs text-error-500">{errors.agreed}</p>}
        </div>

        {/* Server validation pop-up */}
        {serverErrors.length > 0 && (
          <div className="relative rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
            <button
              type="button"
              onClick={() => setServerErrors([])}
              className="absolute right-3 top-3 text-error-400 hover:text-error-600 dark:text-error-500"
              aria-label="Đóng"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div className="flex items-start gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-error-500">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <p className="text-theme-sm font-semibold text-error-700 dark:text-error-300">
                  Không thể đăng ký
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 marker:text-error-400">
                  {serverErrors.map((msg, i) => (
                    <li key={i} className="text-theme-xs text-error-600 dark:text-error-400">
                      {msg}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Đang xử lý..." : "Đăng ký"}
        </Button>
      </form>

      <p className="mt-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
        Đã có tài khoản?{" "}
        <Link to="/auth/login" className="font-semibold text-brand-500 hover:text-brand-600">
          Đăng nhập
        </Link>
      </p>

      <LegalModal
        doc={legalDoc}
        onClose={() => setLegalDoc(null)}
        onAgree={() => setAgreed(true)}
      />
    </AuthShell>
  );
}
