import type { Metadata } from "next";
import BookStudio from "@/features/studio/components/BookStudio";

export const metadata: Metadata = {
  title: "Studio quản trị · Little Story World",
  description: "Không gian chỉnh sửa đầy đủ dành riêng cho Admin.",
  robots: { index: false, follow: false },
};

export default function AdminStudioPage() {
  return <BookStudio />;
}
