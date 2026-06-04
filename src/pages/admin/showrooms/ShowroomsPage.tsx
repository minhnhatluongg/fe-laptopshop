import { useCallback, useEffect, useRef, useState } from "react";
import { showroomApi, SHOWROOM_STATUSES, type ShowroomDto, type UpsertShowroomDto } from "@/api/showroom.api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Switch, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/utils/cn";

// ── Helpers ───────────────────────────────────────────────────────────────────
const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

const statusInfo = (value: string) =>
  SHOWROOM_STATUSES.find(s => s.value === value) ?? SHOWROOM_STATUSES[0];

const empty: UpsertShowroomDto & { id?: number } = {
  name: "", address: "", phone: "", email: "",
  openingHours: "", mapEmbedUrl: "",
  isActive: true, displayOrder: 0, status: "Open",
};

// ── Inline active toggle ──────────────────────────────────────────────────────
function ActiveToggle({ showroom, onToggled }: { showroom: ShowroomDto; onToggled: () => void }) {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      await showroomApi.update(showroom.id, {
        name: showroom.name, address: showroom.address,
        phone: showroom.phone ?? undefined, email: showroom.email ?? undefined,
        openingHours: showroom.openingHours ?? undefined,
        mapEmbedUrl: showroom.mapEmbedUrl ?? undefined,
        displayOrder: showroom.displayOrder,
        isActive: !showroom.isActive,
        status: showroom.status,
      });
      onToggled();
    } finally { setBusy(false); }
  };
  return (
    <button type="button" onClick={toggle} disabled={busy}
      title={showroom.isActive ? "Nhấn để ẩn" : "Nhấn để hiện"}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 focus:outline-none",
        showroom.isActive ? "bg-success-500" : "bg-gray-300 dark:bg-gray-600",
      )}>
      <span className={cn(
        "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
        showroom.isActive ? "translate-x-6" : "translate-x-1",
      )} />
    </button>
  );
}

