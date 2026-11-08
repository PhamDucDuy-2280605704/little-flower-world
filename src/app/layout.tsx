import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Noto_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Thông tin hiển thị trên tab trình duyệt và khi chia sẻ link.
export const metadata: Metadata = {
  title: "Little Flower World",
  description: "Một khu vườn hoa nhỏ và những món quà dành riêng cho bạn.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // lang="vi" báo cho trình duyệt biết website viết bằng tiếng Việt
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
