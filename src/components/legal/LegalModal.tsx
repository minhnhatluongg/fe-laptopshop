import type { ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/* ──────────────────────────────────────────────────────────────────────────
 * LegalModal — pop-up đọc Điều khoản dịch vụ & Chính sách bảo mật.
 *   doc = null  → đóng
 *   onAgree     → (tuỳ chọn) nút "Tôi đồng ý" tích vào checkbox rồi đóng
 * ────────────────────────────────────────────────────────────────────────── */

export type LegalDoc = "terms" | "privacy";

const LAST_UPDATED = "04/06/2026";

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="scroll-mt-4">
      <h3 className="flex items-center gap-2.5 text-theme-sm font-semibold text-gray-900 dark:text-white">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-theme-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
          {n}
        </span>
        {title}
      </h3>
      <div className="mt-2 space-y-2 pl-[2.125rem] text-theme-sm leading-relaxed text-gray-600 dark:text-gray-400">
        {children}
      </div>
    </section>
  );
}

function UpdatedBadge() {
  return (
    <p className="flex items-center gap-1.5 text-theme-xs text-gray-400 dark:text-gray-500">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
      Cập nhật lần cuối: {LAST_UPDATED}
    </p>
  );
}

// ── Điều khoản dịch vụ ──────────────────────────────────────────────────────
function TermsContent() {
  return (
    <div className="space-y-6">
      <UpdatedBadge />
      <p className="text-theme-sm leading-relaxed text-gray-600 dark:text-gray-400">
        Vui lòng đọc kỹ các điều khoản dưới đây trước khi sử dụng dịch vụ của LaptopShop.
        Khi tạo tài khoản hoặc đặt hàng, bạn đồng ý tuân thủ toàn bộ nội dung này.
      </p>

      <Section n={1} title="Tài khoản của bạn">
        <p>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động phát sinh từ tài khoản của mình. Vui lòng cung cấp thông tin chính xác, đầy đủ khi đăng ký và cập nhật khi có thay đổi.</p>
      </Section>

      <Section n={2} title="Đặt hàng và thanh toán">
        <p>Đơn hàng được xác nhận sau khi bạn hoàn tất bước thanh toán hoặc khi nhân viên gọi xác nhận. LaptopShop có quyền từ chối hoặc huỷ đơn trong trường hợp hết hàng, sai sót giá hiển thị, hoặc nghi ngờ gian lận.</p>
      </Section>

      <Section n={3} title="Giá và khuyến mãi">
        <p>Giá sản phẩm đã bao gồm thuế VAT, trừ khi có ghi chú khác. Các chương trình khuyến mãi, mã giảm giá và điểm thành viên áp dụng theo điều kiện công bố tại thời điểm mua và không quy đổi thành tiền mặt.</p>
      </Section>

      <Section n={4} title="Giao hàng">
        <p>Thời gian giao hàng là dự kiến và có thể thay đổi do yếu tố vận chuyển khách quan. Bạn vui lòng kiểm tra tình trạng kiện hàng khi nhận và phản hồi ngay nếu phát hiện hư hỏng bên ngoài.</p>
      </Section>

      <Section n={5} title="Đổi trả và hoàn tiền">
        <p>Sản phẩm được đổi trả trong vòng 7 ngày kể từ ngày nhận, với điều kiện còn nguyên tem, phụ kiện và hoá đơn. Sản phẩm lỗi do nhà sản xuất được hỗ trợ đổi mới hoặc hoàn tiền theo chính sách hiện hành.</p>
      </Section>

      <Section n={6} title="Bảo hành">
        <p>Sản phẩm được bảo hành chính hãng từ 12 đến 24 tháng tuỳ dòng máy. Bảo hành không áp dụng cho hư hỏng do rơi vỡ, vào nước, hoặc can thiệp phần cứng không đúng quy định.</p>
      </Section>

      <Section n={7} title="Quyền sở hữu trí tuệ">
        <p>Toàn bộ nội dung, hình ảnh, logo và thiết kế trên website thuộc quyền sở hữu của LaptopShop. Bạn không được sao chép hoặc sử dụng cho mục đích thương mại khi chưa có sự đồng ý bằng văn bản.</p>
      </Section>

      <Section n={8} title="Giới hạn trách nhiệm">
        <p>LaptopShop không chịu trách nhiệm cho thiệt hại gián tiếp phát sinh ngoài giá trị đơn hàng, trừ trường hợp pháp luật quy định khác. Chúng tôi nỗ lực bảo đảm thông tin sản phẩm chính xác nhưng không loại trừ sai sót khách quan.</p>
      </Section>

      <Section n={9} title="Thay đổi điều khoản">
        <p>Chúng tôi có thể cập nhật điều khoản theo thời gian. Phiên bản mới có hiệu lực ngay khi đăng tải. Việc bạn tiếp tục sử dụng dịch vụ đồng nghĩa với chấp nhận nội dung đã cập nhật.</p>
      </Section>

      <Section n={10} title="Liên hệ">
        <p>Mọi thắc mắc về điều khoản, vui lòng liên hệ <span className="font-medium text-gray-700 dark:text-gray-300">cusocisme@gmail</span> hoặc tổng đài <span className="font-medium text-gray-700 dark:text-gray-300">079.817.5906</span>.</p>
      </Section>
    </div>
  );
}

