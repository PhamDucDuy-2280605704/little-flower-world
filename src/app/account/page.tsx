import type { Metadata } from "next";
import BookStudio from "@/features/studio/components/BookStudio";

export const metadata: Metadata = {
  title: "Không gian tài khoản · Little Story World",
  description: "Quản lý bản thảo riêng, gửi duyệt và xem phản hồi của Admin.",
};

export default function AccountPage() {
  return <BookStudio />;
}