// ── Status quick-switcher — dùng position:fixed để thoát overflow clip ────────
function StatusSwitcher({ showroom, onChanged }: { showroom: ShowroomDto; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const info = statusInfo(showroom.status);

  // Tính tọa độ fixed khi mở dropdown
  const handleOpen = () => {
    if (busy) return;
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = async (value: string) => {
    setOpen(false);
    if (value === showroom.status) return;
    setBusy(true);
    try {
      await showroomApi.update(showroom.id, {
        name: showroom.name, address: showroom.address,
        phone: showroom.phone ?? undefined, email: showroom.email ?? undefined,
        openingHours: showroom.openingHours ?? undefined,
        mapEmbedUrl: showroom.mapEmbedUrl ?? undefined,
        displayOrder: showroom.displayOrder,
        isActive: showroom.isActive,
        status: value,
      });
      onChanged();
    } finally { setBusy(false); }
  };

  const dotColor = showroom.status === "Open" ? "bg-success-500"
    : showroom.status === "Closed" ? "bg-error-500" : "bg-warning-500";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={busy}
        onClick={handleOpen}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50",
          info.color,
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
        {info.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
          className={cn("transition-transform", open && "rotate-180")}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown — fixed để thoát overflow */}
      {open && (
        <div
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        >
          {SHOWROOM_STATUSES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => pick(s.value)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium transition hover:bg-gray-50 dark:hover:bg-white/5",
                s.value === showroom.status && "bg-gray-50 dark:bg-white/5",
              )}
            >
              <span className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                s.value === "Open" ? "bg-success-500" : s.value === "Closed" ? "bg-error-500" : "bg-warning-500",
              )} />
              <span className="text-gray-700 dark:text-gray-300">{s.label}</span>
              {s.value === showroom.status && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="3" className="ml-auto text-brand-500">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      <span>{icon}</span>{label}
    </p>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ShowroomsPage() {
  const [items, setItems] = useState<ShowroomDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDelTarget] = useState<ShowroomDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await showroomApi.getAll()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => { setForm({ ...empty }); setFormOpen(true); };
  const openEdit = (s: ShowroomDto) => {
    setForm({
      id: s.id, name: s.name, address: s.address,
      phone: s.phone ?? "", email: s.email ?? "",
      openingHours: s.openingHours ?? "", mapEmbedUrl: s.mapEmbedUrl ?? "",
      isActive: s.isActive, displayOrder: s.displayOrder, status: s.status,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim()) return;
    setSaving(true);
    try {
      const dto: UpsertShowroomDto = {
        name: form.name.trim(), address: form.address.trim(),
        phone: form.phone?.trim() || undefined, email: form.email?.trim() || undefined,
        openingHours: form.openingHours?.trim() || undefined,
        mapEmbedUrl: form.mapEmbedUrl?.trim() || undefined,
        isActive: form.isActive, displayOrder: Number(form.displayOrder) || 0,
        status: form.status,
      };
      form.id ? await showroomApi.update(form.id, dto) : await showroomApi.create(dto);
      setFormOpen(false);
      await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await showroomApi.delete(deleteTarget.id); setDelTarget(null); await load(); }
    finally { setDeleting(false); }
  };

  const previewItem = items.find(i => i.id === previewId);

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Quản lý Showroom</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {items.length} chi nhánh · {items.filter(i => i.isActive).length} đang hiển thị
          </p>
        </div>
        <Button onClick={openCreate} size="sm" startIcon={<Icon d="M12 5v14M5 12h14" />}>
          Thêm showroom
        </Button>
      </div>

      {/* Table */}
      <Card className="p-0">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center px-6">
            <p className="text-5xl mb-3">🏪</p>
            <p className="font-semibold text-gray-700 dark:text-gray-300">Chưa có showroom nào</p>
            <p className="mt-1 text-sm text-gray-400">Thêm chi nhánh đầu tiên để hiển thị trên trang Liên hệ.</p>
            <Button onClick={openCreate} size="sm" className="mt-4">+ Thêm showroom</Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-left bg-white dark:bg-gray-900">
                  {["#", "Chi nhánh", "SĐT", "Giờ mở cửa", "Bản đồ", "Trạng thái", "Website", ""].map(h => (
                    <th key={h} className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400 first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {items.map(s => (
                  <tr key={s.id} className={cn(
                    "transition-colors hover:bg-gray-50 dark:hover:bg-white/2",
                    !s.isActive && "opacity-50",
                  )}>
                    {/* Thứ tự */}
                    <td className="pl-5 pr-4 py-3.5">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-800">
                        {s.displayOrder}
                      </span>
                    </td>

                    {/* Tên + địa chỉ */}
                    <td className="px-4 py-3.5 min-w-45">
                      <p className="font-semibold text-gray-900 dark:text-white">{s.name}</p>
                      <p className="mt-0.5 text-xs text-gray-400 max-w-xs truncate">{s.address}</p>
                    </td>

                    {/* SĐT */}
                    <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {s.phone
                        ? <a href={`tel:${s.phone}`} className="hover:text-brand-500 transition-colors">{s.phone}</a>
                        : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>

                    {/* Giờ */}
                    <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {s.openingHours ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>

                    {/* Bản đồ */}
                    <td className="px-4 py-3.5">
                      {s.mapEmbedUrl ? (
                        <button type="button"
                          onClick={() => setPreviewId(s.id === previewId ? null : s.id)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition",
                            previewId === s.id
                              ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-300"
                              : "bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600 dark:bg-gray-800 dark:text-gray-400",
                          )}>
                          <Icon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" className="w-3 h-3" />
                          {previewId === s.id ? "Ẩn" : "Xem"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">Chưa có</span>
                      )}
                    </td>

                    {/* Status dropdown */}
                    <td className="px-4 py-3.5">
                      <StatusSwitcher showroom={s} onChanged={load} />
                    </td>

                    {/* Website toggle */}
                    <td className="px-4 py-3.5">
                      <ActiveToggle showroom={s} onToggled={load} />
                    </td>

                    {/* Actions */}
                    <td className="pl-4 pr-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => openEdit(s)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10 transition">
                          <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          Sửa
                        </button>
                        <button type="button" onClick={() => setDelTarget(s)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10 transition">
                          <Icon d="M3 6h18 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Map preview */}
            {previewItem?.mapEmbedUrl && (
              <div className="border-t border-gray-100 dark:border-gray-800 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" className="text-brand-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{previewItem.name}</span>
                    <span className="text-xs text-gray-400">{previewItem.address}</span>
                  </div>
                  <button type="button" onClick={() => setPreviewId(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                    ✕ Đóng
                  </button>
                </div>
                <iframe src={previewItem.mapEmbedUrl}
                  className="w-full h-72 rounded-xl border border-gray-200 dark:border-gray-700"
                  loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade"
                  title={previewItem.name} />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Create / Edit modal ── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)}
        title={form.id ? "Chỉnh sửa showroom" : "Thêm showroom mới"} size="lg">
        <div className="space-y-5">

          <SectionLabel icon="🏪" label="Thông tin chi nhánh" />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Tên chi nhánh" required>
                <Input value={form.name} autoFocus
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Chi nhánh Quận 1" />
              </Field>
            </div>
            <Field label="Thứ tự hiển thị" hint="Số nhỏ → ưu tiên trước">
              <Input type="number" min={0} value={form.displayOrder}
                onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} />
            </Field>
          </div>

          <Field label="Địa chỉ" required>
            <Input value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="123 Nguyễn Văn A, Phường Bến Nghé, Quận 1, TP. HCM" />
          </Field>

          <SectionLabel icon="📞" label="Liên hệ & vận hành" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Số điện thoại">
              <Input value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="0798175906" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="q1@laptopshop.vn" />
            </Field>
            <Field label="Giờ mở cửa">
              <Input value={form.openingHours}
                onChange={e => setForm({ ...form, openingHours: e.target.value })}
                placeholder="T2–CN: 8:00–22:00" />
            </Field>
          </div>

          {/* Status selector */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Trạng thái hoạt động</p>
            <div className="flex flex-wrap gap-2">
              {SHOWROOM_STATUSES.map(s => (
                <button key={s.value} type="button"
                  onClick={() => setForm({ ...form, status: s.value })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition",
                    form.status === s.value
                      ? "border-transparent ring-2 ring-brand-500 " + s.color
                      : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400",
                  )}>
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    s.value === "Open" ? "bg-success-500" : s.value === "Closed" ? "bg-error-500" : "bg-warning-500",
                  )} />
                  {s.label}
                </button>
              ))}
            </div>
            {form.status === "Closed" && (
              <p className="mt-2 text-xs text-error-500">
                ⚠️ Showroom sẽ hiển thị nhãn "Đóng cửa" trên trang Liên hệ.
              </p>
            )}
          </div>

          <SectionLabel icon="🗺️" label="Google Maps" />
          <Field label="Embed URL" hint='Google Maps → Chia sẻ → Nhúng bản đồ → copy URL trong src="..."'>
            <Textarea value={form.mapEmbedUrl}
              onChange={e => setForm({ ...form, mapEmbedUrl: e.target.value })}
              placeholder="https://www.google.com/maps/embed?pb=..." rows={2} />
          </Field>

          {form.mapEmbedUrl?.startsWith("https://") && (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span className="text-xs font-medium text-gray-500">Xem trước bản đồ</span>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-500" />
              </div>
              <iframe src={form.mapEmbedUrl} className="w-full h-52" loading="lazy"
                allowFullScreen referrerPolicy="no-referrer-when-downgrade" title="Map preview" />
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hiển thị trên trang web</p>
              <p className="text-xs text-gray-400">Tắt để tạm ẩn toàn bộ chi nhánh này</p>
            </div>
            <Switch checked={form.isActive} onChange={v => setForm({ ...form, isActive: v })} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.address.trim()}>
              {saving ? (form.id ? "Đang cập nhật..." : "Đang tạo...") : (form.id ? "Lưu thay đổi" : "Tạo showroom")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirm ── */}
      <Modal open={!!deleteTarget} onClose={() => setDelTarget(null)}
        title="Xác nhận xóa showroom" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-error-700 dark:text-error-400">Không thể hoàn tác</p>
              <p className="mt-0.5 text-sm text-error-600 dark:text-error-400">
                Showroom <strong>"{deleteTarget?.name}"</strong> sẽ bị xóa vĩnh viễn.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDelTarget(null)} disabled={deleting}>Hủy</Button>
            <Button onClick={handleDelete} disabled={deleting}>
              {deleting ? "Đang xóa..." : "Xóa showroom"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
