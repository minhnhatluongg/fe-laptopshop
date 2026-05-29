import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/api/auth.api";
import { fileApi } from "@/api/file.api";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import type { UserProfile } from "@/api/types";

// ─── Layout wrapper ──────────────────────────────────────────────────────────
export function AccountLayout() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullscreenSpinner />;
  if (!isAuthenticated) return <Navigate to="/auth/login" state={{ from: "/account" }} replace />;

  const navItems = [
    { to: "/account",          label: "Thông tin cá nhân", end: true },
    { to: "/account/password", label: "Đổi mật khẩu" },
    { to: "/account/wallet",   label: "Ví của tôi" },
    { to: "/account/orders",   label: "Đơn hàng" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
      <h1 className="text-title-sm font-bold text-gray-900 dark:text-white">Tài khoản</h1>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* Sidebar nav */}
        <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 lg:w-52 lg:flex-col lg:overflow-visible dark:border-gray-800 dark:bg-white/[0.03]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2.5 text-theme-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Page content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

// ─── Profile tab ─────────────────────────────────────────────────────────────
export function ProfileTab() {
  const { refresh } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // avatar upload state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authApi.getMyProfile()
      .then(setProfile)
      .catch(() => setError("Không tải được thông tin"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const updated = await authApi.updateMyProfile({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone ?? undefined,
        gender: profile.gender ?? undefined,
        dateOfBirth: profile.dateOfBirth,
      });
      setProfile(updated);
      setSuccess(true);
      await refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (file: File) => {
    setAvatarUploading(true);
    setAvatarProgress(0);
    try {
      const uploaded = await fileApi.upload(file, setAvatarProgress, "avatars");
      const res = await authApi.updateAvatar(uploaded.sysFileId);
      setProfile((prev) => prev ? { ...prev, avatarUrl: res.avatarUrl } : prev);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload avatar thất bại");
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) return <CardSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      {/* Avatar card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Ảnh đại diện</h2>
        <div className="flex items-center gap-5">
          <div className="relative">
            <img
              src={profile?.avatarUrl ? getImageUrl(profile.avatarUrl) : IMAGE_PLACEHOLDER}
              onError={(e) => { (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER; }}
              alt="Avatar"
              className="h-24 w-24 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
            />
            {avatarUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <span className="text-xs font-bold text-white">{avatarProgress}%</span>
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              disabled={avatarUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {avatarUploading ? "Đang tải..." : "Thay đổi ảnh"}
            </button>
            <p className="mt-1.5 text-theme-xs text-gray-500">JPG, PNG, WEBP — tối đa 5MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleAvatarChange(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Thông tin cá nhân</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-3 text-theme-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-success-50 px-4 py-3 text-theme-sm text-success-600 dark:bg-success-500/15 dark:text-success-500">
            Cập nhật thành công!
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ">
            <input
              className={inputCls}
              value={profile?.firstName ?? ""}
              onChange={(e) => setProfile((p) => p ? { ...p, firstName: e.target.value } : p)}
            />
          </Field>
          <Field label="Tên">
            <input
              className={inputCls}
              value={profile?.lastName ?? ""}
              onChange={(e) => setProfile((p) => p ? { ...p, lastName: e.target.value } : p)}
            />
          </Field>
          <Field label="Email" hint="Không thể thay đổi email">
            <input className={inputCls} value={profile?.email ?? ""} disabled />
          </Field>
          <Field label="Số điện thoại">
            <input
              className={inputCls}
              value={profile?.phone ?? ""}
              onChange={(e) => setProfile((p) => p ? { ...p, phone: e.target.value } : p)}
            />
          </Field>
          <Field label="Giới tính">
            <select
              className={inputCls}
              value={profile?.gender ?? ""}
              onChange={(e) => setProfile((p) => p ? { ...p, gender: e.target.value } : p)}
            >
              <option value="">-- Chọn --</option>
              <option value="Male">Nam</option>
              <option value="Female">Nữ</option>
              <option value="Other">Khác</option>
            </select>
          </Field>
          <Field label="Ngày sinh">
            <input
              type="date"
              className={inputCls}
              value={profile?.dateOfBirth?.split("T")[0] ?? ""}
              onChange={(e) => setProfile((p) => p ? { ...p, dateOfBirth: e.target.value } : p)}
            />
          </Field>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex h-11 items-center rounded-lg bg-brand-500 px-6 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const inputCls =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none disabled:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:disabled:bg-gray-800";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-theme-xs text-gray-500">{hint}</span>}
    </label>
  );
}

function CardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}

function FullscreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
    </div>
  );
}
