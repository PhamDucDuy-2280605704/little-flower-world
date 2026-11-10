# Hướng dẫn sử dụng Little Story World

Tài liệu này hướng dẫn các thao tác chính theo ba vai trò: người viết, Admin và người đọc.

Website: https://little-story-world.vercel.app/

## 1. Chọn đúng không gian

| Bạn là | Bắt đầu tại | Mục đích |
| --- | --- | --- |
| Người viết | /login và /account | Tạo, lưu, trang trí và gửi duyệt tác phẩm |
| Admin | Cổng Admin riêng và /admin | Quản lý, duyệt, phản hồi và xuất bản |
| Người đọc | /guest hoặc /g/[slug] | Mở tác phẩm được gửi tặng |
| Chủ tài khoản đã đăng nhập | /gift | Xem tác phẩm gắn với tài khoản |

Đường dẫn **/studio** là đường dẫn cũ và tự chuyển đến **/account**.

## 2. Dành cho người viết

### Bước 1 — Đăng nhập

1. Mở trang chủ.
2. Chọn **Đăng nhập để sáng tác** hoặc mở trang **/login**.
3. Đăng nhập bằng tài khoản do Admin cấp.

Hệ thống không bật đăng ký công khai. Nếu chưa có tài khoản, hãy liên hệ Admin.

### Bước 2 — Tạo tác phẩm

Mở **/account** và tạo tác phẩm mới. Có ba định dạng:

- **Thông điệp:** nội dung ngắn gọn trên một trang.
- **Bức thư:** lời mở đầu, các đoạn nội dung và chữ ký.
- **Cuốn sách:** chia câu chuyện thành nhiều chương.

Một tài khoản có thể tạo nhiều tác phẩm. Số chương trong một cuốn sách không bị giới hạn.

### Bước 3 — Trang trí và thêm ảnh

| Nhóm | Tùy chọn |
| --- | --- |
| Chủ đề | Khu vườn dịu dàng, Hoàng hôn, Ánh sao |
| Kiểu giấy | Ivory, Linen, Rose |
| Hiệu ứng đọc | Lật trang, Ánh sáng dịu, Lấp lánh, Không hiệu ứng bổ sung |
| Ảnh | Tối đa 5 ảnh cho mỗi tác phẩm, mỗi ảnh tối đa 5 MB |
| Sticker | Tối đa 4 sticker cho mỗi tác phẩm |

Hãy xem trước tác phẩm để kiểm tra nội dung, thứ tự chương, ảnh và cách trình bày.

### Bước 4 — Gửi Admin kiểm duyệt

Khi nội dung đã sẵn sàng, chọn gửi duyệt. Trong thời gian chờ kiểm duyệt, tác phẩm được khóa chỉnh sửa để tránh nội dung thay đổi giữa lúc Admin đang xem.

Các trạng thái chính:

| Trạng thái | Ý nghĩa | Người viết có thể làm gì? |
| --- | --- | --- |
| Bản nháp | Chưa gửi duyệt | Tiếp tục viết, lưu và xem trước |
| Chờ duyệt | Đã gửi Admin | Chờ phản hồi hoặc rút yêu cầu để quay lại bản nháp |
| Đã duyệt | Admin đã chấp thuận nội dung | Thiết lập PIN, lời nhắn người đọc và xuất bản khi sẵn sàng |
| Cần chỉnh sửa | Admin từ chối hoặc yêu cầu chỉnh sửa | Đọc nhận xét, sửa nội dung và gửi duyệt lại |

Khi Admin duyệt hoặc phản hồi, trạng thái được cập nhật để người viết nhận biết.

### Bước 5 — Xuất bản và chia sẻ

Sau khi được duyệt:

1. Mở tác phẩm trong **/account**.
2. Thiết lập PIN nếu muốn giới hạn người có thể đọc. PIN phải có ít nhất 6 ký tự.
3. Bật hoặc tắt sổ lưu bút tùy nhu cầu.
4. Chọn xuất bản.
5. Sao chép đường dẫn chia sẻ và gửi cho người nhận.

Chỉ tác phẩm đã được duyệt mới có thể xuất bản. Nếu mở chỉnh sửa một tác phẩm đã duyệt, hệ thống sẽ tắt liên kết công khai cũ và chuyển tác phẩm về bản nháp để kiểm duyệt lại.

## 3. Dành cho Admin

### Đăng nhập an toàn

Admin sử dụng cổng truy cập riêng có khóa ở phía máy chủ, sau đó đăng nhập bằng tài khoản Admin được cấp quyền.

- Không chia sẻ URL có access key trong README, nhóm chat công khai hoặc ảnh chụp màn hình.
- Không gửi thông tin đăng nhập Admin cho người viết.
- Trang **/admin** vẫn xác thực tài khoản Admin; biết đường dẫn không đủ để có quyền quản trị.

### Các khu vực quản trị

