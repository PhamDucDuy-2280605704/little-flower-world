<div align="center">
  <img src="./docs/assets/little-story-world-banner.svg" alt="Little Story World — viết nên điều đáng nhớ, lưu giữ như một món quà" width="100%" />

  <p><strong>Một không gian riêng để viết, trang trí và gửi trao những câu chuyện đáng nhớ.</strong></p>

  <p>
    <a href="https://little-story-world.vercel.app/">🌷 Website</a>
    ·
    <a href="https://github.com/PhamDucDuy-2280605704/little-story-world">Mã nguồn</a>
    ·
    <a href="./docs/HUONG_DAN_SU_DUNG.md">Hướng dẫn sử dụng</a>
    ·
    <a href="./docs/CODE_STRUCTURE.md">Cấu trúc dự án</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16.4.5-111111?logo=nextdotjs&logoColor=white" alt="Next.js 16.4.5" />
    <img src="https://img.shields.io/badge/React-19.3.0-149eca?logo=react&logoColor=white" alt="React 19.3.0" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
    <img src="https://img.shields.io/badge/Supabase-Auth_%2B_Postgres-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Hosting-Vercel-111111?logo=vercel&logoColor=white" alt="Vercel" />
  </p>
  <p>
    <a href="https://github.com/PhamDucDuy-2280605704/little-story-world/actions/workflows/verify.yml">
      <img src="https://github.com/PhamDucDuy-2280605704/little-story-world/actions/workflows/verify.yml/badge.svg?branch=main" alt="Quy trình kiểm tra trên nhánh main" />
    </a>
  </p>
</div>

---

## 🌿 Giới thiệu

**Little Story World** là một góc sáng tác riêng tư dành cho những thông điệp, bức thư và cuốn sách nhiều chương được viết bằng sự chân thành.

Người viết có thể lưu bản thảo, thêm ảnh kỷ niệm, chọn phong cách trình bày rồi gửi tác phẩm đến Admin kiểm duyệt. Sau khi được duyệt, tác phẩm có thể xuất bản bằng đường dẫn riêng để người nhận mở ra đọc.

> Viết một điều muốn nói. Trang trí theo cách của mình. Gửi đi như một món quà.

## ✨ Tính năng nổi bật

### ✍️ Không gian sáng tác

- Mỗi tài khoản người viết có thể tạo nhiều tác phẩm riêng.
- Ba định dạng: **Thông điệp**, **Bức thư** và **Cuốn sách nhiều chương**.
- Số chương không giới hạn.
- Lưu bản nháp, xem trước nội dung và chỉnh sửa trước khi gửi duyệt.
- Người viết có thể rút yêu cầu đang chờ duyệt; tác phẩm cần chỉnh sửa có thể được cập nhật và gửi lại.

### 🎨 Trang trí câu chuyện

- **3 chủ đề màu sắc:** Khu vườn dịu dàng, Hoàng hôn và Ánh sao.
- **3 kiểu giấy:** Ivory, Linen và Rose.
- **4 lựa chọn hiệu ứng:** lật trang, ánh sáng dịu, lấp lánh hoặc tắt hiệu ứng bổ sung.
- Người viết có thể tải tối đa **5 ảnh cho mỗi tác phẩm**, mỗi ảnh tối đa **5 MB**, và chọn tối đa **4 sticker**.
- Cài đặt trang trí được lưu cùng tác phẩm.

### 🛡️ Kiểm duyệt và xuất bản

- Tác phẩm của người viết phải được Admin duyệt trước khi xuất bản.
- Admin có bàn kiểm duyệt, xem trước toàn bộ câu chuyện và gửi phản hồi.
- Khi được duyệt, người viết có thể thiết lập PIN, bật lời nhắn người đọc và xuất bản khi sẵn sàng.
- Admin có quyền quản lý nội dung, hình ảnh, sticker và trạng thái xuất bản.
- Trạng thái duyệt được đồng bộ để người viết nhận biết khi Admin phản hồi.

### 📖 Trải nghiệm người đọc

- Mở tác phẩm đã xuất bản bằng đường dẫn chia sẻ.
- Có thể bật PIN để giới hạn người đọc.
- Hỗ trợ lời nhắn người đọc khi chủ tác phẩm bật sổ lưu bút.
- Trang đọc tập trung vào nội dung, chương truyện và ảnh kỷ niệm.

### 🌸 Không khí và ngôn ngữ

- Giao diện song ngữ **Tiếng Việt / English**, ghi nhớ lựa chọn trong trình duyệt.
- Nền có ánh sáng trang trí nhẹ nhàng.
- Nhạc nền được tạo bằng Web Audio API với 4 không khí: Nắng vui mỗi ngày, Piano dịu dàng, Hộp nhạc mơ màng và Đêm yên bình.
- Có thể bật/tắt nhạc, chọn bản nhạc và điều chỉnh âm lượng; lựa chọn được ghi nhớ trên trình duyệt.

## 🧭 Các trang chính

