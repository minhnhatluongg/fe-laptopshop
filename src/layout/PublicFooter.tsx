import { Link } from "react-router-dom";

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto grid max-w-screen-2xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M2 20h20" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              LaptopShop
            </span>
          </div>
          <p className="mt-3 text-theme-sm text-gray-500 dark:text-gray-400">
            Cửa hàng laptop chính hãng — MacBook, Dell, HP, Lenovo, ASUS, Acer, MSI, Razer.
          </p>
        </div>

        <div>
          <h4 className="text-theme-sm font-semibold text-gray-900 dark:text-white">
            Mua sắm
          </h4>
          <ul className="mt-3 space-y-2 text-theme-sm text-gray-500 dark:text-gray-400">
            <li><Link to="/products" className="hover:text-brand-500">Tất cả sản phẩm</Link></li>
            <li><Link to="/products?category=laptop-gaming" className="hover:text-brand-500">Gaming</Link></li>
            <li><Link to="/products?category=laptop-van-phong" className="hover:text-brand-500">Văn phòng</Link></li>
            <li><Link to="/products?category=macbook" className="hover:text-brand-500">MacBook</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-theme-sm font-semibold text-gray-900 dark:text-white">
            Hỗ trợ
          </h4>
          <ul className="mt-3 space-y-2 text-theme-sm text-gray-500 dark:text-gray-400">
            <li><Link to="/policy/shipping" className="hover:text-brand-500">Chính sách vận chuyển</Link></li>
            <li><Link to="/policy/return" className="hover:text-brand-500">Đổi trả &amp; bảo hành</Link></li>
            <li><Link to="/policy/payment" className="hover:text-brand-500">Thanh toán</Link></li>
            <li><Link to="/contact" className="hover:text-brand-500">Liên hệ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-theme-sm font-semibold text-gray-900 dark:text-white">
            Liên hệ
          </h4>
          <ul className="mt-3 space-y-2 text-theme-sm text-gray-500 dark:text-gray-400">
            <li>Email: hello@laptopshop.vn</li>
            <li>Hotline: 1900 xxx xxx</li>
            <li>Hà Nội — Việt Nam</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-800">
        <p className="mx-auto max-w-screen-2xl text-center text-theme-xs text-gray-500 dark:text-gray-400">
          © {year} LaptopShop. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
