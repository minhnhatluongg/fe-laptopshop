import { useCallback, useEffect, useRef, useState } from "react";
import { userAddressApi } from "@/api/userAddress.api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { cn } from "@/utils/cn";
import type { UserAddress } from "@/api/types";

// ── Nominatim suggestion ──────────────────────────────────────────────────────
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
}

async function searchAddress(q: string): Promise<NominatimResult[]> {
  if (q.trim().length < 4) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({ q, format: "json", limit: "6", countrycodes: "vn", addressdetails: "1" }),
    { headers: { "Accept-Language": "vi" } }
  );
  if (!res.ok) return [];
  return res.json();
}

// ── Google Maps embed URL ─────────────────────────────────────────────────────
function buildMapUrl(addr: Partial<FormState>): string {
  const parts = [addr.addressLine, addr.ward, addr.district, addr.city]
    .filter(Boolean).join(", ");
  if (!parts) return "";
  return `https://maps.google.com/maps?q=${encodeURIComponent(parts)}&output=embed&z=16`;
}

// ── Form state ────────────────────────────────────────────────────────────────
interface FormState {
  recipientName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
  province: string;
  isDefault: boolean;
}

const emptyForm = (): FormState => ({
  recipientName: "", phone: "", addressLine: "",
  ward: "", district: "", city: "", province: "", isDefault: false,
});

function addressToForm(a: UserAddress): FormState {
  return {
    recipientName: a.recipientName,
    phone:         a.phone,
    addressLine:   a.addressLine,
    ward:          a.ward          ?? "",
    district:      a.district      ?? "",
    city:          a.city          ?? "",
    province:      a.province      ?? "",
    isDefault:     a.isDefault,
  };
}