| Khu vực | Chức năng |
| --- | --- |
| **/admin** | Trung tâm quản lý tác phẩm và người viết |
| **/admin/review** | Hàng chờ duyệt, xem trước toàn bộ tác phẩm, phê duyệt hoặc từ chối kèm nhận xét |
| **/admin/studio** | Không gian sáng tác, quản lý nội dung, chương và media với quyền Admin |

### Quy trình duyệt

1. Mở hàng chờ kiểm duyệt.
2. Chọn tác phẩm đang chờ.
3. Đọc toàn bộ nội dung và xem trước như người nhận.
4. Chọn duyệt hoặc từ chối; khi cần, ghi rõ nội dung người viết cần chỉnh sửa.
5. Theo dõi trạng thái cập nhật và hỗ trợ người viết khi cần.

Admin có thể quản lý PIN, trạng thái xuất bản, ảnh, sticker và lời nhắn người đọc theo quyền được cấp. Hãy xác định đúng tác phẩm trước khi thay đổi dữ liệu.

## 4. Dành cho người đọc

### Mở lời mời

1. Mở đường dẫn được người viết gửi.
2. Nếu đang ở cổng **/guest**, nhập thông tin lời mời theo hướng dẫn trên màn hình.
3. Nếu tác phẩm có PIN, nhập PIN được người gửi cung cấp.
4. Đọc nội dung, chuyển chương và mở ảnh kỷ niệm.

Trang **/g/[slug]** chỉ phục vụ tác phẩm đã được xuất bản. Tác phẩm đang là bản nháp, chờ duyệt hoặc chưa xuất bản sẽ không thể đọc bằng đường dẫn chia sẻ.

### Gửi lời nhắn

Nếu chủ tác phẩm bật sổ lưu bút, người đọc có thể để lại lời nhắn. Lời nhắn có thể cần người viết hoặc Admin duyệt trước khi hiển thị công khai.

## 5. Nhạc nền, ngôn ngữ và hiệu ứng

### Chuyển ngôn ngữ

Dùng công tắc **VI / EN** trên giao diện. Lựa chọn được lưu trong trình duyệt hiện tại. Nội dung do người viết tạo ra được giữ nguyên ngôn ngữ gốc, không tự dịch.

### Điều khiển nhạc nền

Bảng điều khiển nhạc nền cho phép:

- Bật hoặc tắt nhạc.
- Chọn một trong bốn bản: Nắng vui mỗi ngày, Piano dịu dàng, Hộp nhạc mơ màng hoặc Đêm yên bình.
- Điều chỉnh âm lượng.
- Ghi nhớ lựa chọn trên trình duyệt.

Một số trình duyệt chỉ cho phép phát âm thanh sau thao tác đầu tiên của người dùng. Khi chưa nghe thấy nhạc, hãy thử nhấn nút bật nhạc hoặc tương tác với trang một lần.

### Hiệu ứng trong tác phẩm

Các hiệu ứng lật trang, ánh sáng dịu và lấp lánh có thể được chọn trong phần trang trí. Có thể chọn không dùng hiệu ứng bổ sung để ưu tiên trải nghiệm đọc tĩnh.

## 6. Xử lý sự cố thường gặp

| Tình huống | Cách xử lý |
| --- | --- |
| Không đăng nhập được | Kiểm tra đúng email/mật khẩu và liên hệ Admin để xác nhận tài khoản đã được cấp |
| Không thấy tác phẩm trong /gift | Kiểm tra tài khoản hiện tại; nếu tài khoản chưa được gắn tác phẩm, liên hệ Admin |
| Không thể chỉnh sửa tác phẩm | Nếu đang chờ duyệt, hãy chờ phản hồi hoặc rút yêu cầu; tác phẩm đã duyệt cần mở chỉnh sửa theo luồng trên màn hình |
| Không thể chia sẻ | Kiểm tra tác phẩm đã được Admin duyệt và đã bật xuất bản hay chưa |
| Người đọc bị hỏi PIN | Người gửi cần cung cấp PIN; không thử đoán PIN |
| Ảnh không tải được | Người viết/Admin kiểm tra album trong Studio; ảnh riêng tư cần URL truy cập do hệ thống cấp |
| Nhạc không phát | Tương tác với trang trước, kiểm tra âm lượng và trạng thái bật nhạc |
| Trang Admin từ chối truy cập | Kiểm tra đã vào đúng cổng riêng và đăng nhập đúng tài khoản Admin |

## 7. Bảo vệ tài khoản và tác phẩm

- Không chia sẻ mật khẩu, PIN hoặc đường dẫn Admin riêng.
- Không gửi Service Role Key, mật khẩu database hoặc access key cho người đọc.
- Không đăng ảnh riêng tư lên GitHub để thay cho album ảnh của tác phẩm.
- Khi muốn ngừng chia sẻ một câu chuyện, hãy dùng chức năng gỡ xuất bản thay vì xóa dữ liệu nếu vẫn cần giữ bản thảo.

Tài liệu kỹ thuật và vị trí mã nguồn: [CODE_STRUCTURE.md](./CODE_STRUCTURE.md).
