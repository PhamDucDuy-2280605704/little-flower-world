import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans, Noto_Serif, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/features/i18n/LanguageProvider";
import LanguageSwitch from "@/features/i18n/LanguageSwitch";
import SiteAmbience from "@/features/ambience/SiteAmbience";
import FirstVisitIntro from "@/components/first-visit-intro";
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
  metadataBase: new URL("https://little-story-world.vercel.app"),

  title: "Little Story World",
  description:
    "Một không gian sáng tác thông điệp, thư và những cuốn sách dành riêng cho người bạn quý mến.",

  applicationName: "Little Story World",

  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  manifest: "/site.webmanifest",

  openGraph: {
    title: "Little Story World",
    description:
      "Một không gian sáng tác thông điệp, thư và những cuốn sách dành riêng cho người bạn quý mến.",
    siteName: "Little Story World",
    images: [
      {
        url: "/little-story-world-icon-512.png",
        width: 512,
        height: 512,
        alt: "Little Story World – stories, books and memories",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <div className="site-content">{children}</div>
          <FirstVisitIntro />
          <SiteAmbience />
          <LanguageSwitch />
        </LanguageProvider>
      </body>
    </html>
  );
}
