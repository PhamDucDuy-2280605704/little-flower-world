import type { Metadata } from "next";
import BookStudio from "@/features/studio/components/BookStudio";

export const metadata: Metadata = {
  title: "Không gian sáng tác · Little Flower World",
  description: "Viết một thông điệp, một bức thư hoặc một cuốn sách và gửi tặng người bạn yêu quý.",
};

export default function StudioPage() {
  return <BookStudio />;
}
