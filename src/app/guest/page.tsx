import type { Metadata } from "next";
import GuestPortal from "@/features/garden/components/GuestPortal";

export const metadata: Metadata = {
  title: "Cổng khách · Little Flower World",
  description: "Mở lời mời riêng để khám phá một khu vườn được chia sẻ.",
  robots: { index: false, follow: false },
};

export default function GuestPortalPage() {
  return <GuestPortal />;
}
