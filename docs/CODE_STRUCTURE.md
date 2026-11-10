# Sơ đồ cấu trúc code — Little Story World

Little Story World dùng **Next.js App Router + React + TypeScript**. Các route nằm trong **src/app**, còn logic theo chức năng được tách trong **src/features**. Supabase đảm nhiệm xác thực, dữ liệu, quyền truy cập và Storage riêng tư.

## 1. Cây thư mục chính

~~~text
little-story-world/
├─ .github/
│  └─ workflows/
│     └─ verify.yml                 # CI: audit dependency, lint, typecheck, build
├─ docs/
│  ├─ assets/
│  │  └─ little-story-world-banner.svg
│  ├─ CODE_STRUCTURE.md             # Sơ đồ code và luồng dữ liệu
│  └─ HUONG_DAN_SU_DUNG.md          # Hướng dẫn theo vai trò
├─ public/                          # Tài nguyên tĩnh
├─ src/
│  ├─ app/                          # Route của Next.js App Router
│  │  ├─ account/                   # Không gian sáng tác người viết
│  │  ├─ admin/                     # Trung tâm Admin, review, studio
│  │  ├─ g/[slug]/                  # Trang đọc tác phẩm chia sẻ
│  │  ├─ gift/                      # Tác phẩm gắn với tài khoản
│  │  ├─ guest/                     # Cổng người đọc
│  │  ├─ login/                     # Đăng nhập người viết
│  │  ├─ private-admin/[accessKey]/ # Cổng Admin có khóa truy cập
│  │  ├─ studio/                    # Route cũ, redirect về /account
│  │  ├─ page.tsx                   # Trang chủ
│  │  ├─ layout.tsx                 # Font, i18n, ambience, layout gốc
│  │  └─ globals.css                # CSS toàn cục
│  ├─ features/
│  │  ├─ admin/                     # Dashboard quản trị và kiểm duyệt
│  │  ├─ ambience/                  # Ánh sáng trang trí và nhạc nền
│  │  ├─ auth/                      # Đăng nhập, phiên người dùng
│  │  ├─ flowers/                   # Bộ component hoa minh họa có thể tái sử dụng
│  │  ├─ garden/                    # Cổng đọc, truyện chia sẻ, guestbook
│  │  ├─ gifts/                     # Trải nghiệm xem tác phẩm đã lưu
│  │  ├─ i18n/                      # Tiếng Việt / English
│  │  ├─ stories/                   # Component và dữ liệu dùng chung của truyện
│  │  └─ studio/                    # Trình soạn thảo và quản lý tác phẩm
│  ├─ lib/
│  │  ├─ supabase.ts                # Supabase client phía người dùng
│  │  └─ adminSupabase.ts           # Supabase client cho luồng Admin
│  └─ types/                        # Kiểu dữ liệu garden, story, flower
├─ supabase/
│  ├─ functions/garden-share/       # Edge Function phục vụ tác phẩm chia sẻ
│  ├─ migrations/                   # Lịch sử thay đổi schema và chính sách
│  └─ README.md                     # Hướng dẫn cấu hình và vận hành Supabase
├─ .env.example                     # Mẫu biến môi trường
├─ package.json                     # Scripts và dependency
└─ README.md                        # Tổng quan dự án
~~~

## 2. Bản đồ route

| Route | File / khu vực | Trách nhiệm |
| --- | --- | --- |
| **/** | src/app/page.tsx | Trang giới thiệu, dẫn người viết và người đọc |
| **/login** | src/app/login/page.tsx | Đăng nhập tài khoản người viết |
| **/account** | src/app/account/page.tsx | Mount BookStudio cho người viết |
| **/studio** | src/app/studio/page.tsx | Redirect về /account |
| **/guest** | src/app/guest/page.tsx | Cổng nhận lời mời |
| **/g/[slug]** | src/app/g/[slug]/page.tsx | Mount SharedGardenExperience |
| **/gift** | src/app/gift/page.tsx | Mount GiftExperience |
| **/admin** | src/app/admin/page.tsx | Mount AdminDashboard |
| **/admin/review** | src/app/admin/review/page.tsx | Mount AdminReviewDashboard |
| **/admin/studio** | src/app/admin/studio/page.tsx | Mount BookStudio ở chế độ Admin |
| **/private-admin/[accessKey]** | src/app/private-admin/[accessKey]/page.tsx | Kiểm tra access key phía máy chủ rồi mới hiển thị form Admin |

