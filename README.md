# fe-LaptopShop

Frontend cho **E-LaptopShop** — public storefront + admin panel.
UI dựa trên phong cách TailAdmin (Tailwind v4, Outfit, brand `#465fff`).

## Stack
- React 19 + TypeScript
- Vite 6
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- React Router 7
- Axios (JWT interceptor + refresh-token retry)

## Cấu trúc

```
src/
├── api/              # Service files (1 file / controller), types, axios client
├── components/
│   ├── ui/           # Button, Badge, Card, Table primitives
│   └── common/       # ThemeToggleButton, ...
├── context/          # ThemeContext, SidebarContext, AuthContext
├── layout/           # AdminLayout, PublicLayout + header/sidebar/footer
├── pages/
│   ├── admin/        # Dashboard + placeholders
│   ├── auth/         # Login
│   └── public/       # Home (index)
├── router/           # RequireAuth / RequireAdmin guards
├── utils/            # cn(), formatVND(), formatDate()
├── App.tsx           # Routes
├── main.tsx
└── index.css         # Theme tokens (colors, typography, shadows)
```

## ENV

Sao chép `.env.example` → `.env.local` (gitignored) để override.

| Biến                       | Mặc định dev                          | Production                                |
| -------------------------- | ------------------------------------- | ----------------------------------------- |
| `VITE_API_BASE_URL`        | `https://localhost:7299`              | `https://be-shopminhnhat.win-tech.vn`     |
| `VITE_SITE_NAME`           | `LaptopShop (Dev)`                    | `LaptopShop`                              |
| `VITE_DEFAULT_THEME`       | `light`                               | `light`                                   |
| `VITE_TOKEN_STORAGE_KEY`   | `ls_auth_v1`                          | `ls_auth_v1`                              |

## Lệnh

```bash
npm install
npm run dev        # vite dev server (http://localhost:5173)
npm run build      # tsc -b && vite build
npm run preview    # preview prod build
```

Backend phải đang chạy ở `VITE_API_BASE_URL`. Mặc định dev là local `https://localhost:7299`.

## API layer

Tất cả service files nằm ở [src/api/](src/api/) — mỗi controller backend ứng với 1 file:

| Service          | Backend route                  | Public? |
| ---------------- | ------------------------------ | ------- |
| `authApi`        | `/api/v1/auth`                 | mixed   |
| `brandApi`       | `/api/v1/brands`               | mixed   |
| `categoryApi`    | `/api/v1/categories`           | mixed   |
| `productApi`     | `/api/v1/products`             | mixed   |
| `productSpecApi` | `/api/v1/productspecifications`| mixed   |
| `productImageApi`| `/api/v1/productimage`         | mixed   |
| `orderApi`       | `/api/v1/orders`               | auth    |
| `cartApi`        | `/api/v1/shoppingcart`         | auth    |
| `userApi`        | `/api/v1/users`                | admin   |
| `userAddressApi` | `/api/v1/useraddress`          | mixed   |
| `roleApi`        | `/api/v1/roles`                | admin   |
| `inventoryApi`   | `/api/v1/inventoryhistory`     | admin   |
| `fileApi`        | `/api/v1/file`                 | auth    |

Sử dụng:
```ts
import { productApi } from "@/api/product.api";

const { items } = await productApi.getAll({ pageSize: 12 });
```

Axios instance tự gắn `Authorization: Bearer ...` và tự refresh token khi gặp 401.

## Tài khoản seed (backend)

| Email                          | Mật khẩu  | Role     |
| ------------------------------ | --------- | -------- |
| `admin@elaptopshop.com`        | `Test@123`| Admin    |
| `customer@elaptopshop.com`     | `Test@123`| Customer |