// ── Chính sách bảo mật ──────────────────────────────────────────────────────
function PrivacyContent() {
  return (
    <div className="space-y-6">
      <UpdatedBadge />
      <p className="text-theme-sm leading-relaxed text-gray-600 dark:text-gray-400">
        LaptopShop tôn trọng quyền riêng tư của bạn. Chính sách này giải thích chúng tôi thu thập,
        sử dụng và bảo vệ thông tin cá nhân của bạn như thế nào.
      </p>

      <Section n={1} title="Thông tin chúng tôi thu thập">
        <p>Chúng tôi thu thập thông tin bạn cung cấp khi đăng ký và đặt hàng: họ tên, email, số điện thoại, địa chỉ giao hàng. Ngoài ra, hệ thống tự động ghi nhận dữ liệu kỹ thuật như thiết bị, trình duyệt và lịch sử truy cập.</p>
      </Section>

      <Section n={2} title="Mục đích sử dụng">
        <p>Thông tin được dùng để xử lý đơn hàng, hỗ trợ bảo hành, gửi thông báo giao dịch, cải thiện trải nghiệm và gửi ưu đãi khi bạn đồng ý nhận.</p>
      </Section>

      <Section n={3} title="Chia sẻ thông tin">
        <p>Chúng tôi chỉ chia sẻ dữ liệu với đối tác vận chuyển, thanh toán và bảo hành ở mức cần thiết để hoàn tất dịch vụ. Chúng tôi không bán thông tin cá nhân của bạn cho bên thứ ba.</p>
      </Section>

      <Section n={4} title="Cookie">
        <p>Website sử dụng cookie để ghi nhớ giỏ hàng, đăng nhập và đo lường hiệu quả. Bạn có thể tắt cookie trong trình duyệt, nhưng một số tính năng có thể không hoạt động đầy đủ.</p>
      </Section>

      <Section n={5} title="Bảo mật dữ liệu">
        <p>Dữ liệu được mã hoá khi truyền và lưu trữ trên hệ thống có kiểm soát truy cập. Mật khẩu được băm một chiều và chúng tôi không bao giờ lưu mật khẩu dạng văn bản gốc.</p>
      </Section>

      <Section n={6} title="Quyền của bạn">
        <p>Bạn có quyền xem, chỉnh sửa hoặc yêu cầu xoá thông tin cá nhân, cũng như từ chối nhận email tiếp thị bất cứ lúc nào trong phần Tài khoản hoặc qua email hỗ trợ.</p>
      </Section>

      <Section n={7} title="Lưu trữ dữ liệu">
        <p>Chúng tôi lưu thông tin trong thời gian cần thiết để phục vụ giao dịch, bảo hành và tuân thủ nghĩa vụ pháp lý, sau đó dữ liệu sẽ được xoá hoặc ẩn danh.</p>
      </Section>

      <Section n={8} title="Thay đổi chính sách">
        <p>Chính sách có thể được cập nhật để phù hợp quy định mới. Chúng tôi sẽ thông báo các thay đổi quan trọng qua website hoặc email.</p>
      </Section>

      <Section n={9} title="Liên hệ">
        <p>Mọi yêu cầu liên quan đến dữ liệu cá nhân, vui lòng liên hệ <span className="font-medium text-gray-700 dark:text-gray-300">hotro@laptopshop.vn</span> hoặc tổng đài <span className="font-medium text-gray-700 dark:text-gray-300">1900 1234</span>.</p>
      </Section>
    </div>
  );
}

const META: Record<LegalDoc, { title: string; description: string }> = {
  terms: { title: "Điều khoản dịch vụ", description: "Quyền và nghĩa vụ khi sử dụng LaptopShop" },
  privacy: { title: "Chính sách bảo mật", description: "Cách chúng tôi xử lý dữ liệu cá nhân của bạn" },
};

export function LegalModal({
  doc, onClose, onAgree,
}: {
  doc: LegalDoc | null;
  onClose: () => void;
  onAgree?: () => void;
}) {
  const meta = doc ? META[doc] : null;

  return (
    <Modal
      open={doc !== null}
      onClose={onClose}
      size="lg"
      title={meta?.title}
      description={meta?.description}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          {onAgree && (
            <Button onClick={() => { onAgree(); onClose(); }}>Tôi đồng ý</Button>
          )}
        </>
      }
    >
      {doc === "terms" ? <TermsContent /> : doc === "privacy" ? <PrivacyContent /> : null}
    </Modal>
  );
}
