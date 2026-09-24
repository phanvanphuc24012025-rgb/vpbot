# VPBot trên Cloudflare (thuần Cloudflare — Workers + D1 + Pages)

Kiến trúc:
- **Backend**: Cloudflare Workers (Hono) + Cloudflare D1 (SQLite) — thay cho Express + MongoDB gốc.
- **Frontend**: HTML/CSS/JS tĩnh → Cloudflare Pages.
- Không phụ thuộc dịch vụ ngoài nào (không cần MongoDB Atlas). Gửi email OTP thật là tuỳ chọn (qua Resend).

## 0. Chuẩn bị
```bash
npm install -g wrangler
wrangler login
```

## 1. Tạo D1 database
```bash
cd backend   # thư mục chứa wrangler.toml
wrangler d1 create vpbot-db
```
Lệnh trên in ra `database_id` — dán vào `wrangler.toml` (chỗ `PASTE_YOUR_D1_DATABASE_ID_HERE`).

Khởi tạo bảng:
```bash
npm run db:init:remote
```

## 2. Set secret (bắt buộc: JWT_SECRET)
```bash
wrangler secret put JWT_SECRET
# nhập một chuỗi ngẫu nhiên dài, ví dụ: openssl rand -hex 32
```
Tuỳ chọn — gửi email OTP thật qua Resend (https://resend.com, có free tier):
```bash
wrangler secret put RESEND_API_KEY
```
Nếu không set, API vẫn chạy bình thường: khi `DEV_MODE = "true"` trong `wrangler.toml`, response trả kèm `devOtp` để bạn test không cần email thật. **Nhớ tắt `DEV_MODE` khi lên production thật** (đổi thành `"false"` trong `wrangler.toml`).

## 3. Deploy Worker (backend)
```bash
npm install
npm run deploy
```
Wrangler in ra URL dạng `https://vpbot-api.<subdomain>.workers.dev`. Copy URL này.

## 4. Trỏ frontend về Worker
Mở `frontend/js/api.js`, sửa dòng đầu:
```js
const API_BASE_URL = 'https://vpbot-api.<subdomain>.workers.dev/api';
```

## 5. Deploy frontend lên Cloudflare Pages
Cách nhanh nhất (dashboard):
- Cloudflare dashboard → Workers & Pages → Create → Pages → Upload assets → chọn thư mục `frontend/`.

Hoặc CLI:
```bash
npx wrangler pages deploy frontend
```

## 6. (Khuyến nghị) Giới hạn CORS
Trong `backend/src/index.js`, đổi `origin: '*'` thành domain Pages thật, ví dụ `'https://vpbot.pages.dev'`, rồi deploy lại (`npm run deploy`).

## 7. Tạo tài khoản admin đầu tiên
Chưa có cơ chế đăng ký admin từ frontend (đúng như thiết kế gốc). Sau khi đăng ký 1 tài khoản thường qua web, chạy:
```bash
wrangler d1 execute vpbot-db --remote \
  --command "UPDATE users SET role='admin' WHERE email='ban@example.com'"
```

## Lưu ý về những phần mới viết thêm (không có trong code gốc)
Backend gốc trong file zip bạn gửi **chỉ có 10 model Mongoose**, chưa có route/controller/server nào — nên toàn bộ logic API dưới đây là viết mới, dựa theo đúng contract mà `frontend/js/api.js` gọi:
- Auth: register → OTP (60s) → verify → login, JWT có `tokenVersion` để "đăng xuất mọi thiết bị", quên/đổi mật khẩu.
- Box & BoxLog: CRUD box, cấu hình anti-spam/auto-kick, log hoạt động, thống kê.
- Match: đúng công thức tính điểm gốc (`kill*2 + điểm top + damage/100`), bảng xếp hạng, lịch sử, import CSV, export CSV/JSON.
- Dashboard: tổng quan, lịch sử thanh toán, gia hạn gói.
- Payment & Voucher: tạo giao dịch, áp mã giảm giá, xác nhận thanh toán và tự động gia hạn `plan.expiresAt`.
  ⚠️ **Chưa nối cổng thanh toán MoMo/Banking thật** — `/payments/confirm` hiện xác nhận thủ công để demo. Khi có cổng thật, thay bằng xác minh webhook chữ ký.
- Blog, Contact: đọc công khai / gửi liên hệ.
- Admin: quản lý user, duyệt đơn hàng, doanh thu, voucher, blog, gửi thông báo.
- Mật khẩu hash bằng PBKDF2 (Web Crypto), không dùng bcrypt vì cần chạy thuần trên Workers.

## Test cục bộ không cần tài khoản Cloudflare
```bash
cd backend
node --no-warnings test/smoke.mjs
```
Script này dựng D1 giả bằng `node:sqlite` và chạy qua toàn bộ luồng chính (đăng ký, OTP, login, box, tính điểm, leaderboard, thanh toán, voucher, admin) — đã chạy pass 27/27 lúc build.
