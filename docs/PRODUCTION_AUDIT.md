# Kiểm toán production và các mục còn theo dõi

Cập nhật: 10/11/2026

Tài liệu này ghi nhận những điểm đã xác minh ở GitHub, CI và Supabase. Đây không phải giấy chứng nhận bảo mật; các luồng giao diện tương tác vẫn cần kiểm thử trình duyệt thủ công.

## Dependency

- Audit toàn bộ hiện ghi nhận 8 cảnh báo Moderate trong dependency phát triển.
- Audit riêng dependency production trả về 0 lỗ hổng từ mức Moderate trở lên.
- Nâng cấp tự động có thể đưa `eslint-config-next` về 15.5.29, trong khi dự án đang dùng Next.js 16.4.5. Không áp dụng cách hạ major này.
- Tiếp tục theo dõi bản vá compatible của ESLint/TypeScript ESLint. Không dùng `npm audit fix --force`.

## Supabase Auth

Project hiện thuộc tổ chức Free plan. Supabase cung cấp Leaked Password Protection trên Pro plan trở lên; mục này không thể được bật bằng thay đổi ứng dụng hoặc SQL. Không tự nâng gói hoặc phát sinh chi phí. Khi chủ dự án chủ động nâng gói, cần bật kiểm tra mật khẩu rò rỉ trong Auth settings và xác minh lại.

## Security Advisor: Admin owner directory

Advisor ghi nhận `public.admin_story_owner_directory()` là SECURITY DEFINER và có thể được gọi qua RPC bởi role `authenticated`.

Kiểm tra trực tiếp định nghĩa hiện tại:
- Hàm xác minh `auth.uid()` phải trùng tài khoản Admin đã cấu hình; người dùng khác bị từ chối.
- `search_path` được khóa về các schema cụ thể.
- Quyền execute đã bị thu hồi khỏi PUBLIC và anon, chỉ cấp cho authenticated để RPC của Admin sử dụng.
- Admin Review hiện gọi RPC này để hiển thị danh sách người viết.

Không thu hồi quyền authenticated hoặc chuyển sang SECURITY INVOKER một cách máy móc vì có thể làm hỏng chức năng quản trị. Cảnh báo Advisor cần được coi là mục hardening còn mở; hướng cải tiến phù hợp là chuyển truy vấn directory sang server-side endpoint kiểm tra danh tính Admin rồi mới truy vấn dữ liệu nhạy cảm.

## Migration drift — không tự động sửa production

Đối chiếu migration ledger của Supabase với thư mục `supabase/migrations` đã phát hiện khác biệt timestamp/phiên bản.

Các version hiện có trong production ledger nhưng không có filename trùng version trong Git:
- `20261108074707`
- `20261109155743`
- `20261109161101`
- `20261109161414`
- `20261109162523`
- `20261109163256`

Các filename trong Git nhưng không có version trùng trong production ledger:
- `20261107000000`
- `20261108141000`
- `20261109130600`
- `20261109193000`
- `20261109203000`
- `20261109204000`
- `20261109205000`

Một cặp migration `20261108012207` và `20261108012353` có nội dung giống hệt nhau và cả hai version đều xuất hiện trong ledger.

Các migration có tên gần giống nhau không mặc nhiên được coi là cùng nội dung. Ledger chỉ cho biết version/name, không cung cấp toàn bộ SQL đã chạy. Vì vậy không chạy `supabase db push`, reset, repair migration history hoặc tạo migration “đánh dấu đã chạy” cho đến khi lấy lại được bản SQL gốc/backup lịch sử và đối chiếu schema thực tế.

## Trạng thái xác minh

- Supabase project: ACTIVE_HEALTHY.
- Bucket ảnh `garden-photos`: private, giới hạn 10 MB, MIME ảnh.
- RLS đã bật cho các bảng nghiệp vụ đã kiểm tra; bảng rate-limit chặn truy cập trực tiếp từ anon/authenticated.
- Edge Function `garden-share` vẫn kiểm tra trạng thái xuất bản, PIN và giới hạn thử.
- Không có migration production hay dữ liệu người dùng nào bị sửa trong đợt audit này.

## Kiểm thử còn cần thực hiện

CI đã bổ sung smoke test HTTP cho các route và static asset sau production build. Smoke test không thay thế E2E thực tế cho đăng nhập, sáng tác, tải ảnh, gửi duyệt, xuất bản, PIN, guestbook và giao diện responsive trên trình duyệt.
