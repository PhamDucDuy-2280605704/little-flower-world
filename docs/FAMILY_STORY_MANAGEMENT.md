# Quản lý tâm thư gia đình

## 1. Đường dẫn người đọc
- Link gửi ba mẹ: https://little-flower-world.vercel.app/g/nha-minh-noi-thoi-gian-89de265192084b8384817a7676b7a967
- Đây là link đọc công khai dạng unlisted: người có URL có thể xem; không cần tài khoản, đăng nhập hoặc PIN.
- Trang đọc gia đình là trang độc lập, không có link về trang chủ, đăng nhập hoặc sang khu vực khác.
- Không gửi đường dẫn Admin cho người nhận.

## 2. Khu vực Admin
- Admin portal: https://little-flower-world.vercel.app/little-story-backstage-7f4c
- Sau khi đăng nhập bằng tài khoản Admin được cấp quyền, vào trung tâm quản lý: https://little-flower-world.vercel.app/admin
- Admin dashboard dùng để xem các tác phẩm, duyệt và quản lý. Bàn viết ở /studio?mode=admin dùng để sửa nội dung theo luồng hiện có.
- Link đọc không cấp quyền chỉnh sửa. Thay đổi nội dung chỉ thực hiện qua tài khoản Admin.

## 3. Dữ liệu
- Supabase project: xhdldyqwiuyrdayjcsds
- Bảng gardens: bản ghi tác phẩm, chủ sở hữu, trạng thái xuất bản và share_slug.
- Bảng garden_chapters: tiêu đề và nội dung từng phần.
- Bản ghi tâm thư: 875de5d1-178b-4327-adb5-65f5ba6e3686
- share_slug: nha-minh-noi-thoi-gian-89de265192084b8384817a7676b7a967
- Ảnh của link gia đình nằm trong experience_settings của đúng bản ghi; không đặt ảnh gốc trong repository công khai.
- Edge Function garden-share đọc dữ liệu đã xuất bản và trả ảnh cho link chia sẻ. Bucket ảnh thông thường: garden-photos (private).

## 4. Mã nguồn cần biết
- Trang route chia sẻ: src/app/g/[slug]/page.tsx
- Luồng tải nội dung công khai: src/features/garden/components/SharedGardenExperience.tsx
- Giao diện tâm thư riêng: src/features/garden/components/FamilyLetterReader.tsx
- CSS tâm thư: src/features/garden/styles/FamilyLetterReader.module.css
- Trình đọc dạng sách cho các tác phẩm khác: src/features/garden/components/GardenJournal.tsx
- Ảnh/kiểm soát quyền chia sẻ: supabase/functions/garden-share/index.ts
- Chuyển ngôn ngữ bị ẩn trên route /g/: src/features/i18n/LanguageSwitch.tsx

## 5. Triển khai
- GitHub repository: https://github.com/PhamDucDuy-2280605704/little-story-world
- Production hosting: Vercel project little-story-world.
- Hai domain đang trỏ về cùng ứng dụng: little-story-world.vercel.app và little-flower-world.vercel.app.
- Push vào nhánh main sẽ kích hoạt production deployment.
- Không xóa bản ghi gardens hoặc đổi share_slug nếu vẫn muốn giữ link cũ.

## 6. Quy tắc thay đổi
- Sửa giao diện: chỉnh file component/CSS rồi kiểm tra production deployment.
- Sửa nội dung: chỉnh dữ liệu của đúng garden ID trong Admin; không tạo một bản ghi khác vì sẽ sinh link mới.
- Sửa ảnh: giữ đúng chiều ngang/dọc và không dùng object-fit: cover với ảnh kỷ niệm; dùng contain để không cắt người trong ảnh.
- Khi muốn ngừng chia sẻ, chuyển is_published=false hoặc gỡ published_at trong Admin. Link sẽ không còn mở được.
