import type { Metadata } from "next";
import ResetPasswordPageContent from "@/features/auth/components/ResetPasswordPageContent";
export const metadata: Metadata = {
  title: "Đặt lại mật khẩu · Little Story World",
  description: "Tạo mật khẩu mới cho tài khoản Little Story World.",
  robots: { index: false, follow: false },
};
export default function ResetPasswordPage() {
  return <ResetPasswordPageContent />;
}
