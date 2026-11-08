import type { Metadata } from "next";
import GuestPortal from "@/features/garden/components/GuestPortal";

export const metadata: Metadata = {
  title: "Cổng người đọc · Little Flower World",
  description: "Mở liên kết riêng để đọc thông điệp, bức thư hoặc cuốn sách được gửi tặng.",
  robots: { index: false, follow: false },
};

export default function GuestPortalPage() {
  return <GuestPortal />;
}
