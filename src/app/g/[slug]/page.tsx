import type { Metadata } from "next";
import SharedGardenExperience from "@/features/garden/components/SharedGardenExperience";

export const metadata: Metadata = {
  title: "Một khu vườn đang chờ bạn · Little Flower World",
  description: "Bước vào một khu vườn nhỏ, đánh thức hoa và khám phá câu chuyện được gửi riêng cho bạn.",
  robots: { index: false, follow: false },
};

export default async function SharedGardenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SharedGardenExperience slug={slug} />;
}
