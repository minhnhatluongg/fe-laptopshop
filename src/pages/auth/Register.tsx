import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/api/auth.api";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/utils/cn";

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

// ── Demo illustration ────────────────────────────────────────────────────────
function Illustration() {
  return (
    <svg viewBox="0 0 420 380" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm">
      {/* Background blobs */}
      <circle cx="320" cy="80" r="60" fill="#EEF2FF" />
      <circle cx="80"  cy="300" r="45" fill="#F0FDF4" />

      {/* Geometric shapes */}
      <circle cx="370" cy="45"  r="22" fill="#FBBF24" />
      <polygon points="340,130 380,130 360,95" fill="#3B82F6" />
      <rect x="290" y="200" width="50" height="50" rx="8" fill="#EF4444" transform="rotate(-15 315 225)" />
      <circle cx="390" cy="230" r="30" fill="#F59E0B" />
      <rect x="75"  y="200" width="40" height="40" rx="6" fill="#10B981" transform="rotate(10 95 220)" />
      <circle cx="50"  cy="160" r="18" fill="#8B5CF6" />
      <polygon points="100,100 130,150 70,150" fill="#EC4899" />

      {/* Door / frame */}
      <rect x="165" y="60" width="110" height="260" rx="6" fill="#E5E7EB" />
      <rect x="172" y="67" width="96"  height="246" rx="4" fill="white" />
      <rect x="175" y="70" width="90"  height="1"   fill="#D1D5DB" />

      {/* Person body */}
      <ellipse cx="230" cy="290" rx="32" ry="12" fill="#E5E7EB" />
      {/* legs */}
      <rect x="218" y="258" width="10" height="35" rx="5" fill="#6366F1" />
      <rect x="232" y="258" width="10" height="35" rx="5" fill="#6366F1" />
      {/* torso */}
      <rect x="210" y="195" width="40" height="65" rx="10" fill="#6366F1" />
      {/* arm left - reaching out */}
      <rect x="185" y="205" width="28" height="10" rx="5" fill="#FCD34D" transform="rotate(-10 185 210)" />
      {/* arm right */}
      <rect x="248" y="210" width="22" height="9" rx="4" fill="#FCD34D" transform="rotate(15 248 214)" />
      {/* neck */}
      <rect x="224" y="182" width="12" height="16" rx="4" fill="#FCD34D" />
      {/* head */}
      <circle cx="230" cy="168" r="22" fill="#FCD34D" />
      {/* hair */}
      <path d="M210 160 Q215 145 230 143 Q245 145 250 160" fill="#374151" />
      {/* glasses */}
      <rect x="218" y="163" width="10" height="7" rx="2" stroke="#374151" strokeWidth="1.5" fill="none" />
      <rect x="232" y="163" width="10" height="7" rx="2" stroke="#374151" strokeWidth="1.5" fill="none" />
      <line x1="228" y1="166" x2="232" y2="166" stroke="#374151" strokeWidth="1.5" />
      {/* smile */}
      <path d="M224 174 Q230 179 236 174" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Briefcase */}
      <rect x="188" y="218" width="24" height="18" rx="3" fill="#3B82F6" />
      <rect x="193" y="214" width="14" height="6"  rx="2" fill="#2563EB" />
      <line x1="200" y1="218" x2="200" y2="236" stroke="#93C5FD" strokeWidth="1.5" />

      {/* Speech bubble */}
      <rect x="270" y="100" width="90" height="50" rx="12" fill="#DBEAFE" />
      <path d="M275 150 L268 162 L285 150" fill="#DBEAFE" />
      <line x1="285" y1="118" x2="348" y2="118" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" />
      <line x1="285" y1="130" x2="335" y2="130" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" />

      {/* Small plants */}
      <line x1="140" y1="330" x2="140" y2="310" stroke="#10B981" strokeWidth="2" />
      <circle cx="140" cy="305" r="6" fill="#10B981" />
      <circle cx="134" cy="310" r="4" fill="#34D399" />
      <circle cx="146" cy="310" r="4" fill="#34D399" />
      <line x1="370" y1="330" x2="370" y2="312" stroke="#10B981" strokeWidth="2" />
      <circle cx="370" cy="307" r="5" fill="#10B981" />
    </svg>
  );
}

