import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Bàn sáng tác riêng · Little Story World",
  description: "Không gian sáng tác dành cho tài khoản người viết.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: false },
};

export default function StudioPage() {
  permanentRedirect("/account");
}