| Đường dẫn | Chức năng |
| --- | --- |
| **/** | Trang chủ và giới thiệu cách sử dụng |
| **/login** | Đăng nhập tài khoản người viết |
| **/account** | Không gian sáng tác và quản lý tác phẩm của người viết |
| **/studio** | Đường dẫn cũ, tự chuyển về **/account** |
| **/guest** | Cổng dành cho người nhận lời mời |
| **/g/[slug]** | Trang đọc một tác phẩm đã được xuất bản |
| **/gift** | Mở các tác phẩm gắn với tài khoản đang đăng nhập |
| **/admin** | Trung tâm quản lý dành riêng cho Admin |
| **/admin/review** | Hàng chờ kiểm duyệt và phản hồi tác phẩm |
| **/admin/studio** | Không gian sáng tác và chỉnh sửa của Admin |
| **/private-admin/[accessKey]** | Cổng đăng nhập Admin có khóa truy cập riêng |

**Lưu ý về Admin:** đường dẫn có access key là thông tin riêng, không đưa URL đầy đủ hoặc giá trị khóa vào README, ảnh chụp công khai hay mã nguồn. Biết địa chỉ không đồng nghĩa có quyền quản trị; các trang Admin vẫn xác thực tài khoản ở phía ứng dụng và cơ sở dữ liệu.

## 🔄 Quy trình một tác phẩm

~~~mermaid
flowchart LR
    A["Người viết tạo bản nháp"] --> B["Thêm chương, ảnh và trang trí"]
    B --> C["Gửi Admin kiểm duyệt"]
    C --> D{"Kết quả"}
    D -->|"Cần chỉnh sửa"| E["Nhận phản hồi và gửi lại"]
    E --> C
    D -->|"Được duyệt"| F["Thiết lập PIN và lời nhắn"]
    F --> G["Xuất bản tác phẩm"]
    G --> H["Gửi đường dẫn cho người đọc"]
~~~

## 🧰 Công nghệ

| Lớp | Công nghệ |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript |
| Giao diện | CSS Modules, Tailwind CSS |
| Chuyển động | Motion |
| Đăng nhập | Supabase Auth |
| Dữ liệu | Supabase Postgres và Row Level Security |
| Tệp riêng tư | Supabase Storage |
| API chia sẻ | Supabase Edge Functions |
| Font chữ | Noto Sans, Noto Serif, Geist Mono |
| Triển khai | Vercel |
| Kiểm tra tự động | GitHub Actions |

## 💻 Chạy dự án trên máy cá nhân

### 1. Yêu cầu

- Node.js **22** (cùng phiên bản CI đang sử dụng).
- npm.
- Một dự án Supabase có quyền cấu hình Auth, Postgres và Storage.

### 2. Cài đặt

~~~bash
git clone https://github.com/PhamDucDuy-2280605704/little-story-world.git
cd little-story-world
npm ci
~~~

### 3. Tạo biến môi trường

Sao chép file mẫu:

~~~bash
cp .env.example .env.local
~~~

Trên Windows PowerShell có thể dùng:

~~~powershell
Copy-Item .env.example .env.local
~~~

Điền thông tin Supabase vào **.env.local**:

~~~env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
~~~

Không đưa Service Role Key, mật khẩu cơ sở dữ liệu hoặc khóa truy cập Admin vào biến có tiền tố **NEXT_PUBLIC_**. Không commit file **.env.local** lên Git.

### 4. Khởi chạy

~~~bash
npm run dev
~~~

Mở http://localhost:3000.

## ✅ Kiểm tra chất lượng

Chạy lần lượt các lệnh sau trước khi gửi thay đổi:

~~~bash
npm run lint
npm run typecheck
npm run build
~~~

GitHub Actions trong **.github/workflows/verify.yml** chạy kiểm tra khi push lên **main**, khi tạo Pull Request và khi được khởi chạy thủ công. Quy trình gồm kiểm tra dependency, lint, TypeScript và build production.

## 🗂️ Tài liệu dự án

- [Hướng dẫn sử dụng](./docs/HUONG_DAN_SU_DUNG.md) — thao tác theo vai trò người viết, Admin và người đọc.
- [Sơ đồ cấu trúc code](./docs/CODE_STRUCTURE.md) — vị trí route, module, dữ liệu và nơi cần chỉnh sửa.
- [Hướng dẫn Supabase](./supabase/README.md) — tài khoản người viết, quy trình kiểm duyệt, giới hạn media và bảo mật dữ liệu.

## 🔐 Bảo mật và dữ liệu

- Không bật đăng ký công khai; tài khoản người viết do Admin cấp.
- Quyền sở hữu tác phẩm và quyền quản trị được kiểm tra bằng Supabase Auth, RLS, database triggers và Storage policies.
- Trình duyệt chỉ sử dụng Supabase Publishable Key.
- Ảnh riêng tư được lưu trong Storage riêng tư và được cấp signed URL khi cần đọc.
- Chỉ tác phẩm đã được duyệt và xuất bản mới có thể truy cập qua đường dẫn chia sẻ.
- Mỗi thay đổi database mới cần migration có timestamp riêng. Không sửa migration đã áp dụng trên production.

## 🚀 Triển khai

Nhánh **main** được kết nối với Vercel. Khi thay đổi được push lên nhánh này, GitHub Actions chạy các bước kiểm tra và Vercel tạo deployment production theo cấu hình của dự án.

Website: **https://little-story-world.vercel.app/**

---

<div align="center">
  <sub>Little Story World · Viết bằng sự chân thành, lưu giữ bằng những trang sách.</sub>
</div>
