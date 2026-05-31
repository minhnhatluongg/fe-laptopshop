import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { PublicLayout } from "@/layout/PublicLayout";
import { AdminLayout } from "@/layout/AdminLayout";
import { AccountLayout, ProfileTab } from "@/pages/public/account/AccountPage";
import { RequireAdmin } from "@/router/guards";

const HomePage            = lazy(() => import("@/pages/public/Home"));
const LoginPage           = lazy(() => import("@/pages/auth/Login"));
const NotFoundPage        = lazy(() => import("@/pages/NotFound"));
const AdminDashboardPage  = lazy(() => import("@/pages/admin/Dashboard"));
const AdminPlaceholder    = lazy(() => import("@/pages/admin/Placeholder"));
const AdminProductsList   = lazy(() => import("@/pages/admin/products/ProductsList"));
const AdminProductForm    = lazy(() => import("@/pages/admin/products/ProductForm"));
const ChangePasswordTab   = lazy(() => import("@/pages/public/account/ChangePasswordTab"));
const WalletTab           = lazy(() => import("@/pages/public/account/WalletTab"));
const AdminBannersPage    = lazy(() => import("@/pages/admin/banners/BannersPage"));
const AdminShowroomsPage  = lazy(() => import("@/pages/admin/showrooms/ShowroomsPage"));
const ProductsPage        = lazy(() => import("@/pages/public/ProductsPage"));
const ProductDetailPage   = lazy(() => import("@/pages/public/ProductDetailPage"));
const BrandsPage          = lazy(() => import("@/pages/public/BrandsPage"));
const CartPage            = lazy(() => import("@/pages/public/CartPage"));
const SalePage            = lazy(() => import("@/pages/public/SalePage"));
const ContactPage         = lazy(() => import("@/pages/public/ContactPage"));
const WarrantyPage        = lazy(() => import("@/pages/public/WarrantyPage"));

function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Public storefront */}
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/:slug" element={<ProductDetailPage />} />
              <Route path="brands" element={<BrandsPage />} />
              <Route path="sale"     element={<SalePage />} />
              <Route path="contact"  element={<ContactPage />} />
              <Route path="warranty" element={<WarrantyPage />} />
              <Route path="cart" element={<CartPage />} />

              {/* Account — nested tabs */}
              <Route path="account" element={<AccountLayout />}>
                <Route index element={<ProfileTab />} />
                <Route path="password" element={<ChangePasswordTab />} />
                <Route path="wallet"   element={<WalletTab />} />
                <Route path="orders"   element={<AdminPlaceholder title="Đơn hàng của tôi" />} />
              </Route>
            </Route>

            {/* Auth */}
            <Route path="/auth/login"    element={<LoginPage />} />
            <Route path="/auth/register" element={<AdminPlaceholder title="Đăng ký" />} />

            {/* Admin panel */}
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index        element={<AdminDashboardPage />} />
              <Route path="products"     element={<AdminProductsList />} />
              <Route path="products/new" element={<AdminProductForm />} />
              <Route path="products/:id" element={<AdminProductForm />} />
              <Route path="categories"   element={<AdminPlaceholder title="Quản lý danh mục" />} />
              <Route path="brands"       element={<AdminPlaceholder title="Quản lý thương hiệu" />} />
              <Route path="inventory"    element={<AdminPlaceholder title="Quản lý tồn kho" />} />
              <Route path="orders"       element={<AdminPlaceholder title="Quản lý đơn hàng" />} />
              <Route path="users"        element={<AdminPlaceholder title="Quản lý người dùng" />} />
              <Route path="roles"        element={<AdminPlaceholder title="Phân quyền" />} />
              <Route path="banners"      element={<AdminBannersPage />} />
              <Route path="showrooms"    element={<AdminShowroomsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
