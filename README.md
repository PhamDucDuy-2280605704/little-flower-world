# Little Flower World

Một món quà số nhỏ: mỗi tài khoản có khu vườn, câu chuyện và tiến độ đọc riêng.

## Công nghệ

- Next.js App Router, React và TypeScript
- CSS Modules và Tailwind CSS
- Motion cho chuyển động/hiệu ứng
- Supabase Auth, Postgres Row Level Security (RLS) và Storage

## Các trang chính

| Đường dẫn | Chức năng |
| --- | --- |
| `/` | Trang chủ và tủ hoa |
| `/login` | Đăng nhập tài khoản khách |
| `/gift` | Hộp quà, khu vườn và câu chuyện cá nhân |
| `/admin/login` | Cổng đăng nhập quản trị |
| `/admin` | Quản lý khu vườn và album ảnh |

## Chạy trên máy

1. Cài Node.js tương thích với phiên bản Next.js trong `package.json`.
2. Cài dependencies:

   ```bash
   npm ci
   ```

3. Tạo file môi trường cục bộ:

   ```bash
   cp .env.example .env.local
   ```

4. Điền hai biến Supabase trong `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
   ```

5. Khởi động:

   ```bash
   npm run dev
   ```

Mở [http://localhost:3000](http://localhost:3000).

## Kiểm tra chất lượng

Chạy trước khi đưa thay đổi lên nhánh chính:

```bash
npm run lint
npm run typecheck
npm run build
```

## Dữ liệu và quyền truy cập

- `gardens` lưu một khu vườn theo chủ sở hữu.
- `garden_items` lưu vị trí, loại và màu hoa.
- `garden_chapters` lưu nội dung từng chương.
- `story_progress` lưu tiến độ đọc của từng tài khoản.
- `garden-photos` là bucket private; ảnh được xem qua signed URL.
- RLS giới hạn người dùng ở dữ liệu của mình. Tài khoản quản trị được cấp quyền riêng trên database; giao diện admin không thay thế RLS.

Các migration được lưu trong [`supabase/migrations/`](supabase/migrations/). Hướng dẫn cấu trúc và dữ liệu nằm trong [`supabase/README.md`](supabase/README.md).

**Bảo mật:** chỉ dùng publishable key ở trình duyệt. Không đưa Supabase service-role key, secret key hoặc thông tin đăng nhập vào mã nguồn hay biến `NEXT_PUBLIC_*`.

## Triển khai

Repository được kết nối với Vercel. Push lên `main` sẽ kích hoạt quy trình production của dự án.
