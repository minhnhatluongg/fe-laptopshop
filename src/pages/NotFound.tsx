import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-20">
      <div className="text-center">
        <p className="text-theme-sm font-medium text-brand-500">404</p>
        <h1 className="mt-3 text-title-md font-bold text-gray-900 dark:text-white">
          Không tìm thấy trang
        </h1>
        <p className="mt-3 text-theme-sm text-gray-500 dark:text-gray-400">
          Đường dẫn bạn truy cập không tồn tại hoặc đã được di chuyển.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand-500 px-6 text-theme-sm font-medium text-white hover:bg-brand-600"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
