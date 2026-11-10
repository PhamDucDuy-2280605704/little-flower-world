import type { Metadata } from "next";
import ForgotPasswordPageContent from "@/features/auth/components/ForgotPasswordPageContent";
export const metadata: Metadata = {
  title: "Quên mật khẩu · Little Story World",
  description: "Khôi phục quyền truy cập vào bàn sáng tác Little Story World.",
  robots: { index: false, follow: false },
};
export default function ForgotPasswordPage() {
  return <ForgotPasswordPageContent />;
}
