# Deploy fe-LaptopShop lên IIS

## 1. Build local

```powershell
cd d:\project-building-CV\laptop_shop\fe-LaptopShop\app
npm install            # chỉ chạy lần đầu hoặc khi đổi package.json
npm run build
```

Vite output sẽ ở thư mục **`dist/`** — bao gồm:
- `index.html`
- `assets/` (JS + CSS đã hash + minified)
- `web.config` (copy từ `public/`)
- favicon, các static khác

> Build sẽ tự dùng `.env.production` → API trỏ tới `https://be-shopminhnhat.win-tech.vn`.
> Nếu muốn build với env khác: tạo `.env.production.local` rồi `npm run build`.

## 2. Tạo IIS site mới

Trên server, mở **PowerShell as Admin**, đặt subdomain ví dụ `shop-minhnhat.win-tech.vn`:

```powershell
Import-Module WebAdministration

# 2.1. Tạo thư mục site
$siteRoot = "D:\IIS WEB\shop-minhnhat.win-tech.vn"
New-Item -ItemType Directory -Force -Path $siteRoot | Out-Null

# 2.2. Tạo App Pool — QUAN TRỌNG: No Managed Code (static SPA)
New-WebAppPool -Name "shop-minhnhat" -Force
Set-ItemProperty IIS:\AppPools\shop-minhnhat -Name managedRuntimeVersion -Value ""

# 2.3. Tạo site
New-Website -Name "shop-minhnhat" `
            -PhysicalPath $siteRoot `
            -ApplicationPool "shop-minhnhat" `
            -Port 80 `
            -HostHeader "shop-minhnhat.win-tech.vn" `
            -Force

# 2.4. Cấp quyền đọc cho app pool
icacls $siteRoot /grant "IIS AppPool\shop-minhnhat:(OI)(CI)(RX)" /T
```

## 3. Copy build output lên server

**Option A — qua WinSCP / RDP:** copy toàn bộ nội dung `dist/*` (KHÔNG copy thư mục `dist` mà copy bên trong) vào `D:\IIS WEB\shop-minhnhat.win-tech.vn\`.

**Option B — qua PowerShell từ máy local (nếu có WinRM):**
```powershell
$session = New-PSSession -ComputerName <server-ip> -Credential Administrator
Copy-Item -Recurse -Path .\dist\* `
    -Destination "D:\IIS WEB\shop-minhnhat.win-tech.vn\" `
    -ToSession $session -Force
```

## 4. Verify

```powershell
# Trên server
Invoke-WebRequest -Uri "http://127.0.0.1/" -Headers @{"Host"="shop-minhnhat.win-tech.vn"} -UseBasicParsing |
  Select-Object StatusCode, @{n="Length";e={$_.Content.Length}}
```

Phải ra `200 OK` + content length > 0. Mở browser tới `http://shop-minhnhat.win-tech.vn` để xem trang index.

## 5. Cloudflare / DNS

Nhờ leader thêm DNS record cho subdomain mới qua Cloudflare (giống cách đã làm với `be-shopminhnhat.win-tech.vn`):

```
Type:  A
Name:  shop-minhnhat
Value: 125.212.205.139
Proxy: ON (cam vàng)
```

## 6. Update deploy script — re-deploy nhanh sau này

Tạo `scripts/deploy-fe.ps1`:

```powershell
# Chạy trên máy dev
$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

npm run build

# Copy lên server (cần WinSCP CLI hoặc robocopy share)
# Ví dụ dùng SCP via OpenSSH:
scp -r .\dist\* Administrator@<server>:/D:/IIS WEB/shop-minhnhat.win-tech.vn/
```

## ⚠️ Lưu ý quan trọng

1. **App Pool phải là "No Managed Code"** — vì SPA tĩnh không cần .NET runtime, để ASP.NET sẽ sinh lỗi 500.
2. **URL Rewrite Module** phải đã cài trên IIS. Nếu chưa: tải tại https://www.iis.net/downloads/microsoft/url-rewrite — không có module này sẽ bị lỗi 500.19.
3. **BOM trong web.config** — nếu sau khi copy gặp 500.19, kiểm tra file phải UTF-8 **không BOM**. Vite output không có BOM nên thường an toàn, nhưng nếu edit bằng Notepad sẽ thêm BOM.
4. **Mọi route React Router** (vd `/admin`, `/products/abc`) đều phải trả về `index.html` — rule rewrite đã xử lý. Nếu vào URL sâu mà bị 404, nghĩa là URL Rewrite Module chưa cài hoặc rule lỗi.
5. **Cache HTML = 0**, **cache assets/* = 1 năm** — Vite hash filename nên không sợ stale cache.

## 7. SSL (sau khi DNS đã propagate)

Như đã làm với BE — dùng win-acme hoặc thủ công Let's Encrypt:
```powershell
# Tải win-acme từ https://www.win-acme.com/
.\wacs.exe --target iis --host shop-minhnhat.win-tech.vn --installation iis --emailaddress you@example.com --accepttos
```

Cloudflare proxy đã có flexible SSL nên user-facing HTTPS đã hoạt động ngay cả khi chưa có cert thật.
