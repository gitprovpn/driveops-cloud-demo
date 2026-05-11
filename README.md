# DriveOps Cloud – Cloudflare Worker Gateway + D1 + KV Sales Demo

Bản này dùng để dựng demo bán hàng với giao diện web trước, có dữ liệu giả lập sẵn và các flow click cơ bản.

## Tài khoản demo

```text
test / test
student / test
teacher / test
academic / test
accounting / test
vehicle / test
```

## Kiến trúc

```text
GitHub Repository
   ↓
Cloudflare Worker Deploy
   ↓
Worker Gateway
   ├── Static Web UI trong /public
   ├── API /api/*
   ├── D1 Database: dữ liệu nghiệp vụ demo
   └── KV: session + recent activity
```

## Thành phần

```text
public/index.html
public/styles.css
public/app.js
worker/src/index.js
sql/schema.sql
sql/seed.sql
wrangler.toml
package.json
docs/cloudflare-web-setup.md
```

## Chạy local bằng Wrangler

```bash
npm install
npm run db:init
npm run db:seed
npm run dev
```

Sau đó mở URL local do Wrangler hiển thị.

## Deploy Cloudflare

### 1. Tạo D1

```bash
npm run cf:d1:create
```

Copy `database_id` vào `wrangler.toml`.

### 2. Tạo KV

```bash
npm run cf:kv:create
```

Copy KV namespace `id` vào `wrangler.toml`.

### 3. Khởi tạo database remote

```bash
npm run cf:db:init
npm run cf:db:seed
```

### 4. Deploy

```bash
npm run deploy
```

## Flow demo

1. Đăng nhập `test/test`.
2. Học viên tạo booking DAT.
3. Giáo vụ phân giáo viên / xe.
4. Giáo viên hoàn thành buổi DAT.
5. Kế toán tạo phiếu thu.
6. Quản lý xe tạo / duyệt bảo dưỡng.
7. Giám đốc xem dashboard + hỏi AI Assistant.

## GitHub + Cloudflare

Có thể push toàn bộ source lên GitHub, sau đó vào Cloudflare Dashboard → Workers & Pages → Create → Import repository → chọn repo → deploy.

Nếu dùng Git integration, nhớ thay `database_id` và `kv id` thật trong `wrangler.toml` trước khi deploy.
