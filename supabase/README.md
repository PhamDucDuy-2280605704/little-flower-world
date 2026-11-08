# Little Story World · Supabase

Supabase lưu tài khoản, bản thảo, chương truyện, ảnh riêng tư, tiến độ đọc và trạng thái kiểm duyệt của Little Story World.

## Tạo tài khoản người viết

Tài khoản người viết hiện do Admin cấp, không mở đăng ký công khai.

1. Mở **Supabase Dashboard → Authentication → Users**.
2. Tạo tài khoản và gửi thông tin đăng nhập cho người viết qua kênh an toàn.
3. Không chia sẻ Service Role Key hoặc quyền Admin cho tài khoản khách.

Mỗi tài khoản có thể tạo nhiều tác phẩm riêng. Mỗi tác phẩm là một dòng trong `public.gardens`, các chương nằm ở `public.garden_chapters` và ảnh nằm trong bucket private `garden-photos`.

## Quy trình sáng tác và kiểm duyệt

| Trạng thái | Tài khoản người viết | Admin |
| --- | --- | --- |
| `draft` | Tạo, sửa, xem trước và lưu riêng tư | Xem, sửa, quản lý |
| `pending` | Nội dung tạm khóa; có thể rút yêu cầu duyệt | Xem xét và duyệt/từ chối |
| `approved` | Chỉ xem; không tự xuất bản | Có thể bật PIN và xuất bản |
| `rejected` | Chỉnh sửa và gửi duyệt lại | Có thể xem, chỉnh sửa hoặc xóa |

Tài khoản người viết có giới hạn tối đa **8 chương** và **5 ảnh mỗi tác phẩm** (tối đa 5 MB/ảnh). Admin không bị giới hạn số chương bởi trigger và có thể quản lý album rộng hơn, đặt/gỡ PIN, quản lý lưu bút, xuất bản hoặc gỡ xuất bản.

Các quyền quan trọng được kiểm tra ở database, không chỉ ẩn nút trên giao diện:
- Trigger ép mọi tác phẩm mới của người viết ở trạng thái riêng tư, không có share slug.
- Chỉ Admin được duyệt/từ chối, xuất bản, cấu hình PIN và kiểm duyệt lưu bút.
- Tác phẩm đang chờ duyệt không thể bị người viết sửa nội dung.
- Nếu nội dung của tác phẩm đã duyệt bị thay đổi bởi chủ sở hữu, hệ thống chuyển về bản nháp và gỡ liên kết công khai để phải duyệt lại.
- RLS giới hạn người viết vào tác phẩm của chính họ; chương/ảnh chỉ được thêm hoặc sửa khi tác phẩm là bản nháp hoặc đã bị từ chối.
- Quota chương và ảnh được áp dụng cả ở database/storage để không thể vượt giới hạn bằng cách gọi API trực tiếp.

## Migration đã triển khai

Các migration story-authoring được áp dụng cho project production theo thứ tự:

1. `20261108064414_guest_story_authoring_and_admin_approval.sql`
2. `20261108065344_tighten_creator_review_and_media_controls.sql`
3. `20261108065415_allow_rejected_story_resubmission.sql`
4. `20261108065433_guard_creator_story_cover_and_resubmission.sql`
5. `20261108070427_restrict_creator_photo_quota_trigger_function.sql`

Các migration trước đó vẫn nằm trong `supabase/migrations/`. Không sửa/xóa migration lịch sử đã áp dụng; hãy tạo migration mới cho thay đổi tiếp theo.

## Kiểm tra quyền sau khi thay đổi

Dùng một tài khoản người viết thử nghiệm và một tài khoản Admin riêng.

1. Người viết đăng nhập và tạo một tác phẩm; kiểm tra `approval_status = 'draft'`, `is_published = false`, `share_slug IS NULL`.
2. Người viết thêm chương và ảnh trong giới hạn; thử vượt 8 chương/5 ảnh để xác nhận database từ chối.
3. Người viết gửi duyệt; trạng thái chuyển sang `pending` và nội dung không thể sửa cho tới khi rút yêu cầu hoặc Admin xử lý.
4. Admin duyệt; thử bật PIN và xuất bản. Admin từ chối phải tự động gỡ publication và share slug.
5. Tài khoản người viết không thể đọc `garden_share_secrets` hoặc danh sách kiểm duyệt `garden_guestbook`, cũng không thể tự xuất bản.
6. Đăng nhập bằng tài khoản người viết khác và xác nhận không thể đọc/sửa tác phẩm của tài khoản đầu tiên.

Không dùng tài khoản thật để thử các thao tác xóa hoặc thay đổi trạng thái nếu chưa bọc trong transaction và rollback.

## Bảo mật

- Trình duyệt chỉ dùng Supabase Publishable Key.
- Không đưa Secret / Service Role Key vào mã nguồn, file `.env` được commit, hoặc biến `NEXT_PUBLIC_*`.
- Hàm trigger quota ảnh chỉ được PostgreSQL gọi qua trigger; quyền `EXECUTE` đã bị thu hồi khỏi `anon` và `authenticated`.
- Bật **Leaked Password Protection** trong Supabase Auth để cảnh báo và chặn mật khẩu đã bị lộ.
