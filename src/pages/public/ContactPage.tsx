import { useEffect, useState } from "react";
import { showroomApi, SHOWROOM_STATUSES, type ShowroomDto } from "@/api/showroom.api";
import { cn } from "@/utils/cn";

// ── Static contact info ───────────────────────────────────────────────────────
const STATIC_INFO = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.58a16 16 0 0 0 6 6l1.27-.85a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    ),
    label: "Hotline hỗ trợ",
    value: "1900 5301",
    sub: "T2 – CN: 8:00 – 22:00",
    color: "text-brand-500",
    bg: "bg-brand-50 dark:bg-brand-500/10",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    label: "Email hỗ trợ",
    value: "support@laptopshop.vn",
    sub: "Phản hồi trong 24 giờ",
    color: "text-success-600",
    bg: "bg-success-50 dark:bg-success-500/10",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    label: "Giờ làm việc",
    value: "8:00 – 22:00 hàng ngày",
    sub: "Kể cả T7, CN & lễ",
    color: "text-warning-600",
    bg: "bg-warning-50 dark:bg-warning-500/10",
  },
];

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "Tôi có thể đặt hàng online và nhận tại showroom không?",
    a: "Có. Chọn hình thức nhận tại cửa hàng khi thanh toán — đơn sẽ được giữ 48 giờ sau khi xác nhận.",
  },
  {
    q: "Chính sách bảo hành của LaptopShop như thế nào?",
    a: "Tất cả sản phẩm được bảo hành chính hãng tối thiểu 24 tháng. Một số dòng Apple, Dell hỗ trợ bảo hành tại nhà.",
  },
  {
    q: "Tôi có thể đổi trả sản phẩm trong bao lâu?",
    a: "LaptopShop hỗ trợ đổi trả trong 30 ngày kể từ ngày mua nếu sản phẩm có lỗi nhà sản xuất. Sản phẩm phải còn nguyên vẹn.",
  },
  {
    q: "Có hỗ trợ trả góp 0% không?",
    a: "Có, hỗ trợ trả góp 0% lãi qua 15+ ngân hàng (Visa, Mastercard) và Home Credit, FE Credit.",
  },
];

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 dark:border-gray-800">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold text-gray-800 dark:text-white">
        {q}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={cn("shrink-0 ml-4 transition-transform", open && "rotate-180")}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{a}</p>}
    </div>
  );
}

