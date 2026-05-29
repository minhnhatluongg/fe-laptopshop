import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { productDetailApi } from "@/api";
import type {
  CurrentUserContext,
  ProductComment,
  ProductDetail,
  ProductReview,
} from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Badge } from "@/components/ui/Badge";
import { formatVND, formatDateTime } from "@/utils/format";
import { getImageUrl, IMAGE_PLACEHOLDER } from "@/utils/image";
import { cn } from "@/utils/cn";

/* -------------------------------------------------------------------------- */
/*  Trang chi tiết sản phẩm                                                  */
/*                                                                            */
/*  - Lấy chi tiết + thông số + review + comment.                            */
/*  - Comment: bất kỳ user đã login. Hiển thị nhãn "Đã mua hàng" nếu user    */
/*    đã từng mua CHÍNH sản phẩm này (User A mua SP A → SP A "đã mua";       */
/*    User A mua SP B → SP A vẫn "chưa mua"). Nếu chưa login → "Chưa đăng    */
/*    nhập".                                                                  */
/*  - Review: chỉ user đã mua mới được tạo (backend enforce).                */
/*  - Mỗi comment/review hiển thị danh hiệu (LoyaltyTierName) từ UserLoyalty.*/
/* -------------------------------------------------------------------------- */

const ADMIN_ROLES = ["Admin", "Manager"];

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const toast = useToast();

  // Param có thể là slug ("apple-macbook-pro-...") hoặc id ("1") — hỗ trợ cả hai.
  const isNumericId = !!slug && /^\d+$/.test(slug);
  const numericId = isNumericId ? Number(slug) : null;

  const [productId, setProductId] = useState<number | null>(numericId);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [context, setContext] = useState<CurrentUserContext | null>(null);
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [activeImage, setActiveImage] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Form states
  const [commentText, setCommentText] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ----- Reload toàn bộ dữ liệu chi tiết qua slug HOẶC id -----
  const reloadAll = useCallback(async () => {
    if (!slug) return;
    const [detail, ctx, cmts, rvs] = isNumericId
      ? await Promise.all([
          productDetailApi.getDetail(Number(slug)),
          productDetailApi.getContext(Number(slug)),
          productDetailApi.getComments(Number(slug)),
          productDetailApi.getReviews(Number(slug)),
        ])
      : await Promise.all([
          productDetailApi.getDetailBySlug(slug),
          productDetailApi.getContextBySlug(slug),
          productDetailApi.getCommentsBySlug(slug),
          productDetailApi.getReviewsBySlug(slug),
        ]);
    setProduct(detail);
    setProductId(detail.id); // luôn lấy id thật từ response để POST comment/review
    setContext(ctx);
    setComments(cmts);
    setReviews(rvs);
    const main = detail.images?.find((i) => i.isMain) ?? detail.images?.[0];
    if (main?.imageUrl) setActiveImage(main.imageUrl);
  }, [slug, isNumericId]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    reloadAll()
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Lỗi tải dữ liệu";
        toast.error("Không tải được trang chi tiết", msg);
      })
      .finally(() => setLoading(false));
  }, [slug, reloadAll]); // eslint-disable-line react-hooks/exhaustive-deps

  const finalPrice = useMemo(() => {
    if (!product) return 0;
    return product.discount
      ? Math.round(product.price * (1 - product.discount / 100))
      : product.price;
  }, [product]);

  const canDelete = (ownerId: number | null | undefined) =>
    !!user && (user.id === ownerId || ADMIN_ROLES.includes(user.role));

  // ----- Actions -----
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await productDetailApi.createComment({
        productId,
        content: commentText.trim(),
      });
      setCommentText("");
      const fresh = await productDetailApi.getComments(productId);
      setComments(fresh);
      toast.success("Đã đăng bình luận");
    } catch (e: unknown) {
      toast.error("Không gửi được bình luận", e instanceof Error ? e.message : "");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !reviewRating) {
      toast.warning("Vui lòng chọn số sao");
      return;
    }
    setSubmitting(true);
    try {
      await productDetailApi.createReview({
        productId,
        rating: reviewRating,
        comment: reviewText.trim() || null,
      });
      setReviewRating(0);
      setReviewText("");
      const [detail, rvs] = await Promise.all([
        productDetailApi.getDetail(productId),
        productDetailApi.getReviews(productId),
      ]);
      setProduct(detail);
      setReviews(rvs);
      toast.success("Cảm ơn bạn đã đánh giá!");
    } catch (e: unknown) {
      toast.error("Không gửi được đánh giá", e instanceof Error ? e.message : "");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (id: number) => {
    if (!productId || !confirm("Xóa bình luận này?")) return;
    try {
      await productDetailApi.deleteComment(id);
      setComments(await productDetailApi.getComments(productId));
    } catch (e: unknown) {
      toast.error("Xóa thất bại", e instanceof Error ? e.message : "");
    }
  };

  const handleDeleteReview = async (id: number) => {
    if (!productId || !confirm("Xóa đánh giá này?")) return;
    try {
      await productDetailApi.deleteReview(id);
      const [detail, rvs] = await Promise.all([
        productDetailApi.getDetail(productId),
        productDetailApi.getReviews(productId),
      ]);
      setProduct(detail);
      setReviews(rvs);
    } catch (e: unknown) {
      toast.error("Xóa thất bại", e instanceof Error ? e.message : "");
    }
  };

  /* -------------------- RENDER -------------------- */

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-screen-md px-4 py-12 text-center text-gray-500">
        Không tìm thấy sản phẩm.
      </div>
    );
  }

  const specRows: Array<[string, string]> = product.specification
    ? ([
        ["CPU", product.specification.cpu],
        ["RAM", product.specification.ram],
        ["Ổ cứng", product.specification.storage],
        ["GPU", product.specification.gpu],
        ["Màn hình", product.specification.screen],
        ["Hệ điều hành", product.specification.os],
        ["Cổng kết nối", product.specification.ports],
        ["Trọng lượng", product.specification.weight],
        ["Pin", product.specification.battery],
      ].filter(([, v]) => !!v) as Array<[string, string]>)
    : [];

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8 md:px-8">
      {/* ─── Card sản phẩm ────────────────────────────────────────── */}
      <div className="grid gap-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900 md:grid-cols-[420px_1fr]">
        {/* Gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800">
            <img
              src={activeImage ? getImageUrl(activeImage) : IMAGE_PLACEHOLDER}
              alt={product.name}
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = IMAGE_PLACEHOLDER;
              }}
            />
          </div>
          {product.images?.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => img.imageUrl && setActiveImage(img.imageUrl)}
                  className={cn(
                    "h-16 w-16 overflow-hidden rounded-lg border-2 transition",
                    activeImage === img.imageUrl
                      ? "border-brand-500"
                      : "border-transparent hover:border-gray-300",
                  )}
                >
                  <img
                    src={getImageUrl(img.imageUrl)}
                    alt={img.altText ?? ""}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="text-theme-sm text-gray-500 dark:text-gray-400">
            {[product.brandName, product.categoryName].filter(Boolean).join(" • ")}
          </div>
          <h1 className="mt-2 font-outfit text-2xl font-bold text-gray-900 dark:text-white">
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-3">
            <StarRow value={Math.round(product.averageRating)} />
            <span className="font-medium text-gray-900 dark:text-white">
              {product.averageRating.toFixed(1)}
            </span>
            <span className="text-theme-sm text-gray-500">
              ({product.totalReviews} đánh giá • {product.totalComments} bình luận)
            </span>
          </div>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-error-500">
              {formatVND(finalPrice)}
            </span>
            {product.discount ? (
              <>
                <span className="text-lg text-gray-400 line-through">
                  {formatVND(product.price)}
                </span>
                <Badge color="error" variant="light">
                  -{product.discount}%
                </Badge>
              </>
            ) : null}
          </div>

          <div className="mt-3">
            {(product.inStock ?? 0) > 0 ? (
              <Badge color="success" variant="light">
                Còn hàng ({product.inStock})
              </Badge>
            ) : (
              <Badge color="error" variant="light">Hết hàng</Badge>
            )}
          </div>

          {product.description && (
            <p className="mt-4 whitespace-pre-line text-theme-sm text-gray-600 dark:text-gray-300">
              {product.description}
            </p>
          )}

          {/* Context viewer */}
          <ContextBanner ctx={context} />
        </div>
      </div>

      {/* ─── Thông số kỹ thuật ─────────────────────────────────────── */}
      <Section title="Thông số kỹ thuật">
        {specRows.length === 0 ? (
          <p className="text-theme-sm text-gray-500">Chưa có thông số.</p>
        ) : (
          <table className="w-full text-theme-sm">
            <tbody>
              {specRows.map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="w-48 py-2.5 font-medium text-gray-500">{k}</td>
                  <td className="py-2.5 text-gray-900 dark:text-white">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* ─── Đánh giá ──────────────────────────────────────────────── */}
      <Section title={`Đánh giá (${product.totalReviews})`}>
        {context?.canReview ? (
          <form
            onSubmit={handleSubmitReview}
            className="mb-6 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40"
          >
            <div className="mb-2 text-theme-sm font-medium">Đánh giá của bạn:</div>
            <StarInput value={reviewRating} onChange={setReviewRating} />
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
              className="mt-3 min-h-[80px] w-full rounded-lg border border-gray-200 px-3 py-2 text-theme-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
            <div className="mt-3 text-right">
              <button
                type="submit"
                disabled={submitting || !reviewRating}
                className="rounded-lg bg-brand-500 px-5 py-2 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Gửi đánh giá
              </button>
            </div>
          </form>
        ) : !context?.isAuthenticated ? (
          <InfoBanner>Vui lòng đăng nhập để đánh giá sản phẩm.</InfoBanner>
        ) : (
          <InfoBanner tone="warning">
            Bạn cần MUA và NHẬN sản phẩm này trước khi đánh giá.
          </InfoBanner>
        )}

        {reviews.length === 0 ? (
          <EmptyHint>Chưa có đánh giá nào.</EmptyHint>
        ) : (
          <ul>
            {reviews.map((r) => (
              <li
                key={r.id}
                className="flex gap-3 border-b border-gray-100 py-4 last:border-b-0 dark:border-gray-800"
              >
                <Avatar url={r.userAvatarUrl} name={r.userFullName} />
                <div className="flex-1">
                  <HeaderLine
                    name={r.userFullName}
                    time={r.createdAt}
                    badges={
                      <>
                        {r.loyaltyTierName && (
                          <Badge color="warning" variant="light">
                            ★ {r.loyaltyTierName}
                          </Badge>
                        )}
                        {r.isVerifiedPurchase && (
                          <Badge color="info" variant="light">
                            ✓ Mua hàng đã xác minh
                          </Badge>
                        )}
                      </>
                    }
                  />
                  <div className="mt-1">
                    <StarRow value={r.rating ?? 0} />
                  </div>
                  {r.comment && (
                    <p className="mt-1.5 text-theme-sm text-gray-700 dark:text-gray-200">
                      {r.comment}
                    </p>
                  )}
                  {canDelete(r.userId) && (
                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      className="mt-1 text-theme-xs text-error-500 hover:underline"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ─── Bình luận ─────────────────────────────────────────────── */}
      <Section title={`Bình luận (${product.totalComments})`}>
        {context?.canComment ? (
          <form
            onSubmit={handleSubmitComment}
            className="mb-6 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40"
          >
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Viết bình luận của bạn..."
              required
              className="min-h-[70px] w-full rounded-lg border border-gray-200 px-3 py-2 text-theme-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
            <div className="mt-3 text-right">
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="rounded-lg bg-brand-500 px-5 py-2 text-theme-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Gửi bình luận
              </button>
            </div>
          </form>
        ) : (
          <InfoBanner>Vui lòng đăng nhập để bình luận.</InfoBanner>
        )}

        {comments.length === 0 ? (
          <EmptyHint>Chưa có bình luận nào.</EmptyHint>
        ) : (
          <ul>
            {comments.map((c) => (
              <li
                key={c.id}
                className="flex gap-3 border-b border-gray-100 py-4 last:border-b-0 dark:border-gray-800"
              >
                <Avatar url={c.userAvatarUrl} name={c.userFullName} />
                <div className="flex-1">
                  <HeaderLine
                    name={c.userFullName}
                    time={c.createdAt}
                    badges={
                      <>
                        {c.loyaltyTierName && (
                          <Badge color="warning" variant="light">
                            ★ {c.loyaltyTierName}
                          </Badge>
                        )}
                        {c.hasPurchasedThisProduct ? (
                          <Badge color="success" variant="light">
                            ✓ Đã mua hàng
                          </Badge>
                        ) : (
                          <Badge color="light" variant="light">
                            Chưa mua
                          </Badge>
                        )}
                      </>
                    }
                  />
                  <p className="mt-1 text-theme-sm text-gray-700 dark:text-gray-200">
                    {c.content}
                  </p>
                  {canDelete(c.userId) && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="mt-1 text-theme-xs text-error-500 hover:underline"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/* ============================ Sub-components ============================ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
      <h2 className="mb-4 border-b border-gray-100 pb-3 text-lg font-semibold text-gray-900 dark:border-gray-800 dark:text-white">
        {title}
      </h2>
      {children}
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  return (
    <span className="text-warning-500">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= value ? "" : "text-gray-300 dark:text-gray-600"}>
          ★
        </span>
      ))}
    </span>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex gap-1 text-2xl">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={cn(
            "transition",
            i <= value ? "text-warning-500" : "text-gray-300 hover:text-warning-300",
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function Avatar({ url, name }: { url?: string | null; name?: string | null }) {
  if (url) {
    return (
      <img
        src={getImageUrl(url)}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
      {initial}
    </div>
  );
}

function HeaderLine({
  name,
  time,
  badges,
}: {
  name?: string | null;
  time?: string | null;
  badges: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-theme-sm font-semibold text-gray-900 dark:text-white">
        {name ?? "Người dùng"}
      </span>
      {badges}
      {time && <span className="text-theme-xs text-gray-400">{formatDateTime(time)}</span>}
    </div>
  );
}

function ContextBanner({ ctx }: { ctx: CurrentUserContext | null }) {
  if (!ctx) return null;
  if (!ctx.isAuthenticated) {
    return (
      <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-theme-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        <span>Bạn đang xem với tư cách</span>
        <Badge color="light" variant="light">Khách (chưa đăng nhập)</Badge>
      </div>
    );
  }
  return (
    <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-theme-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
      <span>Xin chào, <strong>{ctx.fullName}</strong></span>
      {ctx.loyaltyTierName && (
        <Badge color="warning" variant="light">★ {ctx.loyaltyTierName}</Badge>
      )}
      {ctx.hasPurchasedThisProduct ? (
        <Badge color="success" variant="light">✓ Bạn đã mua sản phẩm này</Badge>
      ) : (
        <Badge color="light" variant="light">Bạn chưa mua sản phẩm này</Badge>
      )}
    </div>
  );
}

function InfoBanner({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <div
      className={cn(
        "mb-5 rounded-lg px-4 py-3 text-theme-sm",
        tone === "warning"
          ? "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400"
          : "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
      )}
    >
      {children}
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center text-theme-sm text-gray-500">{children}</p>
  );
}