Các trang quản trị cần phiên Admin hợp lệ. Không ghi giá trị access key thực tế vào tài liệu hoặc commit.

## 3. Các feature chính

### admin

- **AdminDashboard.tsx:** xem danh sách tác phẩm, quản lý và xem trước nội dung.
- **AdminReviewDashboard.tsx:** hàng chờ duyệt, phản hồi và trạng thái kiểm duyệt.
- Các CSS Module trong thư mục styles quản lý giao diện Admin.

### auth

- **HomeAuthActions.tsx:** trạng thái đăng nhập và các hành động trên trang chủ.
- **LoginForm.tsx / LoginPageContent.tsx:** biểu mẫu và nội dung đăng nhập.
- Tài khoản người viết được cấp bởi Admin; không có đăng ký công khai.

### studio

- **BookStudio.tsx:** trình soạn thảo chính dùng cho người viết và Admin.
- Quản lý định dạng thông điệp / thư / sách, chương, ảnh, sticker, chủ đề, kiểu giấy, PIN, guestbook và trạng thái xuất bản.
- Cùng một component được tái sử dụng cho **/account** và **/admin/studio**; quyền thao tác được xác định theo phiên người dùng và chế độ workspace.

### garden

- **GuestPortal.tsx:** nhận thông tin đường dẫn chia sẻ của người đọc.
- **SharedGardenExperience.tsx:** tải và điều phối trải nghiệm đọc.
- **FamilyLetterReader.tsx** và các component liên quan: trình bày nội dung, chương và ảnh.
- **PhotoLightbox.tsx:** xem ảnh ở kích thước lớn.
- **garden-share** ở Supabase xác minh trạng thái xuất bản/PIN và cung cấp nội dung đọc cần thiết.

### gifts

- **GiftExperience.tsx:** tải các tác phẩm gắn với tài khoản đang đăng nhập.

### i18n

- **LanguageProvider.tsx:** cung cấp trạng thái ngôn ngữ và hàm dịch cho component.
- **LanguageSwitch.tsx:** công tắc VI / EN.
- Lựa chọn ngôn ngữ được lưu trong localStorage của trình duyệt.

### ambience

- **SiteAmbience.tsx:** tạo nhạc nền bằng Web Audio API, điều khiển track và âm lượng.
- **SiteAmbience.module.css:** ánh sáng nền, dock điều khiển và hiệu ứng không khí.
- Bốn track hiện có: sunny, piano, musicbox, moonlight.
- Lựa chọn bật nhạc, bản nhạc và âm lượng được lưu trên trình duyệt.

### flowers

- Chứa component minh họa 8 loài hoa: cúc, tulip, hướng dương, hoa hồng, oải hương, anh đào, hoa sen và bồ công anh.
- **FlowerShowcase.tsx:** chọn loài hoa, màu sắc và kích cỡ.
- Đây hiện là module component có thể tái sử dụng; chưa có route riêng trong src/app, vì vậy không nên giới thiệu như một trang URL đang hoạt động.

### stories và types

