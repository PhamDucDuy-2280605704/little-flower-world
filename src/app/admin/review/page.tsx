import type { Metadata } from "next";
import AdminReviewDashboard from "@/features/admin/components/AdminReviewDashboard";

export const metadata: Metadata = {
  title: "Bàn kiểm duyệt · Little Story World",
  description: "Xem trước, duyệt và phản hồi các tác phẩm được gửi đến Admin.",
  robots: { index: false, follow: false },
};

export default function AdminReviewPage() {
  return <AdminReviewDashboard />;
}
