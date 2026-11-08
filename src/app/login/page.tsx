import type { Metadata } from "next";
import LoginPageContent from "@/features/auth/components/LoginPageContent";

export const metadata: Metadata = {
  title: "Đăng nhập · Little Story World",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginPageContent />;
}