// ── Input with icon ──────────────────────────────────────────────────────────
function InputField({
  icon, label, type = "text", value, onChange, placeholder, required, error, hint,
}: {
  icon: React.ReactNode;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
}) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";
  const inputType  = isPassword ? (showPw ? "text" : "password") : type;

  return (
    <div>
      <label className="block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
        {label}{required && <span className="ml-0.5 text-error-500">*</span>}
      </label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </span>
        <input
          type={inputType}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-11 w-full rounded-lg border bg-white pl-10 pr-10 text-theme-sm text-gray-800 placeholder:text-gray-400 focus:outline-none dark:bg-gray-900 dark:text-gray-200",
            error
              ? "border-error-400 focus:border-error-400"
              : "border-gray-200 focus:border-brand-400 dark:border-gray-800",
          )}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPw ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        )}
      </div>
      {error  && <p className="mt-1 text-theme-xs text-error-500">{error}</p>}
      {hint   && !error && <div className="mt-1">{hint}</div>}
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
const IconUser  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconEmail = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const IconPhone = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IconGender = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M16 20v-2a4 4 0 0 0-8 0v2"/></svg>;
const IconLock  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconKey   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>;

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
    <div className="py-4 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Kiểm tra email của bạn!</h2>
      <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
        Chúng tôi đã gửi link xác minh đến
      </p>
      <p className="mt-1 font-semibold text-gray-800 dark:text-white">{email}</p>

      <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-4 text-left dark:border-brand-500/20 dark:bg-brand-500/10">
        <p className="text-theme-sm font-medium text-brand-700 dark:text-brand-300">Các bước tiếp theo:</p>
        <ol className="mt-2 space-y-1.5 pl-4 text-theme-sm text-brand-600 dark:text-brand-400 list-decimal">
          <li>Mở email vừa nhận</li>
          <li>Nhấn nút <strong>"Xác minh email ngay"</strong></li>
          <li>Bạn sẽ được đăng nhập tự động</li>
        </ol>
      </div>

      <p className="mt-5 text-theme-xs text-gray-400">
        Không nhận được email? Kiểm tra thư mục Spam.
      </p>
      <button type="button" onClick={handleResend} disabled={resending || resent}
        className="mt-2 text-theme-sm font-medium text-brand-500 hover:text-brand-600 disabled:opacity-50 disabled:cursor-not-allowed">
        {resent ? "✓ Đã gửi lại" : resending ? "Đang gửi..." : "Gửi lại email xác minh"}
      </button>

      <div className="mt-6">
        <Link to="/auth/login" className="text-theme-sm text-gray-500 hover:text-gray-700">
          ← Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="grid lg:grid-cols-2">

          {/* ── Left: Form ── */}
          <div className="p-8 lg:p-10">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">LaptopShop</span>
            </Link>

            {step === "success" ? (
              <div className="mt-10">
                <CheckEmailScreen email={email} />
              </div>
            ) : (
              <>
                <h1 className="mt-6 text-title-sm font-bold text-gray-900 dark:text-white">Tạo tài khoản</h1>
                <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
                  Đăng ký để mua sắm, tích điểm và theo dõi đơn hàng.
                </p>

                <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
                  {/* Name row */}
                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      icon={<IconUser />}
                      label="Họ" required
                      value={firstName} onChange={setFirstName}
                      placeholder="Nguyễn"
                      error={errors.firstName}
                    />
                    <InputField
                      icon={<IconUser />}
                      label="Tên" required
                      value={lastName} onChange={setLastName}
                      placeholder="Văn A"
                      error={errors.lastName}
                    />
                  </div>

                  <InputField
                    icon={<IconEmail />}
                    label="Email" type="email" required
                    value={email} onChange={handleEmailChange}
                    placeholder="you@example.com"
                    error={errors.email ?? (emailStatus === "taken" ? "Email này đã được đăng ký." : null)}
                    hint={
                      emailStatus === "checking" ? (
                        <span className="flex items-center gap-1 text-theme-xs text-gray-400">
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Đang kiểm tra...
                        </span>
                      ) : emailStatus === "available" ? (
                        <span className="flex items-center gap-1 text-theme-xs text-success-500">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Email có thể sử dụng
                        </span>
                      ) : null
                    }
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      icon={<IconPhone />}
                      label="Số điện thoại"
                      value={phone} onChange={setPhone}
                      placeholder="0901 234 567"
                      error={errors.phone}
                    />

                    {/* Gender */}
                    <div>
                      <label className="block text-theme-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-gray-400"><IconGender /></span>
                          Giới tính
                        </span>
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: "Male",   label: "Nam",  emoji: "👨" },
                          { value: "Female", label: "Nữ",   emoji: "👩" },
                          { value: "Other",  label: "Khác", emoji: "🧑" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setGender(g => g === opt.value ? "" : opt.value)}
                            className={cn(
                              "flex-1 h-11 rounded-lg border text-theme-xs font-medium transition-all",
                              gender === opt.value
                                ? "border-brand-400 bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 dark:border-brand-500"
                                : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5",
                            )}
                          >
                            <span className="block text-base leading-none mb-0.5">{opt.emoji}</span>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <InputField
                    icon={<IconLock />}
                    label="Mật khẩu" type="password" required
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
                            <span className={cn("text-theme-xs font-medium w-16 text-right", strengthCfg.cls)}>
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
                                    ? <polyline points="20 6 9 17 4 12"/>
                                    : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                                </svg>
                                {rule.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  />

                  <InputField
                    icon={<IconKey />}
                    label="Nhập lại mật khẩu" type="password" required
                    value={confirmPassword} onChange={setConfirmPassword}
                    placeholder="••••••••"
                    error={errors.confirmPassword}
                    hint={confirmPassword && !errors.confirmPassword && confirmPassword === password && (
                      <span className="text-theme-xs text-success-500">✓ Mật khẩu khớp</span>
                    )}
                  />

                  {/* Terms */}
                  <div>
                    <label className={cn(
                      "flex items-start gap-2.5 text-theme-sm cursor-pointer",
                      errors.agreed ? "text-error-500" : "text-gray-600 dark:text-gray-400",
                    )}>
                      <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-brand-500" />
                      <span>
                        Tôi đồng ý với{" "}
                        <Link to="/terms" className="font-medium text-brand-500 hover:text-brand-600">
                          Điều khoản dịch vụ
                        </Link>{" "}
                        và{" "}
                        <Link to="/privacy" className="font-medium text-brand-500 hover:text-brand-600">
                          Chính sách bảo mật
                        </Link>
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
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                      <div className="flex items-start gap-2.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-error-500">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <div>
                          <p className="text-theme-sm font-semibold text-error-700 dark:text-error-300">
                            Không thể đăng ký
                          </p>
                          <ul className="mt-1.5 space-y-1">
                            {serverErrors.map((msg, i) => (
                              <li key={i} className="text-theme-xs text-error-600 dark:text-error-400">
                                · {msg}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 text-theme-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Đang xử lý...
                      </span>
                    ) : "ĐĂNG KÝ"}
                  </button>
                </form>

                <p className="mt-5 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  Đã có tài khoản?{" "}
                  <Link to="/auth/login" className="font-medium text-brand-500 hover:text-brand-600">
                    Đăng nhập
                  </Link>
                </p>
              </>
            )}
          </div>

          {/* ── Right: Illustration ── */}
          <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-brand-500/10 dark:to-indigo-500/10 p-10">
            <Illustration />
            <div className="mt-6 text-center">
              <p className="text-lg font-semibold text-gray-800 dark:text-white">
                Chào mừng đến với LaptopShop!
              </p>
              <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Đăng ký để tích điểm thành viên, nhận coupon ưu đãi và theo dõi đơn hàng dễ dàng.
              </p>
              <div className="mt-5 flex justify-center gap-4 text-theme-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-100 text-success-600 dark:bg-success-500/20">✓</span>
                  Tích điểm thành viên
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success-100 text-success-600 dark:bg-success-500/20">✓</span>
                  Ưu đãi độc quyền
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
