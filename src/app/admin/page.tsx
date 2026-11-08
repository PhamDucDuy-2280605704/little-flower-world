import type { Metadata } from "next";
import AdminDashboard from "@/features/admin/components/AdminDashboard";

export const metadata: Metadata = {
  title: "Trung tâm quản lý · Little Flower World",
  description: "Quản lý các khu vườn và kho ảnh riêng của từng khu vườn.",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
