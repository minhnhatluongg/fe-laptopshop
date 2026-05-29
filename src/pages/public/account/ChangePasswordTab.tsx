import { useState, type FormEvent } from "react";
import { authApi } from "@/api/auth.api";

export default function ChangePasswordTab() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (form.newPassword !== form.confirmNewPassword) {
      setError("Mật khẩu mới và xác nhận không khớp");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("Mật khẩu mới phải tối thiểu 6 ký tự");
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword(form);
      setSuccess(true);
      setForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đổi mật khẩu thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Đổi mật khẩu</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-theme-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-success-50 px-4 py-3 text-theme-sm text-success-600 dark:bg-success-500/15 dark:text-success-500">
          Đổi mật khẩu thành công!
        </div>
      )}

      <form onSubmit={(e) => void onSubmit(e)} className="max-w-md space-y-4">
        <PasswordField
          label="Mật khẩu hiện tại"
          value={form.currentPassword}
          onChange={set("currentPassword")}
          autoComplete="current-password"
        />
        <PasswordField
          label="Mật khẩu mới"
          value={form.newPassword}
          onChange={set("newPassword")}
          autoComplete="new-password"
        />
        <PasswordField
          label="Xác nhận mật khẩu mới"
          value={form.confirmNewPassword}
          onChange={set("confirmNewPassword")}
          autoComplete="new-password"
        />

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center rounded-lg bg-brand-500 px-6 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? "Đang xử lý..." : "Đổi mật khẩu"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <label className="block">
      <span className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 pr-10 text-theme-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
        >
          {show ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}