// ── Address card ──────────────────────────────────────────────────────────────
function AddressCard({
  addr, onEdit, onDelete, onSetDefault,
}: {
  addr: UserAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const fullAddr = [addr.addressLine, addr.ward, addr.district, addr.city]
    .filter(Boolean).join(", ");
  return (
    <div className={cn(
      "relative rounded-2xl border p-4 transition-all",
      addr.isDefault
        ? "border-brand-300 bg-brand-50/50 dark:border-brand-500/40 dark:bg-brand-500/[0.07]"
        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.02]",
    )}>
      {addr.isDefault && (
        <span className="absolute right-3 top-3 rounded-full bg-brand-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
          Mặc định
        </span>
      )}
      <div className="pr-16">
        <p className="font-semibold text-gray-900 dark:text-white">{addr.recipientName}</p>
        <p className="mt-0.5 text-theme-sm text-gray-500">{addr.phone}</p>
        <p className="mt-1.5 text-theme-sm text-gray-600 dark:text-gray-400">{fullAddr}</p>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        <button type="button" onClick={onEdit}
          className="text-theme-xs font-medium text-brand-500 hover:text-brand-600">
          Chỉnh sửa
        </button>
        {!addr.isDefault && (
          <>
            <span className="text-gray-200 dark:text-gray-700">|</span>
            <button type="button" onClick={onSetDefault}
              className="text-theme-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Đặt mặc định
            </button>
          </>
        )}
        <span className="text-gray-200 dark:text-gray-700">|</span>
        <button type="button" onClick={onDelete}
          className="text-theme-xs text-error-500 hover:text-error-600">
          Xoá
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AddressTab() {
  const { user } = useAuth();
  const toast    = useToast();
  const confirm  = useConfirm();

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState<FormState>(emptyForm());

  // Address autocomplete
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [sugLoading, setSugLoading]   = useState(false);
  const [showSug, setShowSug]         = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sugRef = useRef<HTMLDivElement>(null);

  // Map
  const [mapUrl, setMapUrl] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await userAddressApi.getByUser(user.id);
      setAddresses(data);
    } catch {
      toast.error("Không tải được địa chỉ");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void load(); }, [load]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!sugRef.current?.contains(e.target as Node)) setShowSug(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Update map when form changes
  useEffect(() => {
    const url = buildMapUrl(form);
    setMapUrl(url);
  }, [form.addressLine, form.ward, form.district, form.city]);

  // ── Autocomplete handler ────────────────────────────────────────────────────
  const handleAddressInput = (val: string) => {
    set("addressLine", val);
    setShowSug(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 4) {
      setSugLoading(true);
      debounceRef.current = setTimeout(async () => {
        const results = await searchAddress(val);
        setSuggestions(results);
        setSugLoading(false);
        setShowSug(results.length > 0);
      }, 600);
    } else {
      setSugLoading(false);
      setSuggestions([]);
    }
  };

  const pickSuggestion = (r: NominatimResult) => {
    const a = r.address;
    const road = a.road ?? "";
    const suburb = a.suburb ?? "";
    const street = [road, suburb].filter(Boolean).join(", ");
    setForm(f => ({
      ...f,
      addressLine: street || r.display_name.split(",")[0],
      ward:     a.suburb       ?? a.city_district ?? f.ward,
      district: a.city_district ?? a.county       ?? f.district,
      city:     a.city          ?? a.county       ?? f.city,
      province: a.state         ?? f.province,
    }));
    setShowSug(false);
    setSuggestions([]);
  };

  // ── Form helpers ────────────────────────────────────────────────────────────
  const set = (k: keyof FormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setMapUrl("");
    setShowForm(true);
  };

  const openEdit = (addr: UserAddress) => {
    setEditId(addr.id);
    setForm(addressToForm(addr));
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
    setSuggestions([]);
  };

  const handleSave = async () => {
    if (!form.recipientName.trim()) return toast.warning("Vui lòng nhập tên người nhận");
    if (!form.phone.trim())         return toast.warning("Vui lòng nhập số điện thoại");
    if (!form.addressLine.trim())   return toast.warning("Vui lòng nhập địa chỉ");
    if (!form.city.trim())          return toast.warning("Vui lòng nhập tỉnh/thành phố");
    setSaving(true);
    try {
      const payload = {
        ...form,
        userId: user!.id,
        ward:     form.ward     || undefined,
        district: form.district || undefined,
        province: form.province || undefined,
      };
      if (editId) {
        await userAddressApi.update(editId, payload);
        toast.success("Đã cập nhật địa chỉ");
      } else {
        await userAddressApi.create(payload as Parameters<typeof userAddressApi.create>[0]);
        toast.success("Đã thêm địa chỉ mới");
      }
      await load();
      cancelForm();
    } catch (e) {
      toast.error("Lưu thất bại", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!await confirm({ title: "Xoá địa chỉ?", message: "Địa chỉ này sẽ bị xoá khỏi danh sách của bạn.", variant: "danger", confirmLabel: "Xoá địa chỉ", cancelLabel: "Huỷ" })) return;
    try {
      await userAddressApi.softDelete(id);
      toast.success("Đã xoá địa chỉ");
      await load();
    } catch {
      toast.error("Xoá thất bại");
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await userAddressApi.setDefault(id, user!.id);
      toast.success("Đã đặt địa chỉ mặc định");
      await load();
    } catch {
      toast.error("Thao tác thất bại");
    }
  };

  // ── Input class ─────────────────────────────────────────────────────────────
  const inputCls = "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-theme-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Địa chỉ giao hàng</h2>
          <p className="text-theme-sm text-gray-500">Quản lý địa chỉ nhận hàng của bạn</p>
        </div>
        {!showForm && (
          <button type="button" onClick={openNew}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-theme-sm font-medium text-white hover:bg-brand-600 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Thêm địa chỉ
          </button>
        )}
      </div>

      {/* Address list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : !showForm && addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-12 text-center dark:border-gray-700">
          <div className="mb-3 text-4xl">📍</div>
          <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">Chưa có địa chỉ nào</p>
          <p className="mt-1 text-theme-xs text-gray-400">Thêm địa chỉ để checkout nhanh hơn</p>
          <button type="button" onClick={openNew}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-brand-500 px-4 text-theme-xs font-semibold text-white hover:bg-brand-600">
            + Thêm địa chỉ đầu tiên
          </button>
        </div>
      ) : !showForm ? (
        <div className="space-y-3">
          {addresses.map(addr => (
            <AddressCard
              key={addr.id}
              addr={addr}
              onEdit={() => openEdit(addr)}
              onDelete={() => void handleDelete(addr.id)}
              onSetDefault={() => void handleSetDefault(addr.id)}
            />
          ))}
        </div>
      ) : null}

      {/* ── Add/Edit Form ── */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
            {editId ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
          </h3>

          <div className="space-y-3">
            {/* Recipient + phone */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Họ tên người nhận <span className="text-error-500">*</span>
                </label>
                <input value={form.recipientName} onChange={e => set("recipientName", e.target.value)}
                  placeholder="Nguyễn Văn A" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Số điện thoại <span className="text-error-500">*</span>
                </label>
                <input value={form.phone} onChange={e => set("phone", e.target.value)}
                  placeholder="0901 234 567" className={inputCls} />
              </div>
            </div>

            {/* Address line with autocomplete */}
            <div ref={sugRef} className="relative">
              <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                Địa chỉ chi tiết <span className="text-error-500">*</span>
                <span className="ml-2 text-theme-xs font-normal text-gray-400">(số nhà, tên đường...)</span>
              </label>
              <div className="relative">
                <input
                  value={form.addressLine}
                  onChange={e => handleAddressInput(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSug(true)}
                  placeholder="VD: 123 Nguyễn Văn Linh"
                  className={inputCls}
                  autoComplete="off"
                />
                {sugLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </span>
                )}
              </div>

              {/* Suggestions dropdown */}
              {showSug && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {suggestions.map(r => (
                    <button
                      key={r.place_id}
                      type="button"
                      onClick={() => pickSuggestion(r)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-50 dark:border-gray-800 last:border-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-brand-400">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span className="text-theme-sm text-gray-700 dark:text-gray-300 line-clamp-2">{r.display_name}</span>
                    </button>
                  ))}
                  <div className="flex items-center justify-end gap-1 px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                    <span className="text-[10px] text-gray-400">Dữ liệu bởi</span>
                    <span className="text-[10px] font-medium text-gray-500">OpenStreetMap</span>
                  </div>
                </div>
              )}
            </div>

            {/* Ward / District / City */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">Phường / Xã</label>
                <input value={form.ward} onChange={e => set("ward", e.target.value)}
                  placeholder="Phường Bến Nghé" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">Quận / Huyện</label>
                <input value={form.district} onChange={e => set("district", e.target.value)}
                  placeholder="Quận 1" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                  Tỉnh / Thành phố <span className="text-error-500">*</span>
                </label>
                <input value={form.city} onChange={e => set("city", e.target.value)}
                  placeholder="Hồ Chí Minh" className={inputCls} />
              </div>
            </div>

            {/* Default checkbox */}
            <label className="flex cursor-pointer items-center gap-2.5 text-theme-sm text-gray-600 dark:text-gray-400">
              <input type="checkbox" checked={form.isDefault}
                onChange={e => set("isDefault", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-brand-500" />
              Đặt làm địa chỉ mặc định
            </label>

            {/* ── Map preview ── */}
            {mapUrl && (
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span className="text-theme-xs text-gray-500">Xem trên bản đồ</span>
                </div>
                <iframe
                  key={mapUrl}
                  src={mapUrl}
                  width="100%"
                  height="260"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Bản đồ địa chỉ"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={cancelForm}
                className="h-10 rounded-lg border border-gray-200 px-4 text-theme-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700">
                Huỷ
              </button>
              <button type="button" onClick={() => void handleSave()} disabled={saving}
                className="h-10 rounded-lg bg-brand-500 px-5 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                {saving ? "Đang lưu..." : editId ? "Cập nhật" : "Thêm địa chỉ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show addresses + Add more button when form is closed */}
      {!showForm && addresses.length > 0 && (
        <button type="button" onClick={openNew}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 text-theme-sm text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors dark:border-gray-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Thêm địa chỉ mới
        </button>
      )}
    </div>
  );
}