// ── Google Maps embed — fallback về search URL nếu không có embed URL ─────────
function ShowroomMap({ showroom }: { showroom: ShowroomDto }) {
  const src = showroom.mapEmbedUrl
    || `https://maps.google.com/maps?q=${encodeURIComponent(showroom.address)}&output=embed&hl=vi`;

  return (
    <iframe
      src={src}
      className="h-full w-full min-h-[340px]"
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
      title={showroom.name}
    />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ContactPage() {
  const [showrooms, setShowrooms]   = useState<ShowroomDto[]>([]);
  const [activeIdx, setActiveIdx]   = useState(0);
  const [loadingMap, setLoadingMap] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [sent, setSent]     = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    showroomApi.getActive()
      .then(list => { setShowrooms(list); setLoadingMap(false); })
      .catch(() => setLoadingMap(false));
  }, []);

  const activeShowroom = showrooms[activeIdx] ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    setSent(true);
    setSending(false);
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10 md:px-8">

      {/* Hero */}
      <div className="mb-12 text-center">
        <span className="inline-block rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          Hỗ trợ khách hàng
        </span>
        <h1 className="mt-3 font-outfit text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
          Liên hệ với chúng tôi
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
          Đội ngũ tư vấn của LaptopShop luôn sẵn sàng hỗ trợ bạn — từ chọn máy, tư vấn cấu hình đến sau khi mua hàng.
        </p>
      </div>

      {/* Static info cards */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {STATIC_INFO.map(c => (
          <div key={c.label}
            className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className={cn("rounded-xl p-3 shrink-0", c.bg, c.color)}>{c.icon}</div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{c.label}</p>
              <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">{c.value}</p>
              <p className="text-xs text-gray-500">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Showrooms + Map */}
      <div className="mb-14">
        <h2 className="mb-5 font-outfit text-xl font-bold text-gray-900 dark:text-white">
          Hệ thống showroom
        </h2>

        {loadingMap ? (
          <div className="h-80 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        ) : showrooms.length === 0 ? (
          <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-gray-300 text-gray-400 dark:border-gray-700">
            Chưa có thông tin showroom. Vui lòng liên hệ hotline 1900 5301.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:grid lg:grid-cols-[300px_1fr]">

            {/* Showroom list sidebar */}
            <div className="border-b border-gray-100 dark:border-gray-800 lg:border-b-0 lg:border-r">
              {showrooms.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 border-b border-gray-50 p-4 text-left transition last:border-b-0 dark:border-gray-800",
                    i === activeIdx
                      ? "bg-brand-50 dark:bg-brand-500/10"
                      : "hover:bg-gray-50 dark:hover:bg-white/[0.02]",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className={cn(
                      "font-semibold text-sm",
                      i === activeIdx ? "text-brand-600 dark:text-brand-400" : "text-gray-900 dark:text-white"
                    )}>
                      {s.name}
                    </span>
                    {(() => {
                      const info = SHOWROOM_STATUSES.find(st => st.value === s.status);
                      return info && s.status !== "Open" ? (
                        <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold", info.color)}>
                          {info.label}
                        </span>
                      ) : i === activeIdx ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                      ) : null;
                    })()}
                  </div>
                  <span className="text-xs text-gray-500 line-clamp-2">{s.address}</span>
                  {s.phone && (
                    <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                      📞 {s.phone}
                    </span>
                  )}
                  {s.openingHours && (
                    <span className="text-xs text-gray-400">🕐 {s.openingHours}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Map */}
            <div className="relative overflow-hidden">
              {activeShowroom && <ShowroomMap showroom={activeShowroom} />}

              {/* Info overlay */}
              {activeShowroom && (
                <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/30 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-sm dark:bg-gray-900/90">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{activeShowroom.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{activeShowroom.address}</p>
                  {activeShowroom.phone && (
                    <a href={`tel:${activeShowroom.phone}`}
                      className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                      {activeShowroom.phone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contact form */}
      <div className="mb-14 mx-auto max-w-2xl">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-5 font-outfit text-lg font-bold text-gray-900 dark:text-white">
            Gửi tin nhắn cho chúng tôi
          </h2>

          {sent ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-3xl dark:bg-success-500/10">✓</div>
              <p className="font-semibold text-gray-900 dark:text-white">Đã gửi thành công!</p>
              <p className="mt-1 text-sm text-gray-500">Chúng tôi sẽ phản hồi trong vòng 24 giờ.</p>
              <button type="button"
                onClick={() => { setSent(false); setForm({ name: "", phone: "", email: "", message: "" }); }}
                className="mt-5 text-sm font-medium text-brand-500 hover:underline">
                Gửi tin nhắn khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { field: "name",  label: "Họ tên *",         type: "text",  placeholder: "Nguyễn Văn A" },
                { field: "phone", label: "Số điện thoại *",  type: "tel",   placeholder: "0901 234 567" },
                { field: "email", label: "Email",             type: "email", placeholder: "email@example.com" },
              ].map(({ field, label, type, placeholder }) => (
                <div key={field}>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
                  <input type={type} value={form[field as keyof typeof form]}
                    onChange={e => setForm({ ...form, [field]: e.target.value })}
                    placeholder={placeholder}
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Nội dung</label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Bạn cần tư vấn gì?" rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
              <button type="submit" disabled={sending || !form.name.trim() || !form.phone.trim()}
                className="h-11 w-full rounded-xl bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60">
                {sending ? "Đang gửi..." : "Gửi tin nhắn"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-6 text-center font-outfit text-2xl font-bold text-gray-900 dark:text-white">
          Câu hỏi thường gặp
        </h2>
        <div className="rounded-2xl border border-gray-100 bg-white px-6 dark:border-gray-800 dark:bg-white/[0.03]">
          {FAQS.map(f => <FAQ key={f.q} q={f.q} a={f.a} />)}
        </div>
      </div>
    </div>
  );
}
