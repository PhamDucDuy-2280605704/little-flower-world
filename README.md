# Little Story World

Không gian sáng tác riêng tư để biến lời nhắn, bức thư và những câu chuyện nhiều chương thành trải nghiệm đọc như một cuốn sách.

Website: https://little-story-world.vercel.app/

## Trải nghiệm chính

| Đường dẫn | Chức năng |
| --- | --- |
| `/` | Giới thiệu Little Story World và ba định dạng sáng tác |
| `/studio` | Soạn thông điệp, bức thư hoặc sách nhiều chương |
| `/guest` | Cổng dành cho người nhận lời mời |
| `/g/[slug]` | Mở và đọc tác phẩm được chia sẻ |
| `/gift` | Đọc tác phẩm được gửi tặng |
| `/login` | Đăng nhập tài khoản |
| `/admin/login`, `/admin` | Đăng nhập và quản trị |

## Công nghệ

- Next.js App Router, React và TypeScript
- CSS Modules và Tailwind CSS
- Motion cho chuyển động và hiệu ứng lật trang
- Supabase Auth, Postgres Row Level Security (RLS) và Storage
- Noto Sans và Noto Serif hỗ trợ tiếng Việt

## Chạy trên máy

1. Cài phiên bản Node.js tương thích với `package.json`.
2. Cài dependencies:

   ```bash
   npm ci
   ```

3. Sao chép file môi trường:

   ```bash
   cp .env.example .env.local
   ```

4. Điền Supabase URL và Publishable Key vào `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
   ```

5. Khởi động môi trường phát triển:

   ```bash
   npm run dev
   ```

Mở [http://localhost:3000](http://localhost:3000).

## Kiểm tra chất lượng

Chạy các lệnh sau trước khi đưa thay đổi lên nhánh chính:

```bash
npm run lint
npm run typecheck
npm run build
```

## Dữ liệu và quyền truy cập

- Nội dung tác phẩm và các chương được lưu trong Supabase.
- Ảnh riêng tư nằm trong bucket Storage private và được truy cập bằng signed URL.
- Tiến độ đọc được lưu theo tài khoản.
- RLS giới hạn quyền truy cập ở cấp database; giao diện website không thay thế các chính sách này.
- Chỉ dùng Publishable Key ở trình duyệt. Không đưa Service Role Key, Secret Key hay thông tin đăng nhập vào mã nguồn hoặc biến `NEXT_PUBLIC_*`.

Các migration và hướng dẫn database nằm trong thư mục [`supabase/`](supabase/).

## Triển khai

Nhánh `main` được kết nối với Vercel. Push commit lên nhánh chính sẽ kích hoạt quy trình kiểm tra và triển khai production.
