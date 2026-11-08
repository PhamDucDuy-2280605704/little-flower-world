import type { Metadata } from "next";
import GardenStudio from "@/features/studio/components/GardenStudio";

export const metadata: Metadata = {
  title: "Creator Studio · Little Flower World",
  description: "Thiết kế khu vườn kể chuyện và xuất bản món quà của riêng bạn.",
};

export default function StudioPage() {
  return <GardenStudio />;
}
