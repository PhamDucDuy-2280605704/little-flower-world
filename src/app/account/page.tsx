import type { Metadata } from "next";
import BookStudio from "@/features/studio/components/BookStudio";

export const metadata: Metadata = {
  title: "Bàn sáng tác riêng · Little Story World",
  description: "Nơi dành cho tài khoản người viết: tạo bản thảo riêng, thêm ảnh, gửi Admin kiểm duyệt và theo dõi phản hồi.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <BookStudio />;
}
