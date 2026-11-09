# Quản lý tâm thư gia đình

## 1. Link người đọc
- Link gửi ba mẹ: https://little-flower-world.vercel.app/g/nha-minh-noi-thoi-gian-89de265192084b8384817a7676b7a967
- Đây là link đọc công khai dạng unlisted: người có URL có thể xem; không cần tài khoản, đăng nhập hoặc PIN.
- Bản ghi hiện đã xuất bản (is_published=true) và chưa cấu hình PIN.
- Trang dùng chế độ đọc độc lập (readOnlyStandalone=true): không có trang chủ, menu, mục lục hay liên kết sang khu vực khác. Công tắc ngôn ngữ toàn cục cũng tự ẩn trên mọi route /g/.
- Link đọc không cấp quyền chỉnh sửa. Không gửi đường dẫn Admin cho người nhận.

## 2. Quản lý nội dung và ảnh
1. Mở cổng Admin: https://little-flower-world.vercel.app/little-story-backstage-7f4c
2. Sau khi đăng nhập bằng tài khoản Admin được cấp quyền, vào trung tâm quản lý: https://little-flower-world.vercel.app/admin
3. Mở không gian sáng tác Admin: https://little-flower-world.vercel.app/studio?mode=admin
4. Chọn đúng tác phẩm “Nhà mình – nơi thời gian dịu dàng ở lại”.
5. Nội dung nằm ở phần viết chương và tâm thư cuối; ảnh nằm tại bước 03 · Hình ảnh do bạn chọn trong BookStudio.

Lưu ý:
- Không tạo tác phẩm mới để thay thế; như vậy sẽ sinh share_slug mới và làm mất link cũ.
- Không xóa bản ghi tác phẩm hoặc đổi share_slug.
- Khi cập nhật ảnh, tải ảnh gốc độ phân giải cao (JPG, PNG, WEBP hoặc AVIF) vào album của đúng tác phẩm. Ảnh được lưu trong bucket riêng garden-photos; không đưa ảnh gia đình vào repository GitHub công khai.
- Ảnh kỷ niệm phải giữ tỷ lệ gốc; không dùng object-fit: cover hoặc ép chung một khung ngang.

## 3. Tình trạng ảnh đã kiểm tra
- Bản ghi tác phẩm: 875de5d1-178b-4327-adb5-65f5ba6e3686.
- experience_settings.inlinePhotoParts có 2 vị trí nhưng chỉ vị trí đầu có dữ liệu; vị trí thứ hai rỗng.
- Dữ liệu WebP đầu tiên khai báo kích thước file khoảng 115 KB trong RIFF header, nhưng payload hiện chỉ có 15 KB (20.000 ký tự Base64), tức file bị cắt cụt.
- Bucket garden-photos hiện chưa có file ảnh nào trong thư mục của tác phẩm.
- Vì không còn đủ byte dữ liệu và không có bản gốc trong Storage, không thể khôi phục chi tiết ảnh bằng CSS. Cần tải lại ảnh gốc qua bước 03 trong Admin Studio. Trình đọc mới sẽ thay ảnh không tải được bằng thông báo nhẹ nhàng, không để biểu tượng ảnh vỡ.

## 4. Mã nguồn — sửa đúng file
Repository: https://github.com/PhamDucDuy-2280605704/little-story-world

| Phần | File | Trách nhiệm |
| --- | --- | --- |
| Route chia sẻ | [page.tsx](https://github.com/PhamDucDuy-2280605704/little-story-world/blob/main/src/app/g/%5Bslug%5D/page.tsx) | Nhận slug từ URL và mở trình đọc |
| Tải dữ liệu | [SharedGardenExperience.tsx](https://github.com/PhamDucDuy-2280605704/little-story-world/blob/main/src/features/garden/components/SharedGardenExperience.tsx) | Gọi Edge Function, xử lý trạng thái tải/PIN/lỗi và chọn chế độ đọc |
| Giao diện tâm thư | [FamilyLetterReader.tsx](https://github.com/PhamDucDuy-2280605704/little-story-world/blob/main/src/features/garden/components/FamilyLetterReader.tsx) | Bố cục tâm thư, chương, ảnh và trạng thái ảnh lỗi |
| CSS tâm thư | [FamilyLetterReader.module.css](https://github.com/PhamDucDuy-2280605704/little-story-world/blob/main/src/features/garden/styles/FamilyLetterReader.module.css) | Kiểu chữ, khoảng cách, thẻ ký ức, responsive |
| Phóng to ảnh | [PhotoLightbox.tsx](https://github.com/PhamDucDuy-2280605704/little-story-world/blob/main/src/features/garden/components/PhotoLightbox.tsx) | Xem ảnh lớn, điều hướng ảnh, đóng bằng Esc |
| API chia sẻ | [garden-share/index.ts](https://github.com/PhamDucDuy-2280605704/little-story-world/blob/main/supabase/functions/garden-share/index.ts) | Kiểm tra xuất bản/PIN, lấy chương và ký URL ảnh riêng tư |
| Studio nội dung | [BookStudio.tsx](https://github.com/PhamDucDuy-2280605704/little-story-world/blob/main/src/features/studio/components/BookStudio.tsx) | Admin chỉnh chữ, thêm chương và tải ảnh |
| Tài liệu quản lý | [FAMILY_STORY_MANAGEMENT.md](https://github.com/PhamDucDuy-2280605704/little-story-world/blob/main/docs/FAMILY_STORY_MANAGEMENT.md) | Bản đồ quản lý riêng cho tâm thư này |

## 5. Sơ đồ dữ liệu và luồng chạy
- Supabase project: xhdldyqwiuyrdayjcsds.
- gardens: tiêu đề, lời mở đầu, tâm thư cuối, trạng thái xuất bản, share_slug và cài đặt trình đọc.
- garden_chapters: tiêu đề và nội dung từng chương.
- garden_share_secrets: cấu hình PIN; hiện không có PIN cho tác phẩm này.
- garden-photos: bucket private chứa ảnh gốc. Edge Function tạo signed URL có thời hạn để trình đọc tải ảnh.
- Luồng đọc: trình duyệt mở /g/[slug] → SharedGardenExperience gọi garden-share → Edge Function xác minh tác phẩm đã xuất bản → trả nội dung và signed URL → FamilyLetterReader hiển thị tâm thư.

## 6. Phân biệt nơi quản lý
- GitHub: quản lý mã nguồn và lịch sử thay đổi. Chỉnh giao diện/code ở đây.
- Vercel: quản lý hosting và các lần triển khai. Nhánh main được kết nối production.
- Supabase: quản lý nội dung, chương truyện, quyền chia sẻ và ảnh riêng tư.
- Admin Studio: nơi anh thao tác nội dung và tải ảnh; không cần sửa code cho các thay đổi nội dung thông thường.

## 7. Triển khai an toàn
- GitHub repository: https://github.com/PhamDucDuy-2280605704/little-story-world
- Vercel project: https://vercel.com/phamducduy/little-story-world
- Hai domain little-story-world.vercel.app và little-flower-world.vercel.app cùng trỏ về ứng dụng.
- Push vào main kích hoạt production deployment. Nên làm trên branch riêng, kiểm tra preview trước, chỉ merge vào main khi đã duyệt.
- Không thay đổi RLS, bucket policy, PIN hoặc share_slug khi chỉ sửa giao diện.
- Khi muốn ngừng chia sẻ, dùng chức năng xuất bản trong Admin; không xóa bản ghi nếu còn cần giữ lịch sử.
