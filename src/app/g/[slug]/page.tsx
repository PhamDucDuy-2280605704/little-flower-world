import type { Metadata } from "next";
import SharedGardenExperience from "@/features/garden/components/SharedGardenExperience";

export const metadata: Metadata = {
  title: "Một tác phẩm dành riêng cho bạn · Little Story World",
  description: "Mở một cuốn sách riêng, lật từng trang và đọc câu chuyện được gửi tặng bạn.",
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
