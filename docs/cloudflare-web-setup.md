# Hướng dẫn setup bằng giao diện web Cloudflare

## 1. Upload source lên GitHub

1. Tạo repository mới, ví dụ `driveops-cloud-demo`.
2. Upload toàn bộ source trong ZIP này lên repo.
3. Commit lên nhánh `main`.

## 2. Tạo D1 Database trên Cloudflare

1. Vào Cloudflare Dashboard.
2. Vào **Workers & Pages** → **D1**.
3. Chọn **Create database**.
4. Đặt tên: `driveops_demo_db`.
5. Mở tab **Console**.
6. Copy nội dung `sql/schema.sql` và Execute.
7. Copy nội dung `sql/seed.sql` và Execute.

## 3. Tạo KV Namespace

1. Vào **Workers & Pages** → **KV**.
2. Chọn **Create namespace**.
3. Đặt tên: `DRIVEOPS_KV`.

## 4. Sửa wrangler.toml trên GitHub

Thay:

```toml
database_id = "REPLACE_WITH_D1_DATABASE_ID"
id = "REPLACE_WITH_KV_NAMESPACE_ID"
```

bằng ID thật trong Cloudflare.

## 5. Tạo Worker từ GitHub

1. Vào **Workers & Pages**.
2. Chọn **Create application**.
3. Chọn **Import a repository**.
4. Chọn repo GitHub đã upload.
5. Build command: `npm install`
6. Deploy command: `npx wrangler deploy`
7. Lưu và deploy.

## 6. Test demo

Mở URL `*.workers.dev`, đăng nhập:

```text
test / test
```

Demo các flow:

- Học viên tạo booking DAT.
- Giáo vụ phân giáo viên / xe.
- Giáo viên hoàn thành DAT.
- Kế toán tạo phiếu thu.
- Quản lý xe duyệt bảo dưỡng.
- Giám đốc hỏi AI Assistant.
