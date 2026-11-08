import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans, Noto_Serif, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/features/i18n/LanguageProvider";
import LanguageSwitch from "@/features/i18n/LanguageSwitch";
import "./globals.css";

const bodyFont = Noto_Sans({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const displayFont = Noto_Serif({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const monoFont = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Little Story World",
  description: "Một không gian sáng tác thông điệp, thư và những cuốn sách dành riêng cho người bạn quý mến.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          {children}
          <LanguageSwitch />
        </LanguageProvider>
      </body>
    </html>
  );
}
