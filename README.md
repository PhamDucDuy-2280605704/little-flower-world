# Little Story World

Không gian sáng tác riêng tư để mỗi người viết thông điệp, bức thư hoặc sách nhiều chương; Admin kiểm duyệt trước khi tác phẩm được chia sẻ.

Website: https://little-story-world.vercel.app/

## Các khu vực chính

| Đường dẫn | Chức năng |
| --- | --- |
| `/` | Giới thiệu và bắt đầu sáng tác |
| `/login` | Đăng nhập tài khoản người viết |
| `/studio` | Tạo, viết, lưu bản nháp và gửi tác phẩm cho Admin duyệt |
| `/guest` | Cổng dành cho người nhận lời mời |
| `/g/[slug]` | Đọc tác phẩm được chia sẻ |
| `/gift` | Mở các tác phẩm được gửi tặng |
| `/admin/login`, `/admin` | Đăng nhập và quản trị |
| `/studio?mode=admin` | Không gian Admin để duyệt và xuất bản |

## Hai cấp quyền sáng tác

**Tài khoản người viết** có thể tạo nhiều tác phẩm riêng, chọn thông điệp/thư/sách, thêm tối đa 8 chương và 5 ảnh cho mỗi tác phẩm, lưu bản nháp và gửi Admin kiểm duyệt. Tài khoản người viết không thể tự xuất bản, tạo link công khai, đặt PIN hay duyệt lưu bút. Trong lúc chờ duyệt, nội dung được khóa; người viết có thể rút yêu cầu để tiếp tục chỉnh sửa.

**Admin** xem được tất cả tác phẩm, duyệt hoặc từ chối, quyết định xuất bản/gỡ xuất bản, đặt PIN, quản lý lưu bút và quản lý ảnh. Tài khoản người viết hiện được cấp riêng bởi Admin; đăng ký công khai không mở.

Phân quyền được thực thi tại Supabase RLS, trigger và Storage, không chỉ dựa trên các nút bị ẩn trong giao diện.

## Công nghệ

- Next.js App Router, React và TypeScript
- CSS Modules và Tailwind CSS
- Motion cho chuyển động/hiệu ứng lật trang
- Supabase Auth, Postgres Row Level Security (RLS) và Storage
- Noto Sans và Noto Serif hỗ trợ tiếng Việt

## Chạy trên máy

1. Cài phiên bản Node.js tương thích với `package.json`.
2. Cài dependencies:

   ```bash
   npm ci
   ```

3. Tạo file môi trường cục bộ:

   ```bash
   cp .env.example .env.local
   ```

4. Điền Supabase URL và Publishable Key vào `.env.local`:

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

```bash
npm run lint
npm run typecheck
npm run build
```

## Dữ liệu và bảo mật

- `gardens` lưu bản thảo và trạng thái kiểm duyệt của từng tác phẩm.
- `garden_chapters` lưu nội dung từng chương.
- `story_progress` lưu tiến độ đọc theo tài khoản.
- `garden-photos` là bucket private; ảnh được xem qua signed URL.
- RLS giới hạn người viết ở tác phẩm của mình; các hành động xuất bản và kiểm duyệt dành cho Admin.
- Chỉ dùng Publishable Key ở trình duyệt. Không đưa Supabase Service Role Key, Secret Key hoặc thông tin đăng nhập vào mã nguồn hay biến `NEXT_PUBLIC_*`.

Các migration và hướng dẫn database nằm trong [`supabase/`](supabase/).

## Triển khai

Nhánh `main` được kết nối với Vercel. Push lên `main` sẽ kích hoạt quy trình kiểm tra và triển khai production.
