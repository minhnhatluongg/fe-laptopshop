// =============================================================
// Shared API types — mirrors backend DTOs at api/v1/*
// =============================================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[] | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationQuery {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ---------- Auth ----------
export interface UserSummary {
  id: number;
  email: string;
  fullName: string;
  role: string;
  emailConfirmed: boolean;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiration: string;
  refreshTokenExpiration: string;
  tokenType: string;
  expiresIn: number;
  user: UserSummary;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
}

export interface RefreshTokenRequest {
  refreshToken?: string | null;
}

// ---------- Brand ----------
export interface Brand {
  id: number;
  name: string;
  description?: string | null;
  slug?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateBrandRequest {
  name: string;
  description?: string | null;
  slug?: string | null;
  isActive?: boolean;
}

export type UpdateBrandRequest = Partial<CreateBrandRequest> & { id: number };

// ---------- Category ----------
export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: number | null;
  isActive: boolean;
  displayOrder: number;
  imageFileId?: number | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: number | null;
  isActive?: boolean;
  displayOrder?: number;
}

export type UpdateCategoryRequest = Partial<CreateCategoryRequest> & {
  id: number;
};

// ---------- Product ----------
export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  discount?: number | null;
  inStock?: number | null;

  // Category
  categoryId?: number | null;
  categoryName?: string | null;

  // Brand
  brandId?: number | null;
  brandName?: string | null;
  brandSlug?: string | null;

  // Ảnh chính — trả từ GetAll (không cần load productImages toàn bộ)
  mainImageUrl?: string | null;

  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;

  // Detail endpoints (GetById) trả thêm các list này
  category?: Category | null;
  brand?: Brand | null;
  productImages?: ProductImage[];
  productSpecifications?: ProductSpecification[];

  // Specs tóm tắt — backend trả từ ProductSpecifications.First() để hiển thị trên card
  cpu?: string | null;
  gpu?: string | null;
  ram?: string | null;
  storage?: string | null;
  screen?: string | null;
  battery?: string | null;
  weight?: string | null;

  // Review summary
  averageRating?: number;
  totalReviews?: number;
  totalComments?: number;
}

export interface CreateProductRequest {
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  discount?: number | null;
  inStock?: number | null;
  categoryId?: number | null;
  brandId?: number | null;
  isActive?: boolean;
}

export type UpdateProductRequest = Partial<CreateProductRequest> & {
  id: number;
};

export interface ProductFilter extends PaginationQuery {
  categoryId?: number;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  maxDiscount?: number;
  isActive?: boolean;
}

// ---------- Product Specification ----------
export interface ProductSpecification {
  id: number;
  productId?: number | null;
  cpu?: string | null;
  ram?: string | null;
  storage?: string | null;
  gpu?: string | null;
  screen?: string | null;
  os?: string | null;
  ports?: string | null;
  weight?: string | null;
  battery?: string | null;
}

// ---------- Product Image ----------
export interface ProductImage {
  id: number;
  productId: number;
  sysFileId?: number | null;
  imageUrl?: string | null;
  isMain: boolean;
  fileType: string;
  fileSize: number;
  displayOrder: number;
  altText?: string | null;
  title?: string | null;
  createdAt: string;
  uploadedAt: string;
  isActive: boolean;
  createdBy?: string | null;
}

// ---------- Order ----------
export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Shipping"
  | "Delivered"
  | "Cancelled"
  | "Returned";

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  product?: Product | null;
}

export interface Order {
  id: number;
  userId: number;
  orderDate: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAddress?: string | null;
  paymentMethod?: string | null;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  cancelReason?: string | null;
  notes?: string | null;
  items: OrderItem[];
}

export interface CreateOrderRequest {
  items: { productId: number; quantity: number }[];
  createFromCart?: boolean;      // true = lấy từ giỏ hàng thay vì items[]
  shippingAddressId?: number;
  paymentMethod?: string;
  shippingMethod?: string;
  discountCode?: string;
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string | null;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  cancelReason?: string | null;
}

