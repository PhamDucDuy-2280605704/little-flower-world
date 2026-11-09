import type { Metadata } from "next";
import AdminDashboard from "@/features/admin/components/AdminDashboard";

export const metadata: Metadata = {
  title: "Trung tâm quản lý · Little Story World",
  description: "Private management workspace.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
