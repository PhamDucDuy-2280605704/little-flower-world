import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not found · Little Story World",
  robots: { index: false, follow: false },
};

export default function RetiredAdminLoginRoute() {
  redirect("/");
}
