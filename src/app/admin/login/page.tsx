import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin portal · Little Story World",
  robots: { index: false, follow: false },
};

export default function LegacyAdminLoginPage() {
  redirect("/little-story-backstage-7f4c");
}
