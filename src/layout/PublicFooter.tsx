import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

const SHOP_LINKS = [
  { to: "/products", label: "Tất cả sản phẩm" },
  { to: "/products?category=laptop-gaming", label: "Laptop Gaming" },
  { to: "/products?category=laptop-van-phong", label: "Laptop Văn phòng" },
  { to: "/products?category=macbook", label: "MacBook" },
  { to: "/sale", label: "Khuyến mãi" },
];

const SUPPORT_LINKS = [
  { to: "/policy/shipping", label: "Chính sách vận chuyển" },
  { to: "/policy/return", label: "Đổi trả & bảo hành" },
  { to: "/policy/payment", label: "Hướng dẫn thanh toán" },
  { to: "/warranty", label: "Tra cứu bảo hành" },
  { to: "/contact", label: "Liên hệ" },
];

const SOCIALS = [
  { slug: "facebook", href: "https://facebook.com", label: "Facebook" },
  { slug: "youtube", href: "https://youtube.com", label: "YouTube" },
  { slug: "tiktok", href: "https://tiktok.com", label: "TikTok" },
];

const PAYMENTS = ["visa", "mastercard", "jcb"];

function ContactIcon({ d }: { d: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">
      {d.split("|").map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

export function PublicFooter() {
  const year = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const onSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="mt-20 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-screen-2xl px-4 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1.3fr]">

          {/* Brand + newsletter */}
          <div>
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M2 20h20" />
                </svg>
              </span>
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">LaptopShop</span>
            </Link>
            <p className="mt-3 max-w-xs text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Cửa hàng laptop chính hãng. MacBook, Dell, HP, Lenovo, ASUS, Acer, MSI, Razer, bảo hành tới 24 tháng.
            </p>

            {/* Newsletter */}
            <form onSubmit={onSubscribe} className="mt-6 max-w-sm">
              <p className="text-theme-sm font-semibold text-gray-900 dark:text-white">Nhận ưu đãi mới nhất</p>
              <div className="mt-2 flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setSubscribed(false); }}
                  placeholder="Email của bạn"
                  className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-theme-sm text-gray-800 placeholder:text-gray-400 transition-colors focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
                <button
                  type="submit"
                  className="h-10 shrink-0 rounded-lg bg-brand-500 px-4 text-theme-sm font-semibold text-white transition-colors hover:bg-brand-600 active:scale-[0.98]"
                >
                  Đăng ký
                </button>
              </div>
              {subscribed && (
                <p className="mt-2 text-theme-xs font-medium text-success-600 dark:text-success-400">
                  Cảm ơn bạn! Chúng tôi sẽ gửi ưu đãi sớm nhất.
                </p>
              )}
            </form>

            {/* Socials */}
            <div className="mt-6 flex items-center gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.slug}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10"
                >
                  <img src={`https://cdn.simpleicons.org/${s.slug}/9ca3af`} alt={s.label} className="h-4 w-4" loading="lazy" />
                </a>
              ))}
            </div>
          </div>

          {/* Mua sắm */}
          <FooterColumn title="Mua sắm" links={SHOP_LINKS} />

          {/* Hỗ trợ */}
          <FooterColumn title="Hỗ trợ" links={SUPPORT_LINKS} />

          {/* Liên hệ */}
          <div>
            <h4 className="text-theme-sm font-semibold text-gray-900 dark:text-white">Liên hệ</h4>
            <ul className="mt-3 space-y-2.5 text-theme-sm text-gray-500 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <ContactIcon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                <a href="tel:0798175906" className="hover:text-brand-500">0798175906</a>
              </li>
              <li className="flex items-start gap-2">
                <ContactIcon d="M2 4h20v16H2z|m22 6-10 7L2 6" />
                <a href="mailto:minhnhatluongwork@gmail.com" className="break-all hover:text-brand-500">minhnhatluongwork@gmail.com</a>
              </li>
              <li className="flex items-start gap-2">
                <ContactIcon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z|M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                <span>Hà Nội, Việt Nam</span>
              </li>
              <li className="flex items-start gap-2">
                <ContactIcon d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 6v6l4 2" />
                <span>8:00 - 22:00 hàng ngày</span>
              </li>
            </ul>

            {/* Payment methods */}
            <p className="mt-5 text-theme-xs font-semibold uppercase tracking-wider text-gray-400">Thanh toán</p>
            <div className="mt-2 flex items-center gap-2">
              {PAYMENTS.map((p) => (
                <span key={p} className="flex h-7 items-center rounded-md border border-gray-200 bg-white px-2 dark:border-gray-700">
                  <img src={`https://cdn.simpleicons.org/${p}`} alt={p} className="h-4" loading="lazy" />
                </span>
              ))}
              <span className="rounded-md border border-gray-200 px-2 py-1 text-theme-xs font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Trả góp 0%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-3 px-4 py-5 text-theme-xs text-gray-500 dark:text-gray-400 sm:flex-row lg:px-8">
          <p>© {year} LaptopShop. Bảo lưu mọi quyền.</p>
          <div className="flex items-center gap-5">
            <Link to="/contact" className="hover:text-brand-500">Điều khoản</Link>
            <Link to="/contact" className="hover:text-brand-500">Bảo mật</Link>
            <Link to="/contact" className="hover:text-brand-500">Cookie</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-theme-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      <ul className="mt-3 space-y-2.5 text-theme-sm text-gray-500 dark:text-gray-400">
        {links.map((l) => (
          <li key={l.to + l.label}>
            <Link to={l.to} className="transition-colors hover:text-brand-500">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
