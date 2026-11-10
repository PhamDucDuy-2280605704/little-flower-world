import type { Metadata } from "next";
import SignupPageContent from "@/features/auth/components/SignupPageContent";

export const metadata: Metadata = {
  title: "Tạo tài khoản · Little Story World",
  description: "Tạo tài khoản thành viên miễn phí để bắt đầu viết câu chuyện của riêng bạn.",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SignupPageContent />;
}