- **stories/** chứa component và dữ liệu dùng chung cho nội dung truyện.
- **src/types/** định nghĩa kiểu dữ liệu cho garden, story và flower để các feature dùng chung.

## 4. Luồng dữ liệu chính

~~~mermaid
flowchart TD
    W["Người viết"] --> AUTH["Supabase Auth"]
    AUTH --> STUDIO["BookStudio"]
    STUDIO --> GARDENS[("gardens")]
    STUDIO --> CHAPTERS[("garden_chapters")]
    STUDIO --> MEDIA[("garden-photos")]
    STUDIO --> REVIEW["approval_status = pending"]
    REVIEW --> ADMIN["AdminReviewDashboard"]
    ADMIN -->|"Duyệt / phản hồi"| STATUS["approved / rejected"]
    STATUS --> STUDIO
    STUDIO -->|"Xuất bản sau khi duyệt"| SHARE["share_slug + is_published"]
    READER["Người đọc"] --> PAGE["/g/[slug]"]
    PAGE --> EDGE["garden-share Edge Function"]
    EDGE --> SHARE
    EDGE --> MEDIA
    EDGE --> READER
~~~

## 5. Dữ liệu và bảo mật

| Thành phần | Vai trò |
| --- | --- |
| **gardens** | Tác phẩm, chủ sở hữu, trạng thái duyệt/xuất bản và cài đặt trình đọc |
| **garden_chapters** | Nội dung từng chương |
| **story_progress** | Tiến độ đọc gắn với tài khoản |
| **garden_guestbook** | Lời nhắn của người đọc và trạng thái kiểm duyệt |
| **garden_share_secrets** | Dữ liệu bí mật phục vụ PIN chia sẻ |
| **garden-photos** | Bucket Storage riêng tư cho ảnh của tác phẩm |
| **garden-share** | Edge Function xác thực quyền đọc và cấp dữ liệu/URL ảnh cần thiết |

Các quyền quan trọng được bảo vệ ở Supabase bằng RLS, database triggers, Storage policies và Edge Function. Không chỉ dựa vào việc ẩn nút trên giao diện.

## 6. Hiệu ứng và giao diện

- **src/app/layout.tsx:** nạp Noto Sans, Noto Serif, Geist Mono; bọc LanguageProvider và SiteAmbience.
- **src/app/globals.css:** các quy tắc giao diện dùng chung.
- CSS Module của từng feature giữ style gần component, tránh dồn toàn bộ style vào một file.
- Hiệu ứng đọc của tác phẩm được lưu trong experience settings cùng chủ đề, giấy và sticker.
- **docs/assets/little-story-world-banner.svg:** banner README tự thiết kế với gradient, sách mở, đốm sáng và cánh hoa chuyển động nhẹ.

## 7. Sửa phần nào thì tìm ở đâu?

| Muốn thay đổi | Bắt đầu kiểm tra |
| --- | --- |
| Nội dung trang chủ | src/app/page.tsx và src/app/page.module.css |
| Đăng nhập người viết | src/features/auth/ |
| Trình soạn thảo | src/features/studio/components/BookStudio.tsx |
| Trung tâm Admin | src/features/admin/components/AdminDashboard.tsx |
| Hàng chờ kiểm duyệt | src/features/admin/components/AdminReviewDashboard.tsx |
| Cổng và trang đọc | src/features/garden/ |
| Tác phẩm đã lưu | src/features/gifts/ |
| Ngôn ngữ | src/features/i18n/ |
| Nhạc nền / ánh sáng | src/features/ambience/ |
| Minh họa hoa | src/features/flowers/ |
| Kết nối Supabase | src/lib/ |
| Bảng dữ liệu và quyền truy cập | supabase/migrations/ |
| API chia sẻ truyện | supabase/functions/garden-share/index.ts |
| CI | .github/workflows/verify.yml |

## 8. Thiết lập môi trường phát triển

Dùng Node.js 22 để khớp môi trường CI.

~~~bash
npm ci
cp .env.example .env.local
npm run dev
~~~

File **.env.local** cần có:

~~~env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
~~~

Cổng Admin riêng còn cần biến **ADMIN_PORTAL_ACCESS_KEY** ở phía máy chủ nếu sử dụng route này. Không đặt biến đó với tiền tố **NEXT_PUBLIC_**, không đưa giá trị thật vào Git và không chia sẻ URL mang access key.

Kiểm tra trước khi commit:

~~~bash
npm run lint
npm run typecheck
npm run build
~~~

## 9. Quy tắc thay đổi an toàn

1. Đọc component, kiểu dữ liệu và luồng gọi liên quan trước khi sửa.
2. Ưu tiên thay đổi nhỏ, giữ nguyên hành vi đang dùng của người viết, Admin và người đọc.
3. Không xóa hoặc đổi tên bảng, bucket, policy, Edge Function hay route chia sẻ chỉ để làm gọn code.
4. Migration đã áp dụng trên production không được sửa trực tiếp; tạo migration mới có timestamp cho thay đổi tiếp theo.
5. Không commit .env.local, Service Role Key, access key, thông tin đăng nhập hoặc ảnh riêng tư.
6. Chạy lint, typecheck và build sau thay đổi. Kiểm tra luồng người viết → duyệt → xuất bản → người đọc trên preview trước khi đưa lên production.
