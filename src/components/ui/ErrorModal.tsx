import { Modal } from "./Modal";
import { Button } from "./Button";

/* ──────────────────────────────────────────────────────────────────────────
 * ErrorModal — pop-up hiển thị thông điệp lỗi thật từ server cho người dùng.
 * Dùng thay cho toast khi cần người dùng đọc rõ lý do (vd: số dư ví không đủ).
 * ────────────────────────────────────────────────────────────────────────── */
export function ErrorModal({
  open,
  onClose,
  title = "Không thành công",
  message,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string | null;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm"
      footer={<Button onClick={onClose}>Đã hiểu</Button>}>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/15 dark:text-error-400">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        {message && (
          <p className="mt-1.5 whitespace-pre-line text-theme-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {message}
          </p>
        )}
      </div>
    </Modal>
  );
}
