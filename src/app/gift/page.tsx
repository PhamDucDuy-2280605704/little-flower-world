import type { Metadata } from "next";
import GiftExperience from "@/features/gifts/components/GiftExperience";

// Tiêu đề riêng cho tab trình duyệt của trang quà tặng.
export const metadata: Metadata = {
  title: "Tác phẩm dành cho bạn · Little Flower World",
};

// Trang quà tặng – địa chỉ: /gift
// Toàn bộ hành trình mở quà nằm trong component GiftExperience.
export default function GiftPage() {
  return <GiftExperience />;
}