// ---------- Shopping Cart ----------
export interface CartItem {
  id: number;
  shoppingCartId?: number;
  productId: number;
  // Flat fields từ ShoppingCartItemDto (backend)
  productName: string;
  productImageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;   // = unitPrice * quantity (giá đã nhân số lượng)
  addedAt?: string;
  isInStock?: boolean;
  // legacy compat — một số nơi dùng subtotal, map sang totalPrice
  subtotal?: number;
}

export interface ShoppingCart {
  id: number;
  userId: number;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
}

export interface CartSummary {
  totalItems: number;
  totalAmount: number;
  discount: number;
}

// ---------- UserProfile (self-service, returned by GET /auth/me/profile) ----------
export interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  roleId: number;
  roleName?: string | null;
  isActive: boolean;
  emailConfirmed: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

// ---------- Wallet ----------
export type WalletTransactionType =
  | "TopUp" | "Payment" | "Refund" | "Reward" | "Adjustment" | "Withdraw";

export interface WalletDto {
  id: number;
  userId: number;
  balance: number;
  lifetimeTopUp: number;
  lifetimeSpent: number;
  isActive: boolean;
  isLocked: boolean;
  lockReason?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface WalletTransactionDto {
  id: number;
  walletId: number;
  type: WalletTransactionType;
  typeLabel: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  note?: string | null;
  createdAt: string;
  createdBy?: string | null;
}

// ---------- User ----------
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  roleId: number;
  role?: Role | null;
  isActive: boolean;
  emailConfirmed: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  createdBy?: string | null;
}

// ---------- Role ----------
export interface Role {
  id: number;
  code: string;
  name: string;
  description?: string | null;
}

// ---------- User Address ----------
export interface UserAddress {
  id: number;
  userId: number;
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: string;
}

// ---------- Inventory History ----------
export type InventoryTransactionType =
  | "Purchase"
  | "Sale"
  | "Return"
  | "Adjustment"
  | "Transfer";

export interface InventoryHistory {
  id: number;
  inventoryId: number;
  productId: number;
  transactionType: InventoryTransactionType;
  quantity: number;
  unitPrice: number;
  reason?: string | null;
  createdAt: string;
  createdBy?: string | null;
}

// ---------- File upload ----------
export interface ChunkUploadResponse {
  isCompleted: boolean;
  sysFileId: number;
  fileUrl: string;
}

// ---------- Product Detail (page) ----------
export interface ProductDetail {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  discount?: number | null;
  inStock?: number | null;
  isActive: boolean;
  categoryId?: number | null;
  categoryName?: string | null;
  brandId?: number | null;
  brandName?: string | null;
  images: ProductImage[];
  specification?: ProductSpecification | null;
  averageRating: number;
  totalReviews: number;
  totalComments: number;
  ratingBreakdown: Record<string, number>;
}

export interface CurrentUserContext {
  isAuthenticated: boolean;
  userId?: number | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  loyaltyTierName?: string | null;
  hasPurchasedThisProduct: boolean;
  canComment: boolean;
  canReview: boolean;
}

export interface ProductComment {
  id: number;
  productId: number;
  userId: number;
  userFullName?: string | null;
  userAvatarUrl?: string | null;
  content: string;
  parentCommentId?: number | null;
  createdAt: string;
  /** User comment đã mua chính sản phẩm này chưa */
  hasPurchasedThisProduct: boolean;
  /** Danh hiệu thành viên (vd: Đồng/Bạc/Vàng) */
  loyaltyTierName?: string | null;
}

export interface CreateProductCommentRequest {
  productId: number;
  content: string;
  parentCommentId?: number | null;
}

export interface ProductReview {
  id: number;
  productId: number;
  userId?: number | null;
  userFullName?: string | null;
  userAvatarUrl?: string | null;
  rating?: number | null;
  comment?: string | null;
  createdAt?: string | null;
  /** True nếu user review đã mua chính sản phẩm này */
  isVerifiedPurchase: boolean;
  loyaltyTierName?: string | null;
}

export interface CreateProductReviewRequest {
  productId: number;
  rating: number;
  comment?: string | null;
}

